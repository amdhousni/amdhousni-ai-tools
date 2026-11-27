import type { Metadata } from "next";
import { ToolHeader, UnderTheHood } from "@/components/tool-frame";
import { TokenEstimator } from "@/components/tools/token-estimator";
import { toolSourcePaths } from "@/lib/site";

export const metadata: Metadata = {
  title: "LLM Token & Cost Estimator",
  description:
    "Estimate prompt and output tokens, context-window usage and monthly model cost across GPT, Claude, Gemini, DeepSeek, Qwen and Llama tiers. Deterministic, no API key required.",
  alternates: { canonical: "/tools/token-cost-estimator" },
};

const source = toolSourcePaths["token-cost-estimator"];

export default function TokenCostEstimatorPage() {
  return (
    <>
      <ToolHeader
        index="01"
        category="Economics"
        title="LLM Token & Cost Estimator"
        tagline="Size a prompt, check the context window and price the month — before you commit to a tier."
        description="A documented token heuristic plus a maintained price table: per-call cost, cost per 1,000 requests, projected monthly spend and the share of each model's context window the call consumes."
        endpoint="/api/tools/token-estimator"
        modeLabel="Deterministic · no model call"
        sourcePath={source}
      />

      <section className="border-b border-line bg-canvas-deep">
        <div className="shell py-10 md:py-14">
          <TokenEstimator />
        </div>
      </section>

      <UnderTheHood
        sourcePath={source}
        requestPath={[
          "The prompt and optional system text are counted by the shared token heuristic (characters, word density, non-ASCII characters counted individually).",
          "Expected output tokens are taken as given, or derived from a ratio of the input when omitted.",
          "Every model in the price table is evaluated with the same token counts: context usage, per-request cost, per-1,000-request cost and monthly projection.",
          "Rows are sorted cheapest-first and the cheapest and balanced tiers are labelled; nothing is rounded for appearance.",
          "The arithmetic runs on the server so the price table has one home and can be corrected without a client release.",
        ]}
        stack={[
          "TypeScript arithmetic",
          "Zod input contract",
          "Shared price table",
          "No provider call",
          "Typed envelope",
        ]}
        validation="The request is validated by Zod (prompt length, bounds on volume and output size). There is no model call, so there is no fallback path: the response is always marked deterministic and costs $0."
        tradeoffs={[
          "This is an estimate, not a tokenizer: expect roughly 10–15% error on prose and more on code.",
          "Prices are published list prices at the time of writing and change often; the table is labelled as reference pricing and lives in one file.",
          "Context-window limits are the advertised maximum, not the provider's effective working window, which is often smaller in practice.",
          "No prompt-quality dimension is modelled: a cheaper tier may cost more in retries, which this tool cannot see.",
        ]}
      />
    </>
  );
}
