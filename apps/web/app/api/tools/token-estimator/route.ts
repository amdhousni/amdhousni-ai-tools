import { estimateTokenCost, tokenEstimatorInputSchema } from "@amdhousni/core";
import { handleTool } from "@/lib/handle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleTool(request, {
    route: "token-estimator",
    schema: tokenEstimatorInputSchema,
    run: (input) => {
      const data = estimateTokenCost(input);
      return {
        mode: "deterministic-fallback",
        model: "deterministic",
        data,
        inputTokens: data.inputTokens,
        outputTokens: 0,
      };
    },
  });
}
