import {
  estimateTokens,
  extractDeterministic,
  extractWithModel,
  isLlmConfigured,
  jsonExtractorInputSchema,
  resolveLlmConfig,
} from "@amdhousni/core";
import { handleTool } from "@/lib/handle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleTool(request, {
    route: "json-extractor",
    schema: jsonExtractorInputSchema,
    run: async (input, context) => {
      const config = resolveLlmConfig();

      if (isLlmConfigured(config)) {
        const live = await extractWithModel(input, { config, signal: context.signal });
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

      const data = extractDeterministic(input);
      return {
        mode: "deterministic-fallback" as const,
        model: "deterministic",
        data,
        inputTokens: estimateTokens(input.text),
        outputTokens: 0,
      };
    },
  });
}
