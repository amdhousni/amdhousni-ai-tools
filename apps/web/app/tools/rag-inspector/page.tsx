import type { Metadata } from "next";
import { ragSamples } from "@amdhousni/core";
import { ToolHeader, UnderTheHood } from "@/components/tool-frame";
import { RagInspector } from "@/components/tools/rag-inspector";
import { toolSourcePaths } from "@/lib/site";

export const metadata: Metadata = {
  title: "RAG & Context Q&A Inspector",
  description:
    "Chunk context with overlap, score every chunk against the question, answer with inline citations and refuse when the evidence is too weak. BM25 by default, embeddings when configured.",
  alternates: { canonical: "/tools/rag-inspector" },
};

const source = toolSourcePaths["rag-inspector"];

export default function RagInspectorPage() {
  return (
    <>
      <ToolHeader
        index="03"
        category="Retrieval"
        title="RAG & Context Q&A Inspector"
        tagline="See what retrieval actually returned before you trust the answer."
        description="Chunk size, overlap and top-k are controls, not constants. Every chunk shows its relevance score and token count, every citation points at a real chunk id, and weak evidence produces a refusal instead of a guess."
        endpoint="/api/tools/rag-inspector"
        modeLabel="Live answer · BM25 fallback"
        sourcePath={source}
      />

      <section className="border-b border-line bg-canvas-deep">
        <div className="shell py-10 md:py-14">
          <RagInspector samples={ragSamples} />
        </div>
      </section>

      <UnderTheHood
        sourcePath={source}
        requestPath={[
          "The context is split on sentence boundaries into chunks of the requested token size, with a measured overlap carried from the previous chunk.",
          "Each chunk is scored against the question: BM25 by default, or cosine similarity over provider embeddings when LLM_EMBEDDINGS_MODEL is configured.",
          "Scores are normalised to 0–1 and the top-k chunks above the threshold are selected; below the threshold the inspector refuses.",
          "With a key, only the selected chunks are sent to the model, which must cite chunk ids it was given — unknown ids are dropped before rendering.",
          "Without a key, an extractive answer returns the best-matching sentence per selected chunk, with the same citations and the same refusal rule.",
        ]}
        stack={[
          "Token-aware chunker",
          "BM25 / cosine",
          "Zod envelope",
          "Citation whitelist",
          "Extractive fallback",
        ]}
        validation="The request is validated for chunk bounds and top-k, the model must return a typed answer with citations, and every cited id is checked against the chunks actually sent. A citation that points nowhere is removed rather than displayed."
        tradeoffs={[
          "Chunking is structure-aware only in the sense of sentence boundaries; production pipelines should split on headings, tables and document metadata.",
          "BM25 is lexical: it misses paraphrases a vector index would catch, which is exactly why the retrieval mode is labelled in the UI.",
          "The refusal threshold is a fixed 0.18 on a normalised score — a useful default, not a tuned value for a specific corpus.",
          "Embeddings are only used when an embedding model is configured; otherwise the tool stays lexical instead of pretending to be semantic.",
        ]}
      />
    </>
  );
}
