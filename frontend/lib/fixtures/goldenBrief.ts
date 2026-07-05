/** Finance vertical demo fixture — Vultr track (document-grounded B2B lending RFP). */

export const GOLDEN_BRIEF = `# CLIENT RFP — Meridian Capital Digital Lending Portal (CONFIDENTIAL)

Prepared for: Meridian Capital
Legal counsel: Hartwell & Partners LLP (external — not on approved vendor list)
Contact: Jane Smith <jane.smith@meridiancap.com>
Budget: $120,000 USD
Target launch: March 15, 2026
NDA Reference: NDA-2026-0042

## 1. Background

Meridian Capital requires a modern borrower and loan-servicing portal to replace legacy billing and covenant-reporting workflows. The platform must support authenticated access for relationship managers, document management for loan files, and a licensing module for tiered SaaS access across business units.

## 2. Phase 1 — Authentication (Q1 2026)

The system must implement SSO integration with Okta, role-based access control aligned with SOX segregation-of-duties, and audit logging for all authentication events. Security review is mandatory before go-live.

## 3. Phase 2 — Licensing & Fee Module (Q3 2026)

The licensing module is business-critical for regulated fee disclosure. **The payment model is ambiguous in the current RFP — it could mean either a one-time license fee OR a recurring subscription model.** This decision blocks technical architecture for billing integration and covenant-monitoring dashboards.

Requirements:
- License key generation and validation for lending product modules
- Usage metering for subscription tiers
- Integration with external payment gateway (Stripe or equivalent)
- Fee schedules must support audit trail for finance operations review

## 4. Phase 3 — Loan Document Management (Q4 2026)

Users must upload, version, and share loan documents with fine-grained permissions. Maximum file size: 50MB per document. All document access must be logged for compliance.

## 5. Constraints

- Must comply with SOC 2 Type II and internal model-risk management policy
- All PII must remain within Meridian Capital's data residency requirements
- Total budget not to exceed $120,000 USD
- Project sponsor: Robert Chen, VP Engineering (robert.chen@meridiancap.com)

## 6. Success Criteria

- Portal live by March 15, 2026
- 99.9% uptime SLA
- User acceptance testing sign-off from Meridian Capital stakeholders
- Delivery spec ready for engineering execution (epics, stories, risks)
`;

/** Entity only Gemma NER should catch — not in regex KNOWN_* lists (demo differentiator). */
export const GOLDEN_GEMMA_ONLY_ENTITIES = ["Hartwell & Partners LLP"];

/** Known entities for privacy gate tests */
export const GOLDEN_ENTITIES = [
  "Meridian Capital",
  "Jane Smith",
  "jane.smith@meridiancap.com",
  "$120,000",
  "March 15, 2026",
  "Robert Chen",
  "robert.chen@meridiancap.com",
  "NDA-2026-0042",
];

export const DEMO_VERTICAL = "Finance";

export const DEMO_VERTICAL_TAGLINE =
  "Document-grounded agent · Client RFP → execution-ready delivery spec";
