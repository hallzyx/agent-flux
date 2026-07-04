export const GOLDEN_BRIEF = `# CLIENT BRIEF — Acme Corp Digital Platform (CONFIDENTIAL)

Prepared for: Acme Corp
Contact: Jane Smith <jane.smith@acmecorp.com>
Budget: $120,000 USD
Target launch: March 15, 2026
NDA Reference: NDA-2026-0042

## 1. Background

Acme Corp requires a modern customer portal to replace their legacy billing system. The platform must support user authentication, document management, and a licensing module for enterprise clients.

## 2. Phase 1 — Authentication (Q1 2026)

The system must implement SSO integration with Okta, role-based access control, and audit logging for all authentication events. Security review is mandatory before go-live.

## 3. Phase 2 — Licensing Module (Q3 2026)

The licensing module is business-critical. **The payment model is ambiguous in the current brief — it could mean either a one-time license fee OR a recurring subscription model.** This decision blocks technical architecture for billing integration.

Requirements:
- License key generation and validation
- Usage metering for subscription tiers
- Integration with external payment gateway (Stripe or equivalent)

## 4. Phase 3 — Document Management (Q4 2026)

Users must upload, version, and share documents with fine-grained permissions. Maximum file size: 50MB per document.

## 5. Constraints

- Must comply with SOC 2 Type II
- All PII must remain within Acme Corp's data residency requirements
- Total budget not to exceed $120,000 USD
- Project sponsor: Robert Chen, VP Engineering (robert.chen@acmecorp.com)

## 6. Success Criteria

- Portal live by March 15, 2026
- 99.9% uptime SLA
- User acceptance testing sign-off from Acme Corp stakeholders
`;

/** Known entities for privacy gate tests */
export const GOLDEN_ENTITIES = [
  "Acme Corp",
  "Jane Smith",
  "jane.smith@acmecorp.com",
  "$120,000",
  "March 15, 2026",
  "Robert Chen",
  "robert.chen@acmecorp.com",
  "NDA-2026-0042",
];
