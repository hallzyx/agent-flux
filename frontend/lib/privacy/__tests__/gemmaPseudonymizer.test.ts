import { describe, expect, it } from "vitest";
import { GOLDEN_BRIEF, GOLDEN_ENTITIES } from "../../fixtures/goldenBrief.ts";
import { GemmaPseudonymizer } from "../gemmaPseudonymizer.ts";

describe("GemmaPseudonymizer (M10 gate — same tests as M2)", () => {
  const pseudonymizer = new GemmaPseudonymizer();

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
});
