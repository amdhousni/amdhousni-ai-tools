"use client";

import { useCallback, useState, type ReactNode } from "react";

export type ToolMode = "live" | "deterministic-fallback";

export type ToolMeta = {
  latencyMs: number;
  model: string;
  estimatedTokens: { input: number; output: number };
  estimatedCostUsd: number;
  rateLimitRemaining: number;
};

export type ToolSuccess<T> = {
  ok: true;
  mode: ToolMode;
  meta: ToolMeta;
  data: T;
};

type ErrorPayload = { ok: false; error: string; message: string };

export type ToolState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; response: ToolSuccess<T> }
  | { status: "error"; message: string; retryAfter?: number };

export function useTool<TInput, TData>(path: string) {
  const [state, setState] = useState<ToolState<TData>>({ status: "idle" });

  const run = useCallback(
    async (input: TInput) => {
      setState({ status: "loading" });

      try {
        const response = await fetch(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        });

        const payload = (await response.json().catch(() => null)) as
          | ToolSuccess<TData>
          | ErrorPayload
          | null;

        if (!response.ok || !payload || payload.ok !== true) {
          const message =
            payload && payload.ok === false
              ? payload.message
              : `The endpoint returned ${response.status}.`;
          const retryAfter = Number(response.headers.get("retry-after") ?? "");
          setState({
            status: "error",
            message,
            retryAfter: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
          });
          return;
        }

        setState({ status: "success", response: payload });
      } catch {
        setState({
          status: "error",
          message: "Could not reach the tool endpoint. Check your connection and try again.",
        });
      }
    },
    [path],
  );

  return { state, run };
}

export function ModeBadge({ mode, model }: { mode: ToolMode; model: string }) {
  const live = mode === "live";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.1em] ${
        live
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
          : "border-amber-400/30 bg-amber-400/10 text-amber-200"
      }`}
    >
      <span aria-hidden className="h-1 w-1 rounded-full bg-current" />
      {live ? "Live model" : "Deterministic fallback"}
      <span className="opacity-60">· {model}</span>
    </span>
  );
}

export function Telemetry({ mode, meta }: { mode: ToolMode; meta: ToolMeta }) {
  const cells = [
    { label: "Latency", value: `${meta.latencyMs} ms` },
    {
      label: "Tokens",
      value: `${meta.estimatedTokens.input} in · ${meta.estimatedTokens.output} out`,
    },
    {
      label: "Est. cost",
      value:
        meta.estimatedCostUsd === 0 ? "$0.000000" : `$${meta.estimatedCostUsd.toFixed(6)}`,
    },
    { label: "Rate limit left", value: String(meta.rateLimitRemaining) },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3">
      <ModeBadge mode={mode} model={meta.model} />
      {cells.map((cell) => (
        <p
          key={cell.label}
          className="font-mono text-[0.58rem] uppercase tracking-[0.08em] text-muted"
        >
          {cell.label} <span className="ml-1 text-[#D4D4D8]">{cell.value}</span>
        </p>
      ))}
    </div>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[#D4D4D8]"
        >
          {label}
        </label>
        {hint ? <span className="text-[0.7rem] text-muted">{hint}</span> : null}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function ErrorNote({ message, retryAfter }: { message: string; retryAfter?: number }) {
  return (
    <p
      role="alert"
      className="rounded-[8px] border border-red-400/30 bg-red-400/10 px-3.5 py-3 text-[0.82rem] leading-relaxed text-red-200"
    >
      {message}
      {retryAfter ? ` Retry in ${retryAfter}s.` : ""}
    </p>
  );
}

export function CopyButton({ value, label = "Copy JSON" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-full border border-line bg-white/[0.03] px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-[#D4D4D8] transition-colors hover:border-white/30 hover:text-ink"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[8px] border border-line bg-[#0B0B0E] px-3.5 py-3">
      <p className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1.5 text-[1.05rem] font-medium tracking-[-0.02em] text-ink">{value}</p>
      {hint ? <p className="mt-1 text-[0.7rem] leading-snug text-muted">{hint}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  meta,
  children,
  className = "",
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-4 md:p-5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <h3 className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">{title}</h3>
        {meta}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function RunButton({
  pending,
  children,
  onClick,
  type = "submit",
}: {
  pending: boolean;
  children: ReactNode;
  onClick?: () => void;
  type?: "submit" | "button";
}) {
  return (
    <button type={type} onClick={onClick} disabled={pending} className="btn btn-signal">
      {pending ? "Running…" : children}
      {pending ? null : <span aria-hidden>↗</span>}
    </button>
  );
}
