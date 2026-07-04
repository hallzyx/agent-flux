import { describe, expect, it } from "vitest";
import { GOLDEN_BRIEF } from "../../fixtures/goldenBrief.ts";
import { RegexPseudonymizer } from "../regexPseudonymizer.ts";
import { buildReidentifiedExport } from "../reidentifyExport.ts";

describe("buildReidentifiedExport", () => {
  const pseudonymizer = new RegexPseudonymizer();
  const { maskedText, mapping } = pseudonymizer.pseudonymize(GOLDEN_BRIEF);

  it("re-identifies markdown and nested jira JSON", () => {
    const prd = {
      export: {
        markdown: `# PRD for [CLIENT_1]\nContact: [EMAIL_1]`,
        jira: {
          issues: [{ summary: "Epic for [CLIENT_1]", description: "Budget [BUDGET_1: ~low-6-figures USD]" }],
        },
      },
    };
    const out = buildReidentifiedExport(prd, pseudonymizer, mapping);
    expect(out?.markdown).toContain("Acme Corp");
    expect(out?.markdown).not.toContain("[CLIENT_1]");
    const issue = (out?.jira as { issues: Array<{ summary: string }> }).issues[0];
    expect(issue.summary).toContain("Acme Corp");
  });

  it("handles masked markdown from pipeline shape", () => {
    const prd = {
      export: {
        markdown: maskedText.slice(0, 200),
        jira: { issues: [] },
      },
    };
    const out = buildReidentifiedExport(prd, pseudonymizer, mapping)!;
    expect(out.markdown).not.toMatch(/\[CLIENT_\d+\]/);
  });
});
