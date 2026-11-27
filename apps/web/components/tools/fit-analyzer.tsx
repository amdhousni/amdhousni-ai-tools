"use client";

import { useState } from "react";
import type { FitResult } from "@amdhousni/core";
import {
  ErrorNote,
  Field,
  Panel,
  RunButton,
  Stat,
  Telemetry,
  useTool,
} from "./kit";

type Preset = { id: string; label: string; text: string };

export function FitAnalyzer({ presets }: { presets: Preset[] }) {
  const { state, run } = useTool<Record<string, unknown>, FitResult>(
    "/api/tools/jd-fit-analyzer",
  );

  const [jobDescription, setJobDescription] = useState(presets[0]?.text ?? "");
  const result = state.status === "success" ? state.response.data : null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void run({ jobDescription });
  }

  const score = result?.coverageScore ?? 0;
  const tone = score >= 70 ? "text-emerald-300" : score >= 40 ? "text-amber-200" : "text-red-200";
  const bar = score >= 70 ? "bg-emerald-400" : score >= 40 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <form onSubmit={submit}>
        <Panel title="Job description">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setJobDescription(preset.text)}
                className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 font-mono text-[0.56rem] uppercase tracking-[0.08em] text-[#D4D4D8] hover:border-accent/50 hover:text-ink"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            <Field label="Paste the role" hint={`${jobDescription.length} chars`} htmlFor="jd">
              <textarea
                id="jd"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                rows={14}
                className="field field-mono"
                placeholder="Paste the responsibilities and requirements sections…"
              />
            </Field>

            <RunButton pending={state.status === "loading"}>Analyse the fit</RunButton>

            <p className="text-[0.72rem] leading-relaxed text-muted">
              The score is weighted keyword coverage over the published profile. It never infers
              transferable experience — that is what the gap list is for.
            </p>
          </div>
        </Panel>
      </form>

      <div className="space-y-4">
        {state.status === "error" ? (
          <ErrorNote message={state.message} retryAfter={state.retryAfter} />
        ) : null}

        {state.status === "success" ? (
          <div className="card p-5">
            <Telemetry mode={state.response.mode} meta={state.response.meta} />
          </div>
        ) : null}

        {result ? (
          <>
            <div className="card p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
                    Coverage score
                  </p>
                  <p className={`mt-2 text-[2.6rem] font-medium leading-none tracking-[-0.04em] ${tone}`}>
                    {result.coverageScore}
                    <span className="ml-1 text-[1rem] text-muted">/ 100</span>
                  </p>
                </div>
                <p className="max-w-[18rem] text-[0.74rem] leading-relaxed text-muted">
                  {result.strengths.length > 0
                    ? `Strongest matches: ${result.strengths.join(", ")}.`
                    : "No matching requirements detected in this description."}
                </p>
              </div>

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${score}%` }} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Matched" value={String(result.matchedSkills.length)} />
                <Stat label="Gaps" value={String(result.gaps.length)} />
                <Stat label="Requirements" value={String(result.requiredSkills.length)} />
                <Stat label="Method" value={result.method === "model" ? "Model" : "Rules"} />
              </div>

              <ul className="mt-5 flex flex-wrap gap-1.5 border-t border-line pt-4">
                {result.categories.map((category) => (
                  <li key={category.name} className="chip">
                    {category.name} {category.matched}/{category.required}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Panel title="Matched · with evidence">
                <ul className="space-y-3">
                  {result.matchedSkills.map((match) => (
                    <li key={match.skillId}>
                      <p className="text-[0.84rem] font-medium text-ink">{match.skill}</p>
                      <p className="mt-1 text-[0.74rem] leading-relaxed text-[#C4C4CC]">
                        {match.evidence}
                      </p>
                    </li>
                  ))}
                  {result.matchedSkills.length === 0 ? (
                    <li className="text-[0.78rem] text-muted">No overlap detected.</li>
                  ) : null}
                </ul>
              </Panel>

              <Panel title="Genuine gaps">
                <ul className="space-y-3">
                  {result.gaps.map((gap) => (
                    <li key={gap.skillId}>
                      <p className="text-[0.84rem] font-medium text-ink">{gap.skill}</p>
                      <p className="mt-1 text-[0.74rem] leading-relaxed text-[#C4C4CC]">{gap.why}</p>
                    </li>
                  ))}
                  {result.gaps.length === 0 ? (
                    <li className="text-[0.78rem] text-muted">
                      Nothing missing among the requirements it recognised.
                    </li>
                  ) : null}
                </ul>
              </Panel>
            </div>

            <Panel title="Interview angles">
              <ol className="space-y-2.5">
                {result.interviewAngles.map((angle) => (
                  <li key={angle} className="flex gap-3 text-[0.82rem] leading-relaxed text-[#D4D4D8]">
                    <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {angle}
                  </li>
                ))}
              </ol>
              <p className="mt-4 border-t border-line pt-3 text-[0.74rem] leading-relaxed text-muted">
                {result.note}
              </p>
            </Panel>
          </>
        ) : (
          <div className="card p-6">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
              Waiting for input
            </p>
            <p className="mt-3 max-w-md text-[0.88rem] leading-relaxed text-[#C4C4CC]">
              Load one of the three role presets or paste a real job description. You get the
              coverage split, the evidence behind each match, and the gaps stated plainly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
