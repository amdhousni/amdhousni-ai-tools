import type { Metadata } from "next";
import { extractorPresets } from "@amdhousni/core";
import { ToolHeader, UnderTheHood } from "@/components/tool-frame";
import { SchemaExtractor } from "@/components/tools/schema-extractor";
import { toolSourcePaths } from "@/lib/site";

export const metadata: Metadata = {
  title: "Structured JSON & Schema Extractor",
  description:
    "Turn an email, listing, invoice note or support ticket into strict JSON plus a matching JSON Schema Draft 2020-12, validated before it renders. Live model or deterministic rules.",
  alternates: { canonical: "/tools/json-schema-extractor" },
};

const source = toolSourcePaths["json-schema-extractor"];

export default function JsonSchemaExtractorPage() {
  return (
    <>
      <ToolHeader
        index="02"
        category="Extraction"
        title="Structured JSON & Schema Extractor"
        tagline="Turn unstructured text into typed JSON and a schema that describes it."
        description="Paste a document and get strict JSON, the JSON Schema generated from that payload, and a validation result you can reproduce. Hinted fields that are absent come back empty — never invented."
        endpoint="/api/tools/json-extractor"
        modeLabel="Live model · regex fallback"
        sourcePath={source}
      />

      <section className="border-b border-line bg-canvas-deep">
        <div className="shell py-10 md:py-14">
          <SchemaExtractor presets={extractorPresets} />
        </div>
      </section>

      <UnderTheHood
        sourcePath={source}
        requestPath={[
          "The document is validated for length and shape, then sent with an explicit instruction to extract only what is literally present.",
          "The model must answer inside a fixed JSON envelope (summary, fields, notes); anything else fails validation and triggers the fallback.",
          "The JSON Schema is generated from the returned payload, so the schema cannot describe fields the payload does not have.",
          "Ajv compiles that schema and validates the payload; a failure is reported instead of being silently rendered.",
          "Without a key, or after a timeout or invalid output, the rule-based extractor returns emails, URLs, dates, phones, amounts and explicit key: value lines.",
        ]}
        stack={[
          "Next.js route handler",
          "Zod envelope",
          "JSON mode",
          "Ajv 2020-12",
          "Regex + key:value fallback",
        ]}
        validation="Every response is parsed and validated against a Zod envelope, then the payload is validated against the generated JSON Schema. Invalid model output, an upstream error or a 15s timeout all route to the deterministic extractor, and the badge changes to say so."
        tradeoffs={[
          "Field selection is inferred: an ambiguous document can produce a different shape than expected. The schema is returned so you can see and correct it.",
          "The rule-based path is narrow by design — it finds machine-readable entities, not semantic fields such as 'intent' or 'sentiment'.",
          "Schema generation infers types from one sample, so an array with mixed types becomes a best-effort union rather than a precise contract.",
          "Nothing is persisted: the document is used for the response and discarded.",
        ]}
      />
    </>
  );
}
