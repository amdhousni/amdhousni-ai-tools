import { describe, expect, it } from "vitest";
import {
  extractDeterministic,
  extractorPresets,
  schemaForValue,
  validateAgainstSchema,
} from "../src";

const document = `Invoice INV-2026-0042 issued 2026-02-02.
Client: VividProp Co., Ltd.
Billing email: billing@vividprop.io
Total USD 4,494.00 due 2026-03-04.
Reference: https://vividprop.io/billing/INV-2026-0042`;

describe("extractDeterministic", () => {
  const result = extractDeterministic({
    text: document,
    hints: ["invoice_number", "total", "purchase_order"],
  });

  it("finds machine-readable entities", () => {
    expect(result.json.email).toBe("billing@vividprop.io");
    expect(result.json.amount).toBe("USD 4,494.00");
    expect(JSON.stringify(result.json.url)).toContain("vividprop.io/billing");
    expect(result.method).toBe("rules");
  });

  it("keeps explicit key: value lines as named fields", () => {
    expect(result.json.client).toBe("VividProp Co., Ltd");
  });

  it("returns hinted-but-absent fields as empty instead of inventing them", () => {
    expect(result.json.purchase_order).toBe("");

    const missing = result.confidence.find((entry) => entry.field === "purchase_order");
    expect(missing?.confidence).toBe(0);
    expect(missing?.note).toContain("empty rather than guessed");
  });

  it("emits a valid Draft 2020-12 schema that the payload satisfies", () => {
    expect(result.schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(result.validation.valid).toBe(true);
    expect(result.validation.errors).toEqual([]);
  });

  it("does not read an invoice identifier as a phone number", () => {
    expect(result.json.phone).toBeUndefined();
  });

  it("keeps absent hinted fields optional instead of required", () => {
    const required = result.schema.required as string[];
    expect(required).not.toContain("purchase_order");
    expect(required).toContain("email");
  });

  it("only returns values that appear in the source text", () => {
    for (const value of Object.values(result.json)) {
      const values = Array.isArray(value) ? value : [value];
      for (const entry of values) {
        if (typeof entry === "string" && entry.length > 0) {
          expect(document).toContain(entry);
        }
      }
    }
  });
});

describe("schemaForValue", () => {
  it("describes nested objects and arrays", () => {
    const schema = schemaForValue(
      { total: 12.5, tags: ["a"], nested: { paid: true } },
      true,
    ) as {
      type: string;
      required: string[];
      properties: Record<string, { type: string }>;
    };

    expect(schema.type).toBe("object");
    expect(schema.required).toEqual(["total", "tags", "nested"]);
    expect(schema.properties.total?.type).toBe("number");
    expect(schema.properties.tags?.type).toBe("array");
    expect(schema.properties.nested?.type).toBe("object");
  });

  it("rejects a payload that does not conform", () => {
    const schema = schemaForValue({ email: "a@b.co" }, true);
    expect(validateAgainstSchema({ email: 42 }, schema).valid).toBe(false);
    expect(validateAgainstSchema({ email: "a@b.co" }, schema).valid).toBe(true);
  });

  it("reports an error when the schema cannot be compiled", () => {
    const result = validateAgainstSchema({}, { type: "not-a-type" });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("presets", () => {
  it("every preset produces valid JSON against its schema", () => {
    for (const preset of extractorPresets) {
      const extracted = extractDeterministic({ text: preset.text, hints: preset.hints });
      expect(extracted.validation.valid).toBe(true);
    }
  });
});
