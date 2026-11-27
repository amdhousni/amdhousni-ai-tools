import {
  analyseFit,
  analyseFitWithModel,
  estimateTokens,
  isLlmConfigured,
  jdFitInputSchema,
  resolveLlmConfig,
} from "@amdhousni/core";
import { handleTool } from "@/lib/handle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleTool(request, {
    route: "jd-fit-analyzer",
    schema: jdFitInputSchema,
    run: async (input, context) => {
      // The score is always computed here; the model may only rewrite evidence.
      const base = analyseFit(input.jobDescription);
      const config = resolveLlmConfig();

      if (isLlmConfigured(config)) {
        const live = await analyseFitWithModel(input, base, {
          config,
          signal: context.signal,
        });

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
        inputTokens: estimateTokens(input.jobDescription),
        outputTokens: 0,
      };
    },
  });
}
