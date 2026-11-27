import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/chrome";
import { siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AI Engineering Tools — Ahmed Housni",
    template: "%s — Ahmed Housni",
  },
  description:
    "Four working AI engineering tools by Ahmed Housni: token and cost estimation, structured JSON extraction, JD fit analysis and a RAG context inspector. Every endpoint validates input, falls back deterministically and publishes its trade-offs.",
  openGraph: {
    title: "AI Engineering Tools — Ahmed Housni",
    description:
      "Token economics, schema extraction, fit analysis and retrieval inspection — built like product, not like a demo.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-4 focus:py-2 focus:text-[#09090B]"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
