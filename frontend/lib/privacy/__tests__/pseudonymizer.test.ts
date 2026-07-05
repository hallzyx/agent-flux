import { describe, expect, it } from "vitest";
import { GOLDEN_BRIEF, GOLDEN_ENTITIES } from "../../fixtures/goldenBrief.ts";
import { RegexPseudonymizer } from "../regexPseudonymizer.ts";

describe("PseudonymizerPort round-trip (M2 gate)", () => {
  const pseudonymizer = new RegexPseudonymizer();

  it("reidentify(pseudonymize(x)) === x", () => {
    const { maskedText, mapping } = pseudonymizer.pseudonymize(GOLDEN_BRIEF);
    const restored = pseudonymizer.reidentify(maskedText, mapping);
    expect(restored).toBe(GOLDEN_BRIEF);
  });

  it("masks all known entities from golden fixture", () => {
    const { maskedText } = pseudonymizer.pseudonymize(GOLDEN_BRIEF);
    for (const entity of GOLDEN_ENTITIES) {
      expect(maskedText).not.toContain(entity);
    }
  });

  it("masks residual LLP org names (Hartwell safety net)", () => {
    const { maskedText } = pseudonymizer.pseudonymize(GOLDEN_BRIEF);
    expect(maskedText).not.toContain("Hartwell & Partners LLP");
  });

  it("uses typed placeholders with magnitude for budget", () => {
    const { maskedText } = pseudonymizer.pseudonymize(GOLDEN_BRIEF);
    expect(maskedText).toMatch(/\[BUDGET_\d+: ~low-6-figures USD\]/);
    expect(maskedText).toMatch(/\[CLIENT_\d+\]/);
    expect(maskedText).toMatch(/\[EMAIL_\d+\]/);
  });
});
