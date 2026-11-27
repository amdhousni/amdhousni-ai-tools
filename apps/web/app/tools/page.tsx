import type { Metadata } from "next";
import Link from "next/link";
import { hireUrl, repoUrl, sourceUrl, toolSourcePaths } from "@/lib/site";

export const metadata: Metadata = {
  title: "The four AI tools",
  description:
    "Token and cost estimation, structured JSON extraction, JD fit analysis and a RAG context inspector — each with a validated endpoint, a deterministic fallback and published trade-offs.",
  alternates: { canonical: "/tools" },
};

const tools = [
  {
    slug: "token-cost-estimator",
    index: "01",
    category: "Economics",
    name: "LLM Token & Cost Estimator",
    description:
      "Estimate prompt and output tokens, see how much of each model's context window the call consumes, and price a month of traffic before choosing a tier. Deterministic: no key, no bill.",
    outputs: ["Token estimate", "Context fit", "Monthly cost"],
    href: "/tools/token-cost-estimator",
    recruiter: false,
  },
  {
    slug: "json-schema-extractor",
    index: "02",
    category: "Extraction",
    name: "Structured JSON & Schema Extractor",
    description:
      "Paste an email, a listing, an invoice note or a ticket. Get strict JSON plus the JSON Schema that describes it, with the payload validated against that schema before it renders.",
    outputs: ["Structured JSON", "JSON Schema", "Confidence notes"],
    href: "/tools/json-schema-extractor",
    recruiter: false,
  },
  {
    slug: "rag-inspector",
    index: "03",
    category: "Retrieval",
    name: "RAG & Context Q&A Inspector",
    description:
      "Split context into chunks with overlap, score every chunk against the question, answer with inline citations, and refuse when nothing clears the relevance threshold.",
    outputs: ["Grounded answer", "Per-chunk scores", "Refusal path"],
    href: "/tools/rag-inspector",
    recruiter: false,
  },
  {
    slug: "jd-fit-analyzer",
    index: "04",
    category: "Hiring",
    name: "Role / JD Fit & Gap Analyzer",
    description:
      "Read a job description against a real profile: weighted coverage, the evidence behind each match, and the gaps stated plainly. The score is computed, never generated.",
    outputs: ["Coverage score", "Matched skills", "Genuine gaps"],
    href: "/tools/jd-fit-analyzer",
    recruiter: true,
  },
];

const buildNotes = [
  {
    title: "One envelope, always",
    body: "Every endpoint returns ok, mode, meta and data — validated by the same Zod schema, so the UI can never render an unlabelled answer.",
  },
  {
    title: "A limiter that degrades",
    body: "Sliding window per IP, shared through Redis when REDIS_URL is set, in memory otherwise, with Retry-After and X-RateLimit-* headers.",
  },
  {
    title: "Fallback, not failure",
    body: "If the key is missing or the provider times out at 15s, the deterministic engine answers and the badge changes to say so.",
  },
];

export default function ToolsHubPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden className="hairline-grid absolute inset-0 opacity-50" />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-28 -top-24 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.16),transparent_65%)]"
        />
        <div className="shell relative py-14 md:py-20">
          <p className="eyebrow">Free AI tools</p>
          <h1 className="mt-5 max-w-[22ch] text-[clamp(2.2rem,5.6vw,4rem)] font-medium leading-[0.98] text-ink">
            AI tools you can inspect, not just look at.
          </h1>
          <p className="mt-5 max-w-2xl text-[1rem] leading-[1.75] text-[#C4C4CC]">
            Four utilities built on the same stack as the production systems on amdhousni.com. Each
            one is genuinely usable, and each one publishes how it works, what it costs and where it
            stops being reliable.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="#tools" className="btn btn-signal px-6 py-3.5">
              Jump to the four tools
              <span aria-hidden>↓</span>
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

          <p className="mt-6 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted">
            No sign-up · no storage · rate limited per IP
          </p>
        </div>
      </section>

      <section id="tools" className="scroll-mt-24 border-b border-line bg-canvas-deep">
        <div className="shell py-14 md:py-20">
          <div className="grid gap-3 md:grid-cols-2">
            {tools.map((tool) => (
              <article
                key={tool.slug}
                className={`group relative flex flex-col justify-between rounded-[12px] border p-6 transition-all duration-300 hover:-translate-y-1 md:p-7 ${
                  tool.recruiter
                    ? "border-accent/45 bg-[#20100A] hover:border-accent"
                    : "border-line bg-surface hover:border-accent/40"
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-accent">
                      {tool.index} · {tool.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {tool.recruiter ? (
                        <span className="rounded bg-accent px-2 py-1 font-mono text-[0.5rem] font-semibold uppercase tracking-[0.1em] text-[#09090B]">
                          For recruiters
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-emerald-300">
                        <span aria-hidden className="h-1 w-1 rounded-full bg-emerald-400" />
                        Live
                      </span>
                    </div>
                  </div>

                  <h2 className="mt-4 text-[1.22rem] font-medium leading-snug text-ink">
                    <Link href={tool.href} className="hover:text-accent">
                      {tool.name}
                    </Link>
                  </h2>
                  <p
                    className={`mt-2 text-[0.86rem] leading-relaxed ${
                      tool.recruiter ? "text-[#F0DCD2]" : "text-[#C4C4CC]"
                    }`}
                  >
                    {tool.description}
                  </p>

                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {tool.outputs.map((output) => (
                      <li
                        key={output}
                        className={`rounded border px-2 py-0.5 font-mono text-[0.56rem] ${
                          tool.recruiter
                            ? "border-accent/30 bg-accent/10 text-[#FFD9C7]"
                            : "border-line bg-white/[0.03] text-[#D4D4D8]"
                        }`}
                      >
                        {output}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
                  <Link
                    href={tool.href}
                    className="inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ink hover:text-accent"
                  >
                    Open the tool
                    <span aria-hidden>↗</span>
                  </Link>
                  <a
                    href={sourceUrl(toolSourcePaths[tool.slug] ?? "apps/web")}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-[0.56rem] uppercase tracking-[0.1em] text-muted hover:text-ink"
                  >
                    Source
                    <span aria-hidden>↗</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-canvas">
        <div className="shell py-14 md:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="eyebrow">Under the hood</p>
              <h2 className="mt-4 text-[clamp(1.8rem,3.6vw,2.8rem)] font-medium leading-[1.02] text-ink">
                Built like product, not like a demo.
              </h2>
              <p className="mt-4 max-w-md text-[0.93rem] leading-relaxed text-[#C4C4CC]">
                The interesting part of an AI tool is not the prompt. It is the validation, the
                failure path, the cost ceiling and whether the interface tells the truth about all
                three.
              </p>
            </div>

            <ul className="grid gap-3 sm:grid-cols-3">
              {buildNotes.map((note) => (
                <li key={note.title} className="card p-5">
                  <h3 className="text-[0.92rem] font-medium text-ink">{note.title}</h3>
                  <p className="mt-2 text-[0.82rem] leading-relaxed text-[#C4C4CC]">{note.body}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 flex flex-col gap-4 rounded-[12px] border border-accent/30 bg-accent/[0.07] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-accent">
                Built for full-stack &amp; AI engineering roles
              </p>
              <p className="mt-2 max-w-xl text-[0.92rem] leading-relaxed text-ink">
                These tools are the smallest version of the work: a validated endpoint, a model call
                that can fail, a deterministic fallback and an interface that says which one you
                got.
              </p>
            </div>
            <a href={hireUrl} target="_blank" rel="noreferrer" className="btn btn-signal shrink-0">
              Hire Me
              <span aria-hidden>↗</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
