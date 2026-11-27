import Ajv2020 from "ajv/dist/2020";
import {
  extractorModelOutputSchema,
  type ExtractorPreset,
  type JsonExtractorInput,
} from "../../contracts/tools";
import { completeJson, type LlmConfig, type LlmUsage } from "../../llm/adapter";

/**
 * Two extractors, one contract.
 *
 * Live mode asks the model for a fields object and then derives the JSON
 * Schema from what came back, so the schema always describes the payload. The
 * deterministic mode finds machine-readable entities with rules and does the
 * same derivation. Either way the JSON is validated against the schema before
 * it is returned.
 */

export type ExtractedEntity = {
  type: string;
  value: string;
  confidence: number;
};

export type ExtractionResult = {
  summary: string;
  json: Record<string, unknown>;
  schema: Record<string, unknown>;
  validation: { valid: boolean; errors: string[] };
  confidence: { field: string; confidence: number; note: string }[];
  notes: string[];
  entities: ExtractedEntity[];
  method: "model" | "rules";
};

export type ExtractorPresetDefinition = {
  id: ExtractorPreset;
  label: string;
  text: string;
  hints: string[];
};

export const extractorPresets: ExtractorPresetDefinition[] = [
  {
    id: "email",
    label: "Inbound email",
    hints: ["contact_name", "budget", "deadline"],
    text: `Hi Ahmed,

We are finalising the scope for a tenant portal and would like a quote before 2026-03-15.
Budget approved is EUR 18,500 for the first phase, and we need the API ready in April.

You can reach me at claire.moreau@northwind-logistics.com or +33 6 12 44 90 21.
The full brief is at https://northwind-logistics.com/portal-brief.

Thanks,
Claire Moreau
Head of Operations, Northwind Logistics`,
  },
  {
    id: "listing",
    label: "Property listing",
    hints: ["price", "bedrooms", "location"],
    text: `Ref: BKK-ASI-2291

Two-bedroom condominium at Ashton Silom, 12th floor, 68 sqm, fully furnished.
Asking price THB 8,900,000. Service charge THB 55 per sqm per month.
Available from 2026-01-08. Viewing contact: sales@ashton-residences.co.th.
Listing agent: Khun Nok, +66 81 445 7821.
https://ashton-residences.co.th/silom/2291`,
  },
  {
    id: "invoice",
    label: "Invoice note",
    hints: ["invoice_number", "total", "due_date"],
    text: `Invoice INV-2026-0042 issued 2026-02-02.
Client: VividProp Co., Ltd. — billing@vividprop.io
Subtotal USD 4,200. VAT 7% applied. Total USD 4,494.00.
Payment due 2026-03-04 by bank transfer. Late fee USD 120 after the due date.`,
  },
  {
    id: "ticket",
    label: "Support ticket",
    hints: ["customer", "priority", "product"],
    text: `Ticket #4821 opened 2026-02-11 — priority: high.
Customer: Somchai P. (somchai.p@example.co.th)
Product: DevProp CRM, agency workspace "Siam Living".
Issue: LINE enquiry webhook stopped creating leads after the 09:40 deploy; 3 agents affected.
Workaround attempted: re-authorising the LINE channel. Reference: https://status.devprop.io/incidents/4821`,
  },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type Pattern = {
  type: string;
  regex: RegExp;
  confidence: number;
  accept?: (value: string) => boolean;
};

const PATTERNS: Pattern[] = [
  { type: "email", regex: /[\w.+-]+@[\w-]+\.[\w.-]{2,}/g, confidence: 0.95 },
  { type: "url", regex: /https?:\/\/[^\s<>"')]+/g, confidence: 0.9 },
  {
    type: "date",
    regex:
      /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g,
    confidence: 0.85,
  },
  {
    type: "phone",
    regex: /\+?\d[\d\s().-]{6,}\d/g,
    confidence: 0.7,
    /**
     * A phone number is not a date, and not an identifier. `INV-2026-0042`
     * yields "2026-0042" from the regex above, so the accept rule requires a
     * plausible digit count and rejects year-prefixed references.
     */
    accept: (value) => {
      const digits = value.replace(/\D/g, "");
      return (
        digits.length >= 9 &&
        digits.length <= 15 &&
        !ISO_DATE.test(value) &&
        !/^\d{1,2}[/.]\d{1,2}[/.]\d{2,4}$/.test(value) &&
        !/^\d{4}-\d{2,4}$/.test(value) &&
        !/[A-Za-z]/.test(value)
      );
    },
  },
  {
    type: "amount",
    regex: /(?:USD|EUR|THB|GBP|MAD|\$|€|£|฿)\s?\d[\d,\s]*(?:\.\d{1,2})?/gi,
    confidence: 0.8,
  },
];

const KEY_VALUE = /^([A-Za-z][A-Za-z0-9 _-]{1,32}):\s*(.+)$/;

function snakeCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Schema derived from the payload, so the two can never disagree. */
export function schemaForValue(value: unknown, isRoot = false): Record<string, unknown> {
  if (value === null || value === undefined) {
    return { type: "null" };
  }

  if (Array.isArray(value)) {
    const [first] = value;
    return {
      type: "array",
      items: first === undefined ? {} : schemaForValue(first),
    };
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const properties = Object.fromEntries(
      entries.map(([key, nested]) => [key, schemaForValue(nested)]),
    );
    const schema: Record<string, unknown> = {
      type: "object",
      properties,
      required: entries.map(([key]) => key),
      additionalProperties: false,
    };
    if (isRoot) {
      return {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: "ExtractedDocument",
        ...schema,
      };
    }
    return schema;
  }

  switch (typeof value) {
    case "number":
      return { type: Number.isInteger(value) ? "integer" : "number" };
    case "boolean":
      return { type: "boolean" };
    default:
      return { type: "string" };
  }
}

const ajv = new Ajv2020({ strict: false, allErrors: true, coerceTypes: false });

/** Validate a payload against a JSON Schema Draft 2020-12 document. */
export function validateAgainstSchema(
  data: unknown,
  schema: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  try {
    const validate = ajv.compile(schema);
    const valid = validate(data) as boolean;
    const errors = (validate.errors ?? []).map(
      (error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
    );
    return { valid, errors: errors.slice(0, 8) };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : "schema could not be compiled"],
    };
  }
}

function pushField(
  fields: Record<string, string | string[]>,
  key: string,
  value: string,
): void {
  const existing = fields[key];
  if (!existing) {
    fields[key] = value;
    return;
  }
  if (Array.isArray(existing)) {
    if (!existing.includes(value)) existing.push(value);
    return;
  }
  if (existing !== value) fields[key] = [existing, value];
}

export function extractDeterministic(
  input: Pick<JsonExtractorInput, "text" | "hints">,
): ExtractionResult {
  const entities: ExtractedEntity[] = [];
  const claimed = new Set<string>();

  for (const pattern of PATTERNS) {
    const matches = Array.from(new Set(input.text.match(pattern.regex) ?? [])).slice(0, 8);
    for (const raw of matches) {
      const value = raw.trim();
      if (claimed.has(value)) continue;
      if (pattern.accept && !pattern.accept(value)) continue;
      claimed.add(value);
      entities.push({ type: pattern.type, value, confidence: pattern.confidence });
    }
  }

  const fields: Record<string, string | string[]> = {};
  for (const entity of entities) {
    pushField(fields, entity.type, entity.value);
  }

  // Explicit "Key: value" lines beat regex guesses for named fields.
  for (const line of input.text.split(/\r?\n/)) {
    const match = KEY_VALUE.exec(line.trim());
    if (!match) continue;
    const [, rawKey, rawValue] = match;
    if (!rawKey || !rawValue) continue;
    const key = snakeCase(rawKey);
    if (!key || key.length < 2) continue;
    const value = rawValue.trim().replace(/[.;]$/, "");
    if (!value || value.length > 120) continue;
    fields[key] = value;
  }

  for (const hint of input.hints ?? []) {
    const key = snakeCase(hint);
    if (key && !(key in fields)) fields[key] = "";
  }

  const json = JSON.parse(JSON.stringify(fields)) as Record<string, unknown>;
  const schema = schemaForValue(json, true);

  // Hinted-but-absent fields stay in `properties` as optional: requiring a
  // field we did not find would invite a downstream consumer to trust "".
  const required = Object.entries(fields)
    .filter(([, value]) => !(value === "" || (Array.isArray(value) && value.length === 0)))
    .map(([key]) => key);
  schema.required = required;

  const validation = validateAgainstSchema(json, schema);

  const confidence = Object.entries(fields).map(([field, value]) => {
    const entity = entities.find((item) => item.value === value);
    const empty = value === "" || (Array.isArray(value) && value.length === 0);
    return {
      field,
      confidence: empty ? 0 : entity ? entity.confidence : 0.6,
      note: empty
        ? "Field hinted but not found in the text — returned empty rather than guessed."
        : entity
          ? `Matched by a ${entity.type} rule.`
          : "Matched by an explicit key: value line.",
    };
  });

  const found = entities.length;
  const summary =
    found === 0 && Object.keys(fields).length === 0
      ? "No machine-readable entities were found. The live path can infer semantic fields that rules cannot."
      : `Rule-based extraction found ${found} ${found === 1 ? "entity" : "entities"} across ${Object.keys(fields).length} field ${Object.keys(fields).length === 1 ? "type" : "types"}.`;

  const notes = [
    "Regex extraction finds machine-readable entities (emails, URLs, dates, phones, amounts) and explicit key: value lines; it does not infer semantic fields.",
    "Empty hinted fields are returned as empty strings, not invented values.",
  ];

  return {
    summary,
    json,
    schema,
    validation,
    confidence,
    notes,
    entities,
    method: "rules",
  };
}

const SYSTEM_PROMPT = `You extract structured data from documents.
Return a single JSON object with exactly this shape:
{"summary": string, "fields": object, "notes": string[]}

Rules:
- Only extract values that are literally present in the document. Never invent, normalise away, or complete a value.
- Use snake_case keys. Use ISO 8601 (YYYY-MM-DD) for dates only when the document states that date unambiguously.
- Numbers that are amounts keep their currency in the value string.
- If a requested field is absent, omit it and mention it in notes.
- notes: max 5 short strings describing ambiguity, missing fields, or assumptions.
Return JSON only.`;

export async function extractWithModel(
  input: JsonExtractorInput,
  options: { config: LlmConfig; signal?: AbortSignal },
): Promise<{ result: ExtractionResult; usage: LlmUsage } | { failure: string } | null> {
  const hints = (input.hints ?? []).filter(Boolean);
  const user = [
    hints.length ? `Requested fields: ${hints.join(", ")}` : "",
    "Document:",
    input.text,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await completeJson({
    system: SYSTEM_PROMPT,
    user,
    schema: extractorModelOutputSchema,
    config: options.config,
    maxTokens: 900,
    signal: options.signal,
  });

  if (!response.ok) return { failure: response.reason };

  const { summary, fields, notes } = response.data;
  const json = fields as Record<string, unknown>;
  const schema = schemaForValue(json, true);
  const validation = validateAgainstSchema(json, schema);

  if (!validation.valid) {
    return { failure: "invalid_output" };
  }

  return {
    usage: response.usage,
    result: {
      summary,
      json,
      schema,
      validation,
      confidence: Object.keys(json).map((field) => ({
        field,
        confidence: 0.85,
        note: "Extracted by the model and validated against the generated schema.",
      })),
      notes:
        notes.length > 0
          ? notes
          : ["Model output validated against the schema generated from its own fields."],
      entities: [],
      method: "model",
    },
  };
}
