"use client";

import { useState } from "react";
import type { ExtractionResult } from "@amdhousni/core";
import {
  CopyButton,
  ErrorNote,
  Field,
  Panel,
  RunButton,
  Stat,
  Telemetry,
  useTool,
} from "./kit";

type Preset = { id: string; label: string; text: string; hints: string[] };

type Tab = "json" | "schema";

export function SchemaExtractor({ presets }: { presets: Preset[] }) {
  const { state, run } = useTool<Record<string, unknown>, ExtractionResult>(
    "/api/tools/json-extractor",
  );

  const [text, setText] = useState(presets[0]?.text ?? "");
  const [hints, setHints] = useState((presets[0]?.hints ?? []).join(", "));
  const [tab, setTab] = useState<Tab>("json");

  const result = state.status === "success" ? state.response.data : null;
  const hintList = hints
    .split(",")
    .map((hint) => hint.trim())
    .filter(Boolean)
    .slice(0, 8);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void run({ text, hints: hintList.length > 0 ? hintList : undefined });
  }

  const jsonText = result ? JSON.stringify(result.json, null, 2) : "";
  const schemaText = result ? JSON.stringify(result.schema, null, 2) : "";

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <form onSubmit={submit}>
        <Panel
          title="Raw input"
          meta={
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.08em] text-muted">
              {text.length} chars
            </span>
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setText(preset.text);
                  setHints(preset.hints.join(", "));
                }}
                className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 font-mono text-[0.56rem] uppercase tracking-[0.08em] text-[#D4D4D8] hover:border-accent/50 hover:text-ink"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            <Field label="Document" htmlFor="extract-text">
              <textarea
                id="extract-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={12}
                className="field field-mono"
                placeholder="Paste an email, a listing, an invoice note or a support ticket…"
              />
            </Field>

            <Field
              label="Field hints (optional)"
              hint="comma separated, max 8"
              htmlFor="extract-hints"
            >
              <input
                id="extract-hints"
                value={hints}
                onChange={(event) => setHints(event.target.value)}
                className="field"
                placeholder="contact_name, budget, deadline"
              />
            </Field>

            <RunButton pending={state.status === "loading"}>Extract structure</RunButton>

            <p className="text-[0.72rem] leading-relaxed text-muted">
              Hinted fields that are absent come back empty, not invented. The schema is derived
              from the payload, so the two cannot disagree.
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
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Fields" value={String(Object.keys(result.json).length)} />
              <Stat label="Entities" value={String(result.entities.length)} />
              <Stat
                label="Validation"
                value={result.validation.valid ? "Valid" : "Invalid"}
                hint="Draft 2020-12"
              />
            </div>

            <div className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
                <div className="flex items-center gap-1.5">
                  {(
                    [
                      ["json", "JSON"],
                      ["schema", "JSON Schema"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`rounded-full border px-2.5 py-1 font-mono text-[0.54rem] uppercase tracking-[0.08em] ${
                        tab === key
                          ? "border-accent/50 bg-accent/10 text-accent"
                          : "border-line text-[#D4D4D8] hover:text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 font-mono text-[0.52rem] uppercase tracking-[0.08em] ${
                      result.validation.valid
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                        : "border-red-400/30 bg-red-400/10 text-red-200"
                    }`}
                  >
                    {result.validation.valid ? "Schema valid" : "Schema invalid"}
                  </span>
                  <CopyButton value={tab === "json" ? jsonText : schemaText} />
                </div>
              </div>

              <pre className="scroll-x max-h-[26rem] overflow-y-auto p-4 font-mono text-[0.72rem] leading-relaxed text-[#D4D4D8]">
                {tab === "json" ? jsonText : schemaText}
              </pre>
            </div>

            {result.validation.errors.length > 0 ? (
              <ul className="space-y-1 rounded-[8px] border border-red-400/25 bg-red-400/[0.06] p-3">
                {result.validation.errors.map((error) => (
                  <li key={error} className="font-mono text-[0.7rem] text-red-200">
                    {error}
                  </li>
                ))}
              </ul>
            ) : null}

            <Panel title="Confidence notes">
              <ul className="space-y-2">
                {result.confidence.map((entry) => (
                  <li key={entry.field} className="text-[0.78rem] leading-relaxed text-[#C4C4CC]">
                    <span className="font-mono text-[0.7rem] text-[#D4D4D8]">{entry.field}</span>
                    <span className="ml-2 font-mono text-[0.6rem] text-accent">
                      {Math.round(entry.confidence * 100)}%
                    </span>
                    <span className="mt-0.5 block text-[0.72rem] text-muted">{entry.note}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-line pt-3 text-[0.78rem] leading-relaxed text-[#C4C4CC]">
                {result.summary}
              </p>
              {result.notes.map((note) => (
                <p key={note} className="mt-2 text-[0.72rem] leading-relaxed text-muted">
                  {note}
                </p>
              ))}
            </Panel>
          </>
        ) : (
          <div className="card p-6">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
              Waiting for input
            </p>
            <p className="mt-3 max-w-md text-[0.88rem] leading-relaxed text-[#C4C4CC]">
              Paste a document, or load one of the four samples. You get strict JSON, the JSON
              Schema that describes it, and a validation result you can check yourself.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
