# AGENT FLUX — Definición de Producto v1.2

> Documento definitivo pre-código → **actualizado post-MVP + iteración 2** (4 jul 2026). RAISE Summit Hackathon 2026 (7–9 julio, remoto, equipo de 1).
> Reemplaza el alcance de `idea.md`. Los pivots respecto a la propuesta inicial están marcados con ⚠️ PIVOT.
> **v1.2** — M0–M11 implementados en `main`. Iteración 2: redirect con replan, tools de riesgo/estimación vía Vultr (prompting reforzado), enriquecimiento LLM de requirements.

---

## 1. One-liner

**AGENT FLUX** — De brief de cliente a PRD listo para ejecutar, mediante un pipeline de agentes supervisado por humanos. Los datos sensibles nunca salen del dispositivo.

*Versión inglés (README/pitch):* "From messy client brief to execution-ready PRD in minutes — a human-supervised agent pipeline where sensitive data never leaves your device."

*Posicionamiento:* el producto es la **implementación de referencia** del framework Agent Flux (`framework-docs/`, público en el mismo repo). El demo muestra **un Flux Cycle completo de punta a punta** — Frame → Plan → Execute → Checkpoint → Validate → Integrate. Ningún otro equipo llega con un framework documentado de 9 piezas respaldando su demo; esa es el arma.

---

## 2. Pivots respecto a la propuesta inicial

### ⚠️ PIVOT 1 — Se ELIMINA el flujo de RRHH (no negociable)
La lista de descalificación automática del hackathon incluye **"Job application screeners"**. El flujo de RRHH (subir CVs → rankear candidatos → shortlist) ES exactamente eso. Presentarlo descalifica el proyecto entero, no solo el flujo. Fuera.

### ⚠️ PIVOT 2 — El flujo de Developer pasa a stretch goal (probablemente no se construye)
"Subo un doc → pregunto → me responde con referencias" es la definición de **"Basic RAG application"**, otra causa de descalificación automática. Aunque se le agreguen tools, el patrón visual del demo huele a RAG. Riesgo innecesario. Si sobra tiempo (no va a sobrar), se re-diseña; si no, se menciona como roadmap.

### ⚠️ PIVOT 3 — Un solo flujo core: PM, pero profundo
Con 48h y una sola persona, 3 flujos = 3 features rotas. Un flujo impecable con trace de agente visible gana a tres mediocres (Demo = 50% del score). Todo el tiempo va al flujo PM.

### ⚠️ PIVOT 4 — La tesis "SCRUM agéntico" deja de ser marketing y se convierte en feature demostrable
La metodología no se pitchea como concepto abstracto: se materializa como **checkpoints de supervisión humana** dentro del run del agente. El PM no ejecuta — aprueba, corrige y re-dirige al agente en puntos de decisión. Eso ES el "ciclo agéntico" (ejecuta → valida → itera) hecho producto. Es también la "solución interactiva" que pide el track de Cursor, sin depender de voz.

### ⚠️ PIVOT 5 — Voz pasa a stretch goal
Web Speech API es rápida de integrar pero frágil en demo (micrófono, acentos, permisos del browser). La interactividad core la dan los checkpoints. La voz se agrega en las últimas horas solo si el core está blindado.

### ⚠️ PIVOT 6 — Priorización explícita de tracks
1. **Vultr (primario)** — el producto está diseñado a medida de su problem statement.
2. **Cursor (secundario)** — problema real de workflow + solución interactiva. Encaja natural.
3. **DeepMind Remote (terciario/oportunista)** — Gemma on-device es load-bearing (capa de privacidad), pero el producto no es 100% offline porque el razonamiento vive en Vultr. Se presenta con honestidad: "la inferencia local ES la garantía de privacidad". Si los jueces de DeepMind prefieren apps totalmente locales, se pierde ese track sin afectar los otros dos.

---

## 3. Usuario y problema

**Usuario:** Product Manager de una consultora IT.

**Problema:** El PM recibe briefs de clientes (PDFs desordenados, mails, minutas) con información confidencial (nombres, presupuestos, NDAs) y debe convertirlos en specs ejecutables: épicas, historias, criterios de aceptación, riesgos, estimaciones. Hoy eso toma horas y **no puede usar ChatGPT/Claude porque las políticas corporativas prohíben subir documentos de clientes a servicios cloud de terceros**.

**Insight:** el bloqueo no es la capacidad de la IA — es la privacidad. Si separás "lo sensible" (queda en el dispositivo) de "la estructura del problema" (viaja anonimizada), desbloqueás el caso de uso completo.

---

## 4. Arquitectura

```
┌─────────────────────── DISPOSITIVO (browser) ───────────────────────┐
│                                                                      │
│  1. Upload brief (PDF/texto)                                         │
│  2. Gemma 3 (on-device, WebGPU vía MediaPipe LLM Inference)          │
│     → detecta entidades sensibles (nombres, empresas, montos,        │
│       emails, datos de contrato)                                     │
│     → PSEUDONIMIZA con placeholders tipados:                         │
│       "Acme Corp" → [CLIENT_1], "$120,000" → [BUDGET_1]              │
│     → guarda tabla de mapeo LOCAL (nunca se transmite)               │
│  3. BOUNDARY REVIEW ("Review what leaves your device"):              │
│     el usuario VE el texto anonimizado lado a lado con el original   │
│     y aprueba antes de que un solo byte salga del browser            │
│                                                                      │
└──────────────┬───────────────────────────────▲───────────────────────┘
               │ solo texto pseudonimizado     │ PRD con placeholders
               ▼                               │
┌─────────────────────── BACKEND (FastAPI) ────┴───────────────────────┐
│                                                                       │
│  Flux Cycle sobre Vultr Serverless Inference                          │
│  PLAN (Planner, LLM) → EXECUTE (retrievals + tools LLM/híbridos)      │
│    → CHECKPOINT (escalación 4 partes) → CRITIC review → VALIDATE       │
│  Redirect humano → replan con nota del supervisor (iteración 2)       │
│  Trace completo streameado al frontend en tiempo real                 │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘

  4. De vuelta en el dispositivo: RE-IDENTIFICATION — los placeholders
     del PRD se reemplazan por los datos reales usando la tabla local.
     El cloud nunca conoció los nombres; el usuario recibe el PRD completo.
```

**Por qué esto no es decorativo:** Gemma on-device es load-bearing — sin ella no hay pseudonimización local, y sin pseudonimización el caso de uso es ilegal para el usuario. La re-identification local cierra el loop: el output final tiene los datos reales sin que el cloud los haya visto jamás. (Es el privacy boundary del framework, implementado literal.)

**Viabilidad verificada (jul 2026):**
- WebGPU habilitado por defecto en Chrome, Firefox, Edge y Safari desde nov 2025 (~83% cobertura global).
- MediaPipe LLM Inference API soporta Gemma en browser; Gemma 3 270M/1B son adecuadas para NER + pseudonimización (tarea de extracción, no de razonamiento).
- transformers.js v4 (feb 2026) como alternativa, backend WebGPU.

---

## 5. El agente (Vultr) — un Flux Cycle completo, por qué NO es "basic RAG"

El run implementa el ciclo canónico del framework — **Frame → Plan → Execute → Checkpoint → Validate → Integrate** — con los 3 roles de agente (Planner, Executor, Critic). Todo visible en el trace:

1. **Frame (implícito + contrato):** el template del PRD ES el **contrato de aceptación** — la lista chequeable de cláusulas que el output debe cumplir (épicas con criterios de aceptación, riesgos scoreados, estimaciones con talla). Se muestra en pantalla al iniciar: el usuario sabe contra QUÉ se validará.
2. **Plan (Planner):** el agente produce un plan explícito (qué secciones del brief analizar, en qué orden, qué tools va a necesitar) antes de ejecutar.
3. **Execute (Executor) — retrievals múltiples dirigidos:** no un solo embedding-search; el agente vuelve al brief N veces con queries distintas según lo que cada épica necesita.
4. **Tool calls (executor — estado actual post-iteración 2):**

   | Tool | Motor | Qué hace |
   |---|---|---|
   | `extract_requirements` | Determinístico (regex) | Segmenta el brief en requerimientos atómicos con referencia a sección origen — baseline auditable |
   | `extract_requirements_llm` | Vultr (Executor) | Enriquece con hasta 3 requirements que el regex no captó; incluye contexto de redirect si aplica |
   | `score_risks_llm` | Vultr (Executor) | Evalúa ambigüedad, dependencia externa y complejidad con **prompting reforzado** (schema JSON, hard rules, few-shot, contrato de aceptación) |
   | `estimate_effort_llm` | Vultr (Executor) | Asigna talla S/M/L/XL e historias con criterios; recibe riesgos + nota de supervisor en revisiones |
   | `retrieve_from_brief` | Determinístico | Keyword overlap — retrieval dirigido, sin embeddings |
   | `build_epics` | Determinístico | Agrupa requirements en épicas por sección |
   | `export_structured` | Determinístico | Serializa PRD a JSON Jira/Linear + Markdown |
   | `apply_supervisor_redirect` | Determinístico | Inyecta epic/story `EPIC-SUP-0N` cuando el humano elige Redirect |

   **Fallback:** sin `VULTR_API_KEY` o si el LLM falla, `score_risks` / `estimate_effort` determinísticos cubren el pipeline (tests locales). Con Vultr configurado, el trace muestra `engine: vultr` y `prompt_version: flux-tools-v2-reinforced`.

   **Gemma NO genera el PRD** — solo enriquece pseudonimización on-device (NER) detrás de `PseudonymizerPort`.

5. **Checkpoint — escalación de 4 partes:** ante ambigüedad crítica (detectada en brief + riesgos LLM), el agente PAUSA y escala con el formato canónico del framework: **decisión bloqueada + evidencia (fragmento exacto del brief) + opciones con implicancias + default propuesto**. El PM puede aceptar el default con UN click o elegir otra opción.
6. **Precedente:** la escalación respondida queda registrada en sesión y se muestra como chip en la UI — *"Recorded as precedent — this question won't be asked again."* Si el brief dispara la misma ambigüedad otra vez, el agente aplica el precedente y lo dice en el trace.
7. **Critic review:** antes de que el humano vea el PRD, un **Critic** (segunda llamada a Vultr con modelo distinto al Executor) lo revisa contra el contrato: citas que no resuelven, contradicciones, cláusulas sin cubrir. Paso visible en el trace — critic diversity del framework, implementada.
8. **Validate — Accept o Redirect (iteración 2):** el PM valida el PRD contra el contrato. **Accept** cierra el ciclo. **Redirect** envía una nota editable al backend (`supervisor_note`), incrementa `revision`, replanifica con pasos de corrección, re-ejecuta tools LLM y produce un PRD distinto (`Client Brief PRD — revision 2`, epic `EPIC-SUP-02`). El trace conserva la corrida anterior.
9. **Integrate — outcome accionable:** PRD estructurado re-identificado localmente, exportable (JSON Jira/Linear + Markdown), no un chat.

**El trace es UI de primera clase:** cada paso (plan, retrieval, tool call, escalación, critic, verdicto) se renderiza en vivo en un panel lateral. Es simultáneamente: prueba de "agente real" para Vultr, la experiencia interactiva para Cursor, y el momento más fotogénico del demo.

---

## 6. Flujo demo (el video de 1 minuto)

1. (0–10s) PM arrastra el brief del cliente. "Este documento tiene NDAs y presupuestos — no puede ir a ChatGPT."
2. (10–25s) Gemma pseudonimiza on-device. **Boundary review** ("Review what leaves your device"): original vs. anonimizado, entidades resaltadas. Click en aprobar. **Momento clave del pitch de privacidad.**
3. (25–45s) El Flux Cycle corre: plan visible, retrievals, tool calls en el trace. Pausa en una **escalación de 4 partes**: "Requirement X is ambiguous — one-time or subscription? Evidence attached. Default: subscription." El PM acepta el default con UN click; aparece el chip *"Recorded as precedent."* El Critic revisa el borrador contra el contrato. **Momento clave de la metodología — esto ES Agent Flux.**
4. (45–60s) El PM valida: **Accept** → re-identification + export. Opcional **Redirect** con nota → segundo ciclo visible (`revision 2`, epic supervisor). Cierre: *"One full Flux Cycle — with human redirect when the draft isn't good enough. Not a single sensitive byte left the device."*

---

## 7. Alcance 48h (plan de ejecución solo)

**Estado (4 jul 2026):** M0–M11 ✅ en `main` (PR #1). Iteración 2 ✅ en rama `feat/iteration-2-supervision` — redirect + tools LLM.

El orden de integración con gates de validación por milestone vive en `local/DESARROLLO.md` (M0–M11 + post-MVP). La decisión estructural se mantuvo: **Gemma se integró al final (M10)** detrás de `PseudonymizerPort`; modelo bundled en `frontend/public/models/` (~249MB, gitignored).

| Bloque | Horas | Milestones | Entregable |
|---|---|---|---|
| Setup + esqueleto | 0–4 | M0–M1 | Next.js + FastAPI + hello-world contra Vultr (validar credenciales YA — y confirmar ≥2 modelos para Executor/Critic) + upload PDF con extracción de texto |
| Privacidad v1 | 4–8 | M2–M3 | Pseudonimizador regex/NER local detrás de `PseudonymizerPort` + tabla de mapeo + re-identification (**test unitario de round-trip**) + boundary review UI (nada cruza la red antes del click) |
| Pipeline Flux Cycle | 8–22 | M4–M8 | `TraceEvent` schema + trace vivo por SSE → Plan → 4 tools con retrievals múltiples → escalación 4 partes con default → precedente en sesión → Critic (2ª llamada, modelo/config distinta) |
| Cierre del ciclo + UI | 22–30 | M9 | Contrato visible al inicio, botones Accept/Redirect, re-identification del PRD final, export JSON+Markdown, render del PRD, chip de precedente |
| Gemma on-device | 30–36 | M10 | MediaPipe + Gemma 3 (270M o 1B) como drop-in detrás del `PseudonymizerPort`. **Los tests de M2 deben pasar idénticos.** Si WebGPU falla → el puerto cae a regex solo |
| Blindaje demo | 36–40 | M11 | Manejo de errores, golden fixture pre-cargado, respuestas cacheadas por si Vultr se cae en vivo |
| Submission | 40–46 | M11 | README (qué es, cómo correrlo, .env.example, known issues, link a `framework-docs/`), deploy, **grabar el video temprano** |
| Buffer | 46–48 | — | Solo pulido. Cero features nuevas. |

**Regla de corte:** cualquier bloque que se pase 50% de su presupuesto se degrada a su fallback y se sigue. **Regla de gates:** ningún milestone empieza con el gate del anterior en rojo (`local/DESARROLLO.md`).

### Plan de recorte a 24h (si el tiempo se achica)
Gracias al orden de integración, el recorte es natural: **los milestones se cortan desde el final.** Orden de sacrificio: (1) Gemma on-device → simplemente no se integra M10 y queda el pseudonimizador regex del `PseudonymizerPort` (se pierde el track DeepMind, se conserva la narrativa de privacidad — CERO refactor), (2) Critic con modelo distinto → self-check del mismo modelo con prompt adversarial (se pierde critic diversity, se conserva el paso visible en el trace), (3) checkpoint de re-planificación → checkpoint aprobar-solamente, (4) export Jira → solo Markdown. **Nunca se sacrifica:** el trace visible, el boundary review, ni la escalación con default — son el framework en pantalla.

---

## 8. Riesgos y mitigaciones

| Riesgo | Prob. | Mitigación |
|---|---|---|
| Gemma 270M/1B pseudonimiza mal (deja pasar entidades) | Media | Pipeline híbrido: pasada regex/NER determinista + Gemma como revisor. La pantalla de review pone al humano como última línea — convierte el defecto en feature |
| Vultr Serverless Inference lento/caído durante grabación | Media | Respuestas cacheadas del run de demo; grabar el video apenas el flujo funcione una vez |
| Descarga del modelo (0.5–1GB) arruina la primera impresión | Alta | Precarga con barra de progreso al abrir la app; modelo cacheado en OPFS; demo grabado con cache caliente |
| Jueces de Vultr lo leen como RAG | Baja (post-pivot) | El trace con plan + 4 tools + decisión escalada al humano es la evidencia; el README lo explicita con un diagrama del loop |
| Scope creep (voz, flujo Dev) | Alta (conociéndonos) | Este documento ES el contrato de alcance. Stretch goals recién a partir de la hora 45 |

---

## 9. Validación "poniéndome en el lugar del agente"

Si yo fuera el agente que recibe el brief pseudonimizado, ¿puedo hacer bien mi trabajo?

- ✅ **Sí, si la pseudonimización es tipada y consistente.** `[CLIENT_1]`, `[BUDGET_1]`, `[DEADLINE_1]` preservan la estructura semántica: sé que hay un cliente, un presupuesto y una fecha, y puedo razonar sobre sus relaciones sin conocer los valores. Redactar con `███` en cambio me dejaría ciego — por eso el contrato es **pseudonimizar, no censurar**.
- ✅ **Sí, si puedo volver al documento.** Retrievals múltiples con queries dirigidas me permiten profundizar por épica en vez de depender de un contexto único truncado.
- ✅ **Sí, si tengo permiso de no saber.** El checkpoint de escalada me quita la presión de alucinar ante ambigüedad: pregunto y sigo. Esto es lo que más eleva la calidad del output.
- ⚠️ **Punto débil honesto:** si el brief depende fuerte de montos exactos para priorizar (ej. "épica A solo si el presupuesto supera X"), el placeholder me limita. Mitigación: los placeholders numéricos conservan orden de magnitud y moneda (`[BUDGET_1: ~low-6-figures USD]`) — anonimato sin perder capacidad de decisión. Esta convención queda en el contrato de pseudonimización.

**Veredicto como agente:** el diseño me sienta bien. El contrato de placeholders tipados con magnitud es la pieza que hace que todo el sistema funcione — es lo primero que hay que testear con documentos reales.

---

## 10. Respuestas a las preguntas abiertas de `idea.md`

1. **¿Gemma on-device viable en 48h?** Sí, verificado (WebGPU default en los 4 browsers desde nov 2025; MediaPipe LLM Inference soporta Gemma en web). Riesgo real: calidad de la pseudonimización con modelos chicos → pipeline híbrido + review humano.
2. **¿Qué flujo maximiza score?** PM, único core. RRHH descalifica; Dev huele a RAG.
3. **¿Cómo evitar "basic RAG"?** Plan explícito (LLM) + retrievals múltiples dirigidos + tools (LLM con prompting reforzado + baseline determinístico) + escalada de decisiones al humano + redirect con replan + trace visible. Sección 5.
4. **¿La tesis SCRUM-agéntico es feature o visión?** Ambas — y evolucionó: la metodología ES un framework público de 9 documentos (`framework-docs/` en el repo) y el producto es su implementación de referencia. Se materializa como checkpoints/escalaciones/precedentes (features demostrables) y se narra en el pitch como "one full Flux Cycle".
5. **¿Riesgo de descalificación?** Sí, dos: RRHH = job screener (eliminado) y Dev = basic RAG (degradado a stretch). Post-pivot, sin banderas rojas conocidas.
6. **¿Nombre y one-liner?** AGENT FLUX se mantiene. One-liner en sección 1.
7. **¿Prioridad si quedan 24h?** Plan de recorte en sección 7. Lo intocable: trace del agente + review-before-send.

---

## 11. Stretch goals (solo desde hora 45, en orden)

1. ~~**Redirect con replan**~~ ✅ iteración 2 — nota del supervisor → replan + PRD revision N
2. ~~**Tools LLM con prompting reforzado**~~ ✅ `score_risks_llm`, `estimate_effort_llm` (`backend/app/tools/llm_tools.py`)
3. **Completion report** del Critic: diff cláusula por cláusula del PRD contra el contrato, renderizado (la pieza que falta del Slippage Protocol)
4. Interacción por voz sobre el PRD generado (Web Speech API)
5. Modo "brief por pegado de texto" además de PDF *(parcial — Load demo brief existe)*
6. Flujo Developer re-diseñado como agente (no Q&A)

## 12. Fuera de alcance (explícito)

- Flujo RRHH / cualquier cosa que toque CVs o screening de candidatos
- Autenticación, multi-tenancy, persistencia de usuarios
- Fine-tuning de Gemma
- Mobile
