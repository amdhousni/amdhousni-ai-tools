import type { Metadata } from "next";
import { fitPresets } from "@amdhousni/core";
import { ToolHeader, UnderTheHood } from "@/components/tool-frame";
import { FitAnalyzer } from "@/components/tools/fit-analyzer";
import { toolSourcePaths } from "@/lib/site";

export const metadata: Metadata = {
  title: "Role / JD Fit & Gap Analyzer",
  description:
    "Score a job description against Ahmed Housni's published profile: weighted coverage, the evidence behind each matched skill, the genuine gaps, and the technical angles worth raising on a first call.",
  alternates: { canonical: "/tools/jd-fit-analyzer" },
};

const source = toolSourcePaths["jd-fit-analyzer"];

export default function JdFitAnalyzerPage() {
  return (
    <>
      <ToolHeader
        index="04"
        category="Hiring"
        title="Role / JD Fit & Gap Analyzer"
        tagline="Read a job description the way an engineer reads a system — then see which requirements the evidence actually supports."
        description="Weighted coverage against a structured profile, a match line with the concrete artefact behind each skill, and gaps named individually instead of averaged away."
        endpoint="/api/tools/jd-fit-analyzer"
        modeLabel="Live model · weighted matcher"
        sourcePath={source}
      />

      <section className="border-b border-line bg-canvas-deep">
        <div className="shell py-10 md:py-14">
          <FitAnalyzer presets={fitPresets} />
        </div>
      </section>

      <UnderTheHood
        sourcePath={source}
        requestPath={[
          "The job description is matched against a weighted skill taxonomy; every matched requirement maps to a profile skill with a published piece of evidence.",
          "Coverage is computed from weights per category (AI, full-stack, data, delivery, product) — the number is arithmetic, not a model's opinion.",
          "With a key, the model rewrites the evidence lines and proposes interview angles; the score is still the computed one.",
          "Model output is reconciled against the computed sets: a skill the matcher did not find is dropped, so the model cannot inflate coverage.",
          "Without a key, the matcher's own evidence lines are returned with the same score and the same gaps.",
        ]}
        stack={[
          "Structured profile",
          "Weighted taxonomy",
          "Zod reconciliation",
          "Zod envelope",
          "Deterministic scoring",
        ]}
        validation="The description is validated for length, the model must answer inside a fixed schema, and anything outside the computed matched/gap sets is discarded. A provider failure leaves the deterministic result intact with the badge switched to fallback."
        tradeoffs={[
          "Keyword coverage rewards shared vocabulary and under-weights transferable experience; that is why the gaps are listed one by one rather than summarised.",
          "The profile is a static snapshot of the portfolio, so a skill learned last week will not appear until that file is updated.",
          "The score is a screening aid, not a verdict. A 60 with three honest gaps is more useful to a recruiter than a 95 built on inference.",
        ]}
      />
    </>
  );
}
