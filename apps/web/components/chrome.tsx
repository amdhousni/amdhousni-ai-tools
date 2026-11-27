import Link from "next/link";
import { hireUrl, repoUrl, siteUrl } from "@/lib/site";

const nav = [
  { label: "The four tools", href: "/tools" },
  { label: "Portfolio", href: siteUrl, external: true },
  { label: "GitHub", href: repoUrl, external: true },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-md bg-accent font-mono text-[0.7rem] font-bold text-[#09090B]"
          >
            AH
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[0.9rem] font-medium tracking-[-0.01em] text-ink">
              Ahmed Housni
            </span>
            <span className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-muted">
              AI tools · open source
            </span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {nav.map((item) =>
            "external" in item && item.external ? (
              <a
                key={item.label}
                href={item.href}
                className="text-[0.82rem] text-body transition-colors hover:text-ink"
                rel="noreferrer"
                target="_blank"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="text-[0.82rem] text-body transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <a href={hireUrl} className="btn btn-signal" rel="noreferrer" target="_blank">
          Hire Me
          <span aria-hidden>↗</span>
        </a>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-canvas-deep">
      <div className="shell py-12">
        <div className="flex flex-col gap-6 rounded-[12px] border border-accent/30 bg-accent/[0.06] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-accent">
              Built by Ahmed Housni
            </p>
            <p className="mt-2 max-w-xl text-[0.92rem] leading-relaxed text-ink">
              Open to Full-Stack &amp; AI Engineering roles. These four tools are the smallest
              honest sample of the work: validated endpoints, real fallbacks and published
              trade-offs.
            </p>
          </div>
          <a href={hireUrl} className="btn btn-signal shrink-0" rel="noreferrer" target="_blank">
            Start a conversation
            <span aria-hidden>↗</span>
          </a>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 text-[0.78rem] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em]">
            MIT licensed · built like product, not like a demo
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <a className="hover:text-ink" href={siteUrl} rel="noreferrer" target="_blank">
              amdhousni.com
            </a>
            <a className="hover:text-ink" href={repoUrl} rel="noreferrer" target="_blank">
              View source ↗
            </a>
            <Link className="hover:text-ink" href="/tools">
              All tools
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
