import Link from "next/link";
import { hireUrl, liveToolsUrl, repoUrl } from "@/lib/site";

const tools = [
  {
    href: "/tools/token-cost-estimator",
    index: "01",
    category: "Economics",
    name: "LLM Token & Cost Estimator",
    line: "Size a prompt, check the context window, price the month across eleven model tiers.",
  },
  {
    href: "/tools/json-schema-extractor",
    index: "02",
    category: "Extraction",
    name: "Structured JSON & Schema Extractor",
    line: "Turn an email or invoice into valid JSON plus the JSON Schema that describes it.",
  },
  {
    href: "/tools/jd-fit-analyzer",
    index: "03",
    category: "Hiring",
    name: "Role / JD Fit & Gap Analyzer",
    line: "Coverage against a real profile, with the gaps named honestly.",
  },
  {
    href: "/tools/rag-inspector",
    index: "04",
    category: "Retrieval",
    name: "RAG & Context Q&A Inspector",
    line: "See what retrieval returned, with citations, scores and a refusal threshold.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden className="hairline-grid absolute inset-0 opacity-60" />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.16),transparent_65%)]"
        />
        <div className="shell relative py-16 md:py-24">
          <p className="eyebrow">Open source · MIT · four working tools</p>
          <h1 className="mt-5 max-w-[24ch] text-[clamp(2.4rem,6vw,4.4rem)] font-medium leading-[0.98] text-ink">
            AI tools you can inspect, not just look at.
          </h1>
          <p className="mt-6 max-w-2xl text-[1rem] leading-[1.75] text-[#C4C4CC]">
            Four tools that exercise the same work as the production systems on amdhousni.com:
            validated endpoints, a rate limiter, a real model call that can time out, and a
            deterministic fallback that says so. Every response carries its latency, token count and
            cost.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/tools" className="btn btn-signal px-6 py-3.5">
              Open the four tools
              <span aria-hidden>↗</span>
            </Link>
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost px-6 py-3.5"
            >
              View source on GitHub
              <span aria-hidden>↗</span>
            </a>
          </div>

          <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-4 border-t border-line pt-6 font-mono text-[0.58rem] uppercase tracking-[0.12em] sm:grid-cols-4">
            {[
              ["Tools", "04"],
              ["Endpoints", "04"],
              ["Unit tests", "60"],
              ["Fallback", "Always"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted">{label}</dt>
                <dd className="mt-1.5 text-[0.95rem] tracking-[-0.01em] text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-b border-line bg-canvas-deep">
        <div className="shell py-14 md:py-20">
          <div className="grid gap-3 md:grid-cols-2">
            {tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group card flex flex-col justify-between p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 md:p-7"
              >
                <div>
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-accent">
                    {tool.index} · {tool.category}
                  </span>
                  <h2 className="mt-4 text-[1.2rem] font-medium leading-snug text-ink">
                    {tool.name}
                  </h2>
                  <p className="mt-2 text-[0.86rem] leading-relaxed text-[#C4C4CC]">{tool.line}</p>
                </div>
                <span className="mt-6 inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink group-hover:text-accent">
                  Open the tool
                  <span aria-hidden>↗</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-4 rounded-[12px] border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-[0.9rem] leading-relaxed text-[#C4C4CC]">
              The same four tools run on{" "}
              <a className="text-ink underline decoration-accent/50 underline-offset-4" href={liveToolsUrl}>
                amdhousni.com/tools
              </a>
              , alongside the case studies and the certificates.
            </p>
            <a
              href={hireUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost shrink-0"
            >
              Hire Me
              <span aria-hidden>↗</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
