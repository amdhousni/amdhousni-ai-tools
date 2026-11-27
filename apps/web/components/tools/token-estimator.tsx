"use client";

import { useMemo, useState } from "react";
import type { TokenEstimatorResult } from "@amdhousni/core";
import {
  ErrorNote,
  Field,
  Panel,
  RunButton,
  Stat,
  Telemetry,
  useTool,
} from "./kit";

const promptPresets = [
  {
    label: "Support reply",
    prompt:
      "You are a support assistant for a property CRM. Reply to the customer using only the facts in the ticket. If a fact is missing, ask one clarifying question.",
    output: 180,
    monthly: 25_000,
  },
  {
    label: "Doc summariser",
    prompt:
      "Summarise the following tenancy agreement in five bullet points. Preserve every monetary amount exactly as written, and flag any clause that mentions a penalty.",
    output: 420,
    monthly: 8_000,
  },
  {
    label: "RAG answer",
    prompt:
      "Answer the question using only the numbered context chunks. Cite the chunk id for every claim. If the chunks do not support an answer, say so and stop.",
    output: 260,
    monthly: 60_000,
  },
];

type SortKey = "monthly" | "context" | "name";

export function TokenEstimator() {
  const { state, run } = useTool<Record<string, unknown>, TokenEstimatorResult>(
    "/api/tools/token-estimator",
  );

  const [prompt, setPrompt] = useState(promptPresets[0]?.prompt ?? "");
  const [outputTokens, setOutputTokens] = useState("180");
  const [monthly, setMonthly] = useState("25000");
  const [sortKey, setSortKey] = useState<SortKey>("monthly");
  const [descending, setDescending] = useState(false);

  const result = state.status === "success" ? state.response.data : null;

  const rows = useMemo(() => {
    if (!result) return [];
    const copy = [...result.rows];
    copy.sort((a, b) => {
      if (sortKey === "context") return a.contextUsedPct - b.contextUsedPct;
      if (sortKey === "name") return a.label.localeCompare(b.label);
      return a.monthlyCostUsd - b.monthlyCostUsd;
    });
    return descending ? copy.reverse() : copy;
  }, [result, sortKey, descending]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsedOutput = Number.parseInt(outputTokens, 10);
    const parsedMonthly = Number.parseInt(monthly, 10);

    void run({
      prompt,
      expectedOutputTokens:
        Number.isFinite(parsedOutput) && parsedOutput > 0 ? parsedOutput : undefined,
      monthlyRequests: Number.isFinite(parsedMonthly) && parsedMonthly > 0 ? parsedMonthly : 10_000,
    });
  }

  function sortBy(key: SortKey) {
    if (key === sortKey) {
      setDescending((current) => !current);
      return;
    }
    setSortKey(key);
    setDescending(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
      <form onSubmit={submit}>
        <Panel title="Prompt under test">
          <div className="flex flex-wrap gap-1.5">
            {promptPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setPrompt(preset.prompt);
                  setOutputTokens(String(preset.output));
                  setMonthly(String(preset.monthly));
                }}
                className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 font-mono text-[0.56rem] uppercase tracking-[0.08em] text-[#D4D4D8] hover:border-accent/50 hover:text-ink"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            <Field label="System / prompt text" hint={`${prompt.length} chars`} htmlFor="prompt">
              <textarea
                id="prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={7}
                className="field field-mono"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Output tokens" htmlFor="output">
                <input
                  id="output"
                  inputMode="numeric"
                  value={outputTokens}
                  onChange={(event) => setOutputTokens(event.target.value)}
                  className="field"
                />
              </Field>
              <Field label="Monthly calls" htmlFor="monthly">
                <input
                  id="monthly"
                  inputMode="numeric"
                  value={monthly}
                  onChange={(event) => setMonthly(event.target.value)}
                  className="field"
                />
              </Field>
            </div>

            <RunButton pending={state.status === "loading"}>Estimate the cost</RunButton>

            <p className="text-[0.72rem] leading-relaxed text-muted">
              No provider is called: this tool is arithmetic over a published price table, so it
              behaves identically with or without an API key.
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Input tokens" value={String(result.inputTokens)} hint="prompt + system" />
              <Stat label="Output tokens" value={String(result.outputTokens)} />
              <Stat label="Per call" value={`${result.totalTokensPerCall}`} hint="tokens" />
              <Stat
                label="Monthly calls"
                value={result.monthlyRequests.toLocaleString("en-US")}
              />
            </div>

            <div className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
                <h3 className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                  Model comparison
                </h3>
                <div className="flex items-center gap-1.5">
                  {(
                    [
                      ["monthly", "Monthly cost"],
                      ["context", "Context used"],
                      ["name", "Model"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => sortBy(key)}
                      className={`rounded-full border px-2.5 py-1 font-mono text-[0.54rem] uppercase tracking-[0.08em] ${
                        sortKey === key
                          ? "border-accent/50 bg-accent/10 text-accent"
                          : "border-line text-[#D4D4D8] hover:text-ink"
                      }`}
                    >
                      {label}
                      {sortKey === key ? (descending ? " ↓" : " ↑") : ""}
                    </button>
                  ))}
                </div>
              </div>

              <div className="scroll-x">
                <table className="w-full min-w-[36rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line">
                      {["Model", "Context used", "$ / 1k calls", "Monthly"].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-2.5 font-mono text-[0.54rem] uppercase tracking-[0.1em] text-muted"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const cheapest = result.cheapest?.id === row.id;
                      const balanced = result.balanced?.id === row.id && !cheapest;

                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-line last:border-b-0 ${
                            cheapest ? "bg-accent/[0.06]" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[0.82rem] text-ink">{row.label}</span>
                              <span className="font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted">
                                {row.provider}
                              </span>
                              {cheapest ? (
                                <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.06em] text-[#09090B]">
                                  Cheapest
                                </span>
                              ) : null}
                              {balanced ? (
                                <span className="rounded border border-accent/40 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.06em] text-accent">
                                  Balanced
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 font-mono text-[0.56rem] text-muted">
                              ${row.inputPerMillion}/M in · ${row.outputPerMillion}/M out ·{" "}
                              {(row.contextWindow / 1000).toFixed(0)}k ctx
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <div
                              className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10"
                              role="img"
                              aria-label={`${row.contextUsedPct}% of the context window`}
                            >
                              <div
                                className={`h-full rounded-full ${
                                  row.contextUsedPct > 80 ? "bg-amber-400" : "bg-accent"
                                }`}
                                style={{ width: `${Math.min(100, Math.max(2, row.contextUsedPct))}%` }}
                              />
                            </div>
                            <p className="mt-1 font-mono text-[0.56rem] text-[#D4D4D8]">
                              {row.contextUsedPct}%
                            </p>
                          </td>
                          <td className="px-4 py-3 font-mono text-[0.7rem] text-[#D4D4D8]">
                            ${row.costPer1kRequests.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 font-mono text-[0.7rem] text-ink">
                            ${row.monthlyCostUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-5">
              <p className="text-[0.8rem] leading-relaxed text-[#C4C4CC]">{result.note}</p>
              <p className="mt-2 text-[0.72rem] leading-relaxed text-muted">{result.pricingNote}</p>
            </div>
          </>
        ) : (
          <div className="card p-6">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
              Waiting for input
            </p>
            <p className="mt-3 max-w-md text-[0.88rem] leading-relaxed text-[#C4C4CC]">
              Paste a prompt and press estimate. You get the token count, the share of each
              model&apos;s context window and the monthly bill — before you commit to a tier.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
