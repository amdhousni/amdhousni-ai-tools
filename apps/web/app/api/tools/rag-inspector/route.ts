import {
  answerWithModel,
  chunkText,
  embedTexts,
  estimateTokens,
  inspectContext,
  isLlmConfigured,
  ragInspectorInputSchema,
  resolveLlmConfig,
} from "@amdhousni/core";
import { handleTool } from "@/lib/handle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleTool(request, {
    route: "rag-inspector",
    schema: ragInspectorInputSchema,
    run: async (input, context) => {
      const config = resolveLlmConfig();

      let vectors: number[][] | undefined;
      if (isLlmConfigured(config) && config.embeddingsModel) {
        const texts = chunkText(input.context, input.chunkSize, input.chunkOverlap);
        const embedded = await embedTexts([...texts, input.question], config, context.signal);
        // Cosine over vectors when the provider answers; BM25 when it does not.
        if (embedded) vectors = embedded;
      }

      const base = inspectContext(input, { vectors });

      if (isLlmConfigured(config)) {
        const live = await answerWithModel(input, base, { config, signal: context.signal });
        if (live && "result" in live) {
          return {
            mode: "live" as const,
            model: live.usage.model,
            data: live.result,
            inputTokens: live.usage.inputTokens,
            outputTokens: live.usage.outputTokens,
          };
        }
      }

      return {
        mode: "deterministic-fallback" as const,
        model: "deterministic",
        data: base,
        inputTokens: estimateTokens(input.context),
        outputTokens: 0,
      };
    },
  });
}
