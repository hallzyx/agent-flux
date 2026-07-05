# Orden de Desarrollo — AGENT FLUX MVP

> Secuencia de implementación con gates de validación. Complementa `PRODUCTO.md` v1.2 (el QUÉ); esto es el EN QUÉ ORDEN.
> Regla madre: **ningún milestone empieza hasta que el gate del anterior pasa.** Si un gate falla, se arregla o se degrada al fallback — nunca se construye encima de algo roto.

**Estado (4 jul 2026):** M0–M11 ✅ mergeados en `main`. Post-MVP iteración 2 ✅ (redirect + tools LLM) — ver tabla al final.

## Los 3 principios del orden

1. **Se construye en el orden del user flow.** Cada milestone extiende el recorrido del usuario UN paso más (upload → pseudonimizar → boundary review → agente → escalación → validate → export). Beneficio: en todo momento existe un demo parcial grabable — si el tiempo muere en el milestone N, los milestones 1..N-1 son un demo coherente.
2. **Puertos estables en las fronteras.** Las piezas riesgosas se esconden detrás de interfaces definidas ANTES de implementarlas, para poder swapearlas sin romper lo de arriba:
   - `PseudonymizerPort` — `pseudonymize(text) → {masked_text, mapping}` / `reidentify(text, mapping) → text`. Primero lo implementa el **regex/NER local** (determinista, testeable); Gemma entra DESPUÉS como drop-in detrás del mismo puerto. La app nunca sabe cuál corre.
   - `TraceEvent` schema — todo lo que el backend emite (plan, retrieval, tool_call, escalation, critic, verdict) es un evento tipado desde el día 1. La UI del trace se escribe una vez y no se toca cuando el pipeline crece.
   - `EscalationPayload` — las 4 partes (blocked_decision, evidence, options[], default) como contrato JSON fijo.
3. **El brief de demo es el golden fixture.** Un solo PDF de prueba, diseñado con: entidades conocidas (para validar pseudonimización), UNA ambigüedad plantada (para disparar la escalación de forma determinista) y un error sembrado opcional (para que el Critic tenga qué atrapar). Cada milestone re-corre el E2E acumulado contra este fixture — esa es la regresión.

## La secuencia (M0–M11)

| # | Milestone | Depende de | Gate de validación (contrato de aceptación) | Estado |
|---|---|---|---|---|
| M0 | **Esqueleto**: Next.js + FastAPI + healthcheck + hello-world contra Vultr. Confirmar ≥2 modelos disponibles (Executor/Critic) | — | Un prompt viaja browser→FastAPI→Vultr→browser y se renderiza. Los 2 modelos responden. Credenciales en `.env` | ✅ |
| M1 | **Ingesta**: upload PDF + extracción de texto | M0 | El golden fixture sube y su texto extraído se muestra completo y legible | ✅ |
| M2 | **Pseudonymizer v1 (regex/NER local)** + tabla de mapeo + re-identification | M1 | Round-trip sin pérdida: `reidentify(pseudonymize(x)) == x`. Las entidades del fixture salen todas enmascaradas con placeholders tipados+magnitud. **Test unitario, no inspección visual** | ✅ |
| M3 | **Boundary review UI**: original vs. enmascarado lado a lado, entidades resaltadas, botón aprobar | M2 | NADA sale por red antes del click (verificable en la pestaña Network). Aprobar dispara el envío del texto enmascarado únicamente | ✅ |
| M4 | **Pipeline v0 + trace vivo**: Plan (Planner) → 1 tool (`extract_requirements`) → borrador de PRD, eventos `TraceEvent` por SSE | M3 | El trace se renderiza en vivo paso a paso. El PRD llega con placeholders INTACTOS (el cloud nunca vio datos reales — grep de entidades reales sobre la respuesta = 0 matches) | ✅ |
| M5 | **Tools + retrievals múltiples**: `score_risks`, `estimate_effort`, `export_structured`; el agente vuelve al brief N veces | M4 | Cada tool testeable por separado. El trace muestra ≥2 retrievals con queries distintas. El PRD tiene épicas+historias+criterios+riesgos+tallas | ✅ *(MVP determinístico; ver I2 para LLM)* |
| M6 | **Escalación 4 partes**: pausa del ciclo, payload completo, "accept default" en un click, resume | M5 | La ambigüedad plantada del fixture dispara la escalación el 100% de las veces. El default se acepta en un click y el run continúa desde donde pausó | ✅ |
| M7 | **Precedente en sesión**: registro + chip UI + re-aplicación | M6 | Correr el fixture dos veces en la misma sesión: la segunda vez NO escala — el trace dice "precedent applied" | ✅ |
| M8 | **Critic**: segunda llamada (modelo/config distinta) que revisa el borrador contra el contrato, visible en trace | M5 (paralelo a M6-M7 si hace falta) | El error sembrado del fixture es atrapado por el Critic y aparece en el trace. Fallback listo: self-check adversarial con el mismo modelo | ✅ |
| M9 | **Cierre del ciclo**: contrato visible al inicio, verdictos Accept/Redirect, re-identification del PRD final, export JSON+Markdown | M7+M8 | E2E completo frente al fixture: un Flux Cycle entero sin intervención manual fuera de los clicks del flujo. El PRD final tiene los datos REALES | ✅ |
| M10 | **Gemma on-device**: MediaPipe + Gemma 3 detrás de `PseudonymizerPort` | M9 (¡no antes!) | Los MISMOS tests de M2 pasan con Gemma como implementación. Si WebGPU falla → el puerto cae a regex solo, sin tocar nada más | ✅ |
| M11 | **Blindaje + submission**: errores, respuestas cacheadas de Vultr, README con link a `framework-docs/`, deploy, video | M9 (M10 si llegó) | Checkout limpio + README = app corriendo. Video grabado. El E2E pasa una última vez | ✅ |

## Post-MVP — Iteración 2 (supervisión + tools LLM)

| # | Entregable | Depende de | Gate de validación | Estado |
|---|---|---|---|---|
| I2a | **Redirect con replan**: `supervisor_note` en API, sesión `revision` + `redirect_notes`, replan con pasos de corrección, epic `EPIC-SUP-0N` | M9 | Redirect desde UI → segundo PRD distinto (`revision 2` en título). Trace conserva corrida anterior | ✅ |
| I2b | **Nota editable en UI**: textarea en `ValidationPanel` antes de Redirect | I2a | La nota del usuario llega al backend y aparece en plan + requirements `REQ-SUPERVISOR` | ✅ |
| I2c | **`score_risks_llm` + `estimate_effort_llm`**: `backend/app/tools/llm_tools.py`, prompting reforzado (role, schema, hard rules, few-shot, contrato) | M5 | Trace muestra `engine: vultr`, `prompt_version`, `reinforcement`. 18 tests backend passing | ✅ |
| I2d | **`extract_requirements_llm`**: enriquecimiento opcional post-baseline regex | M4 | Trace event `extract_requirements_llm` cuando el LLM añade reqs | ✅ |

## Post-MVP — Iteración 3 (supervisión completa)

| # | Entregable | Depende de | Gate de validación | Estado |
|---|---|---|---|---|
| I3a | **Plan approval checkpoint**: pausa post-Plan, `POST /api/cycle/approve-plan` | I2 | Sin approve → cero `tool_call` en Network; tras approve → execute | ✅ |
| I3b | **Completion report**: diff cláusula × cláusula vs contrato en Critic | M8 | Golden fixture muestra ≥1 cláusula `unmet` (deadline Q1 2027); sin auto-fix | ✅ |
| I3c | **Verdict Reject**: vuelve a upload, no replan | M9 | Reject no relanza ciclo | ✅ |
| I3d | **Precedente en Plan**: inyectado en prompt + trace | M7 | 2ª corrida: status + `precedents_in_plan` en evento plan | ✅ |

### Archivos clave (iteración 3)

```
backend/app/cycle/completion_report.py   — Slippage Protocol completion report
backend/app/cycle/orchestrator.py        — plan pause/resume, _execute_from_plan
backend/app/main.py                      — /api/cycle/approve-plan
frontend/components/PlanApprovalCard.tsx
frontend/components/CompletionReportPanel.tsx
frontend/components/ValidationPanel.tsx  — Reject + completion table
```

```
backend/app/tools/llm_tools.py       — prompts reforzados + score/estimate LLM
backend/app/cycle/orchestrator.py    — pipeline redirect + tools LLM
backend/app/session/store.py         — revision, redirect_notes
frontend/components/ValidationPanel.tsx — nota de redirect
frontend/app/page.tsx                — startCycle({ supervisorNote })
```

### Modelos Vultr (configuración actual del equipo)

| Rol | Env var | Modelo típico |
|---|---|---|
| Executor (Plan + tools LLM) | `VULTR_EXECUTOR_MODEL` | `nvidia/Nemotron-Cascade-2-30B-A3B` |
| Critic | `VULTR_CRITIC_MODEL` | `nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16` |

## Decisiones de orden que importan (el porqué)

- **Gemma va AL FINAL (M10), no en la mitad.** Es la pieza de mayor riesgo técnico y la app NUNCA depende de ella — depende del puerto. Con regex de M2 el E2E completo funciona desde M9; Gemma solo mejora la implementación del puerto. Si Gemma consume su presupuesto, se recorta sin tocar una línea de lo demás. (En el plan original de PRODUCTO.md iba en las horas 18–26 por presupuesto de tiempo; este orden la mueve después del E2E — el presupuesto de horas se mantiene, cambia la prioridad de integración.)
- **El trace schema (M4) se define antes de que el pipeline crezca.** Todo lo posterior (tools, escalación, critic, verdictos) solo EMITE eventos nuevos del mismo tipo — la UI no se reescribe jamás.
- **La escalación (M6) antes que el precedente (M7) y el critic (M8):** es la dependencia dura — el precedente ES una escalación respondida, y el critic se inserta en un pipeline que ya sabe pausar.
- **Tools LLM (I2c) después del E2E:** el MVP determinístico garantizó gates de demo; la iteración 2 sustituye el path principal de riesgo/estimación por Vultr sin tocar pseudonimización ni boundary.
- **Round-trip de pseudonimización como test unitario (M2), no visual:** es la garantía de privacidad de TODO el producto; si esto está mal, el pitch entero es falso. Se prueba con código, no con ojos.
- **Demo parcial siempre grabable:** M3 solo ya es el momento privacidad del video; M6 ya es el momento metodología. I2a añade el momento redirect para el pitch Cursor.

## Anti-reglas (prohibido durante el build)

- Prohibido empezar M(n+1) con el gate de M(n) rojo "para ganar tiempo".
- Prohibido tocar el `TraceEvent` schema después de M4 (agregar tipos nuevos sí; cambiar los existentes no).
- Prohibido integrar Gemma por fuera del `PseudonymizerPort` "porque es más rápido".
- Prohibido features fuera de PRODUCTO.md §11 antes de la hora 45.
