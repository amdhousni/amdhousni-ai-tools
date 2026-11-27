import Link from "next/link";
import { hireUrl, sourceUrl } from "@/lib/site";

export function ToolHeader({
  index,
  category,
  title,
  tagline,
  description,
  endpoint,
  modeLabel,
  sourcePath,
}: {
  index: string;
  category: string;
  title: string;
  tagline: string;
  description: string;
  endpoint: string;
  modeLabel: string;
  sourcePath: string;
}) {
  return (
    <header className="border-b border-line bg-canvas">
      <div className="shell py-10 md:py-14">
        <Link
          href="/tools"
          className="mono text-[0.6rem] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
        >
          ← All four tools
        </Link>

        <div className="mt-7 grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-accent">
                {index} · {category}
              </span>
              <span className="chip">{modeLabel}</span>
            </div>

            <h1 className="mt-5 max-w-[26ch] text-[clamp(1.9rem,4.4vw,3rem)] font-medium leading-[1.04] text-ink">
              {title}
            </h1>
            <p className="mt-4 max-w-xl text-[1rem] leading-relaxed text-[#C4C4CC]">{tagline}</p>
            <p className="mt-3 max-w-xl text-[0.88rem] leading-relaxed text-muted">{description}</p>
          </div>

          <dl className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <dt className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-muted">
                Endpoint
              </dt>
              <dd className="mono text-[0.66rem] text-[#D4D4D8]">POST {endpoint}</dd>
            </div>
            <div className="pt-3">
              <dt className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-muted">
                Engine
              </dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                <span className="chip">packages/core</span>
                <span className="chip">Zod envelope</span>
                <span className="chip">Sliding-window limit</span>
              </dd>
            </div>
            <a
              href={sourceUrl(sourcePath)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-accent hover:text-accent-bright"
            >
              View source on GitHub
              <span aria-hidden>↗</span>
            </a>
          </dl>
        </div>
      </div>
    </header>
  );
}

export function UnderTheHood({
  requestPath,
  stack,
  validation,
  tradeoffs,
  sourcePath,
}: {
  requestPath: string[];
  stack: string[];
  validation: string;
  tradeoffs: string[];
  sourcePath: string;
}) {
  return (
    <section className="border-t border-line bg-canvas">
      <div className="shell py-12 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div>
            <p className="eyebrow">Under the hood</p>
            <h2 className="mt-4 text-[1.7rem] font-medium leading-tight text-ink">
              How this one actually works.
            </h2>
            <p className="mt-3 max-w-md text-[0.9rem] leading-relaxed text-[#C4C4CC]">
              The request path, the validation and the parts that are deliberately limited. If
              something here is a shortcut, it is documented as one.
            </p>

            <p className="mt-6 font-mono text-[0.58rem] uppercase tracking-[0.12em] text-muted">
              Stack
            </p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {stack.map((item) => (
                <li key={item} className="chip">
                  {item}
                </li>
              ))}
            </ul>

            <a
              href={sourceUrl(sourcePath)}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-accent hover:text-accent-bright"
            >
              View source on GitHub
              <span aria-hidden>↗</span>
            </a>
          </div>

          <div className="space-y-3">
            <details open className="group card p-5">
              <summary className="flex cursor-pointer items-center justify-between gap-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[#D4D4D8]">
                Request path
                <span aria-hidden className="text-accent transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <ol className="mt-4 space-y-2.5">
                {requestPath.map((step, index) => (
                  <li
                    key={step}
                    className="flex gap-3 text-[0.85rem] leading-relaxed text-[#D4D4D8]"
                  >
                    <span className="font-mono text-[0.6rem] text-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </details>

            <details className="group card p-5">
              <summary className="flex cursor-pointer items-center justify-between gap-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[#D4D4D8]">
                Validation &amp; fallback
                <span aria-hidden className="text-accent transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-4 text-[0.85rem] leading-relaxed text-[#D4D4D8]">{validation}</p>
            </details>

            <details className="group card p-5">
              <summary className="flex cursor-pointer items-center justify-between gap-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-[#D4D4D8]">
                Published trade-offs
                <span aria-hidden className="text-accent transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <ul className="mt-4 space-y-2.5">
                {tradeoffs.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-[0.85rem] leading-relaxed text-[#C4C4CC]"
                  >
                    <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 rounded-[12px] border border-accent/30 bg-accent/[0.06] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-accent">
              Built by Ahmed Housni — open to Full-Stack &amp; AI roles
            </p>
            <p className="mt-2 max-w-xl text-[0.92rem] leading-relaxed text-ink">
              If you want this kind of work — validated endpoints, retrieval that cites itself,
              honest failure paths — the fastest next step is a conversation.
            </p>
          </div>
          <a
            href={hireUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-signal shrink-0"
          >
            Hire Me
            <span aria-hidden>↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
