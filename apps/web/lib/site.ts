export const repoUrl =
  process.env.NEXT_PUBLIC_REPO_URL?.trim() || "https://github.com/amdhousni/amdhousni-ai-tools";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://amdhousni.com";

export const hireUrl = `${siteUrl}/contact?topic=Full-time+role`;

export const liveToolsUrl = `${siteUrl}/tools`;

export function sourceUrl(path: string): string {
  return `${repoUrl}/tree/main/${path.replace(/^\/+/, "")}`;
}

export const toolSourcePaths: Record<string, string> = {
  "token-cost-estimator": "packages/core/src/tools/token-estimator",
  "json-schema-extractor": "packages/core/src/tools/json-extractor",
  "jd-fit-analyzer": "packages/core/src/tools/jd-fit-analyzer",
  "rag-inspector": "packages/core/src/tools/rag-inspector",
};
