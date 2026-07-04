import { describe, expect, it } from "vitest";
import { applyDetectedEntities } from "../entityMasking.ts";
import { gemmaDocumentChunks, parseEntityJson } from "../gemmaEngine.ts";
import { GOLDEN_BRIEF } from "../../fixtures/goldenBrief.ts";
import type { MappingEntry } from "../types.ts";

describe("gemmaDocumentChunks", () => {
  it("keeps short text in a single chunk", () => {
    expect(gemmaDocumentChunks("hello")).toEqual(["hello"]);
  });

  it("splits golden brief into bounded chunks for 512-token model", () => {
    const chunks = gemmaDocumentChunks(GOLDEN_BRIEF);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(900);
    }
    expect(chunks.join("")).toContain("Meridian Capital");
  });
});

describe("parseEntityJson", () => {
  it("parses JSON array from model output", () => {
    const raw = 'Here are entities:\n[{"text":"Acme Corp","type":"CLIENT"}]';
    expect(parseEntityJson(raw)).toEqual([{ text: "Acme Corp", type: "CLIENT" }]);
  });

  it("returns empty array when no JSON found", () => {
    expect(parseEntityJson("no entities")).toEqual([]);
  });
});

describe("applyDetectedEntities", () => {
  it("adds new entities without breaking existing placeholders", () => {
    const mapping: MappingEntry[] = [
      { placeholder: "[CLIENT_1]", original: "Acme Corp", type: "CLIENT" },
    ];
    const counters = { CLIENT: 1 };
    const masked = applyDetectedEntities(
      "Contact Globex Inc about [CLIENT_1]",
      mapping,
      counters,
      [{ text: "Globex Inc", type: "CLIENT" }],
    );
    expect(masked).toContain("[CLIENT_2]");
    expect(masked).not.toContain("Globex Inc");
    expect(masked).toContain("[CLIENT_1]");
  });
});
