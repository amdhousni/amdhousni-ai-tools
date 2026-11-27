"use client";

import { useState } from "react";
import type { RagResult } from "@amdhousni/core";
import {
  ErrorNote,
  Field,
  Panel,
  RunButton,
  Stat,
  Telemetry,
  useTool,
} from "./kit";

type Sample = { id: string; label: string; context: string };

export function RagInspector({ samples }: { samples: Sample[] }) {
  const { state, run } = useTool<Record<string, unknown>, RagResult>(
    "/api/tools/rag-inspector",
  );

  const [context, setContext] = useState(samples[0]?.context ?? "");
  const [question, setQuestion] = useState(
    "How does the chunker decide where a chunk ends, and what does the overlap protect?",
  );
  const [chunkSize, setChunkSize] = useState(160);
  const [chunkOverlap, setChunkOverlap] = useState(32);
  const [topK, setTopK] = useState(4);

  const result = state.status === "success" ? state.response.data : null;
  const best = result?.chunks[0]?.score ?? 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void run({ context, question, chunkSize, chunkOverlap, topK });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit}>
        <Panel title="Source & question">
          <div className="flex flex-wrap gap-1.5">
            {samples.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => setContext(sample.context)}
                className="rounded-full border border-line bg-white/[0.03] px-2.5 py-1 font-mono text-[0.56rem] uppercase tracking-[0.08em] text-[#D4D4D8] hover:border-accent/50 hover:text-ink"
              >
                {sample.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Field label="Context" hint={`${context.length} chars`} htmlFor="rag-context">
              <textarea
                id="rag-context"
                value={context}
                onChange={(event) => setContext(event.target.value)}
                rows={11}
                className="field field-mono"
              />
            </Field>

            <div className="space-y-4">
              <Field label="Question" htmlFor="rag-question">
                <textarea
                  id="rag-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={3}
                  className="field"
                />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Chunk" htmlFor="rag-size">
                  <input
                    id="rag-size"
                    type="number"
                    min={40}
                    max={800}
                    step={20}
                    value={chunkSize}
                    onChange={(event) => setChunkSize(Number(event.target.value) || 160)}
                    className="field"
                  />
                </Field>
                <Field label="Overlap" htmlFor="rag-overlap">
                  <input
                    id="rag-overlap"
                    type="number"
                    min={0}
                    max={400}
                    step={8}
                    value={chunkOverlap}
                    onChange={(event) => setChunkOverlap(Number(event.target.value) || 0)}
                    className="field"
                  />
                </Field>
                <Field label="Top K" htmlFor="rag-topk">
                  <input
                    id="rag-topk"
                    type="number"
                    min={1}
                    max={8}
                    value={topK}
                    onChange={(event) => setTopK(Number(event.target.value) || 4)}
                    className="field"
                  />
                </Field>
              </div>

              <RunButton pending={state.status === "loading"}>Inspect retrieval</RunButton>
            </div>
          </div>
        </Panel>
      </form>

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
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Chunks" value={String(result.chunks.length)} hint={`size ${result.chunkSize}`} />
            <Stat label="Overlap" value={`${result.chunkOverlap}`} hint="tokens" />
            <Stat
              label="Top score"
              value={best.toFixed(3)}
              hint={`threshold ${result.threshold}`}
            />
            <Stat
              label="Retrieval"
              value={result.retrieval === "bm25" ? "BM25" : "Embeddings"}
              hint={result.method === "model" ? "answer: model" : "answer: extractive"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <Panel
              title="Grounded answer"
              meta={
                <span
                  className={`rounded-full border px-2.5 py-1 font-mono text-[0.52rem] uppercase tracking-[0.08em] ${
                    result.refused
                      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                      : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  }`}
                >
                  {result.refused ? "Refused" : "Supported"}
                </span>
              }
            >
              <p className="text-[0.92rem] leading-relaxed text-ink">{result.answer}</p>

              {result.citations.length > 0 ? (
                <ul className="mt-4 space-y-2 border-t border-line pt-4">
                  {result.citations.map((citation) => (
                    <li key={citation.chunkId}>
                      <p className="font-mono text-[0.56rem] uppercase tracking-[0.1em] text-accent">
                        {citation.chunkId}
                      </p>
                      <p className="mt-1 text-[0.76rem] leading-relaxed text-[#C4C4CC]">
                        “{citation.quote}”
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="mt-4 border-t border-line pt-3 text-[0.74rem] leading-relaxed text-muted">
                {result.note}
              </p>
            </Panel>

            <Panel
              title="Ranked chunks"
              meta={
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.08em] text-muted">
                  top {result.topK}
                </span>
              }
            >
              <ul className="space-y-3">
                {result.chunks.map((chunk) => (
                  <li
                    key={chunk.id}
                    className={`rounded-[8px] border p-3 ${
                      chunk.selected
                        ? "border-accent/30 bg-accent/[0.05]"
                        : "border-line bg-[#0B0B0E]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[0.6rem] uppercase tracking-[0.08em] text-[#D4D4D8]">
                        {chunk.id} · rank {chunk.rank}
                      </span>
                      <span
                        className={`font-mono text-[0.6rem] ${
                          chunk.score >= result.threshold ? "text-emerald-300" : "text-muted"
                        }`}
                      >
                        {chunk.score.toFixed(3)}
                      </span>
                    </div>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.min(100, Math.max(2, chunk.score * 100))}%` }}
                      />
                    </div>
                    <p className="mt-2 line-clamp-3 text-[0.76rem] leading-relaxed text-[#C4C4CC]">
                      {chunk.excerpt}
                    </p>
                    <p className="mt-2 font-mono text-[0.54rem] uppercase tracking-[0.08em] text-muted">
                      {chunk.tokens} tokens · {chunk.selected ? "selected" : "below cut-off"}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      ) : (
        <div className="card p-6">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
            Waiting for input
          </p>
          <p className="mt-3 max-w-lg text-[0.88rem] leading-relaxed text-[#C4C4CC]">
            Load one of the source samples and ask a question. The inspector shows what retrieval
            returned, the relevance of each chunk, and refuses when the evidence is too weak.
          </p>
        </div>
      )}
    </div>
  );
}
