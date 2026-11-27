/**
 * The candidate profile.
 *
 * Two rules make this file trustworthy:
 *   1. Every skill carries the concrete artefact that evidences it. A skill
 *      with no artefact is not listed here — it is listed in `marketSkills`
 *      below with `profileSkillId: null`, which is how an honest gap is named.
 *   2. Certificates are title + issuer + domain tags only. There are no
 *      credential URLs, verification links, badge embeds or credential IDs in
 *      this package, by design.
 */

export type SkillCategory = "AI & retrieval" | "Full-stack" | "Data" | "Delivery" | "Product";

export type ProfileSkill = {
  id: string;
  label: string;
  category: SkillCategory;
  /** Lower-case fragments matched against a job description. */
  keywords: string[];
  /** What on amdhousni.com actually backs the claim. */
  evidence: string[];
};

export type ProfileCertificate = {
  title: string;
  issuer: string;
  tags: string[];
};

export const certificates: ProfileCertificate[] = [
  {
    title: "IBM RAG and Agentic AI",
    issuer: "IBM · Coursera",
    tags: ["RAG", "Agents", "Vector search", "Tool use"],
  },
  {
    title: "IBM Generative AI Engineering",
    issuer: "IBM · Coursera",
    tags: ["LLMs", "Prompt engineering", "Fine-tuning", "GenAI apps"],
  },
  {
    title: "IBM AI Engineering",
    issuer: "IBM · Coursera",
    tags: ["Machine learning", "Deep learning", "ML pipelines"],
  },
  {
    title: "IBM Full Stack Software",
    issuer: "IBM · Coursera",
    tags: ["Full stack", "Cloud native", "APIs", "React"],
  },
  {
    title: "IBM DevOps and Software Engineering",
    issuer: "IBM · Coursera",
    tags: ["CI/CD", "Containers", "Linux", "Agile delivery"],
  },
  {
    title: "Wild Code School — Data Analytics",
    issuer: "Wild Code School",
    tags: ["SQL", "Python", "Data analysis", "Visualisation"],
  },
];

export const profileSkills: ProfileSkill[] = [
  {
    id: "rag",
    label: "RAG & retrieval pipelines",
    category: "AI & retrieval",
    keywords: ["rag", "retrieval", "retrieval-augmented", "grounding", "grounded", "citation"],
    evidence: [
      "RAG & Context Q&A Inspector on /tools: chunking with overlap, per-chunk relevance, citation validation and an explicit refusal path.",
      "IBM RAG and Agentic AI certificate covers retrieval-augmented generation, chunking and embeddings.",
    ],
  },
  {
    id: "llm",
    label: "LLM application engineering",
    category: "AI & retrieval",
    keywords: ["llm", "large language model", "generative ai", "genai", "chat completions", "openai"],
    evidence: [
      "Every model-backed tool on /tools calls an OpenAI-compatible endpoint with a 15s abort timeout and a validated response contract.",
      "IBM Generative AI Engineering certificate covers model application patterns and prompt-to-product engineering.",
    ],
  },
  {
    id: "agents",
    label: "AI agents & tool calling",
    category: "AI & retrieval",
    keywords: ["agent", "agentic", "tool calling", "function calling", "mcp"],
    evidence: [
      "IBM RAG and Agentic AI certificate: agent workflows that call tools under explicit control.",
      "DevProp's AI assistant runs inside the CRM workflow rather than as a detached chat box.",
    ],
  },
  {
    id: "prompt-eval",
    label: "Prompt design & evaluation",
    category: "AI & retrieval",
    keywords: ["prompt", "evaluation", "eval", "guardrail", "hallucination"],
    evidence: [
      "Each tool returns a typed envelope that labels live vs deterministic output, and rejects model output that fails schema validation.",
      "The RAG inspector refuses when top-chunk relevance falls below a published threshold instead of answering anyway.",
    ],
  },
  {
    id: "embeddings",
    label: "Embeddings & vector search",
    category: "AI & retrieval",
    keywords: ["embedding", "vector", "semantic search", "pgvector", "cosine", "rerank"],
    evidence: [
      "IBM RAG and Agentic AI certificate covers embeddings and vector search.",
      "The RAG inspector implements cosine similarity over provider embeddings and a BM25 path when no embedding model is configured.",
    ],
  },
  {
    id: "typescript",
    label: "TypeScript",
    category: "Full-stack",
    keywords: ["typescript", "ts"],
    evidence: [
      "This monorepo, amdhousni.com and the tools hub are strict TypeScript end to end.",
      "IBM Full Stack Software certificate covers cloud-native full-stack delivery.",
    ],
  },
  {
    id: "nextjs",
    label: "Next.js",
    category: "Full-stack",
    keywords: ["next.js", "nextjs", "next", "app router", "server components"],
    evidence: [
      "amdhousni.com is a Next.js 15 App Router site with server-rendered pages and route handlers.",
      "This monorepo serves four tool pages and four validated API routes from one Next.js app.",
    ],
  },
  {
    id: "react",
    label: "React",
    category: "Full-stack",
    keywords: ["react", "hooks", "jsx", "tsx"],
    evidence: [
      "All interactive tool interfaces are React client components with typed props.",
      "IBM Full Stack Software certificate includes React front-end delivery.",
    ],
  },
  {
    id: "nodejs",
    label: "Node.js",
    category: "Full-stack",
    keywords: ["node", "node.js", "runtime"],
    evidence: [
      "Server-side tool engines, rate limiting and provider calls run on the Node runtime.",
      "IBM Full Stack Software certificate covers server-side APIs.",
    ],
  },
  {
    id: "nestjs",
    label: "NestJS",
    category: "Full-stack",
    keywords: ["nest", "nestjs"],
    evidence: [
      "DevProp's API — enquiries, pipeline, contracts and commissions — is built with NestJS.",
    ],
  },
  {
    id: "postgres",
    label: "PostgreSQL",
    category: "Full-stack",
    keywords: ["postgres", "postgresql", "relational database"],
    evidence: [
      "DevProp's tenant-scoped CRM data model (enquiries, pipeline, contracts, commission ledger) is PostgreSQL.",
      "SQL and relational modelling are also covered by the Wild Code School Data Analytics programme.",
    ],
  },
  {
    id: "api",
    label: "REST APIs & contracts",
    category: "Full-stack",
    keywords: ["rest", "api", "openapi", "endpoint", "webhook"],
    evidence: [
      "Four POST endpoints here validate input with Zod, cap body size and return a typed envelope.",
      "DevProp ingests LINE Official Account and WhatsApp webhooks into a normalised enquiry record.",
    ],
  },
  {
    id: "auth",
    label: "Authentication & authorisation",
    category: "Full-stack",
    keywords: ["authentication", "authorisation", "authorization", "rbac", "oauth", "jwt", "session"],
    evidence: [
      "DevProp enforces agency-level data isolation and role-based access across the CRM.",
    ],
  },
  {
    id: "multitenant",
    label: "Multi-tenant SaaS",
    category: "Full-stack",
    keywords: ["multi-tenant", "multitenant", "tenant", "saas", "b2b"],
    evidence: [
      "DevProp.io is a self-serve, tenant-scoped SaaS where one enquiry record carries messaging, pipeline, contracts and commissions.",
      "VividProp.io and PropMatch.co extend the same product family.",
    ],
  },
  {
    id: "python",
    label: "Python",
    category: "Data",
    keywords: ["python", "pandas", "numpy", "notebook"],
    evidence: [
      "Wild Code School Data Analytics programme: Python and SQL for practical data analysis.",
      "IBM AI Engineering certificate covers model training and evaluation workflows.",
    ],
  },
  {
    id: "sql",
    label: "SQL & analytics",
    category: "Data",
    keywords: ["sql", "analytics", "reporting", "bigquery", "data analysis"],
    evidence: [
      "Wild Code School Data Analytics certificate: querying operational data and turning it into something a business can read.",
      "DevProp reports pipeline, lead sources, team performance and commissions from relational data.",
    ],
  },
  {
    id: "docker",
    label: "Docker & containers",
    category: "Delivery",
    keywords: ["docker", "container", "image", "compose"],
    evidence: [
      "amdhousni.com ships a Dockerfile and a standalone Next.js runtime image.",
      "IBM DevOps and Software Engineering certificate covers containers.",
    ],
  },
  {
    id: "cicd",
    label: "CI/CD",
    category: "Delivery",
    keywords: ["ci/cd", "cicd", "continuous integration", "continuous delivery", "github actions", "pipeline"],
    evidence: [
      "This repository runs typecheck, lint, tests and a production build on every push through GitHub Actions.",
      "IBM DevOps and Software Engineering certificate covers delivery pipelines.",
    ],
  },
  {
    id: "cloudflare",
    label: "Edge & cloud delivery",
    category: "Delivery",
    keywords: ["cloudflare", "edge", "cdn", "dns", "cloud", "deployment"],
    evidence: [
      "Production sites for the portfolio and the property platforms run behind Cloudflare with DNS, TLS and caching managed there.",
    ],
  },
  {
    id: "tailwind",
    label: "Tailwind CSS",
    category: "Product",
    keywords: ["tailwind", "utility css", "design system"],
    evidence: [
      "The portfolio and this monorepo share one token-based Tailwind design system (obsidian surfaces, orange signal).",
    ],
  },
  {
    id: "seo",
    label: "Technical SEO",
    category: "Product",
    keywords: ["seo", "structured data", "schema.org", "sitemap", "indexation", "metadata"],
    evidence: [
      "amdhousni.com ships canonicals, Open Graph metadata, a sitemap and robots rules per route.",
      "Bilingual EN/TH platform delivery included listing distribution and technical SEO in production.",
    ],
  },
  {
    id: "performance",
    label: "Web performance",
    category: "Product",
    keywords: ["performance", "core web vitals", "lighthouse", "latency", "bundle size"],
    evidence: [
      "The portfolio is server-rendered with image optimisation and a measured Lighthouse pass on the published build.",
    ],
  },
  {
    id: "accessibility",
    label: "Accessibility",
    category: "Product",
    keywords: ["accessibility", "a11y", "wcag", "contrast", "screen reader"],
    evidence: [
      "The portfolio and tools use a contrast-checked palette (AA or better), visible focus rings and labelled controls.",
    ],
  },
];

/**
 * Vocabulary used to read a job description.
 *
 * Entries without `profileSkillId` are skills this profile does NOT evidence.
 * They exist so a gap can be named honestly instead of quietly ignored.
 */
export type MarketSkill = {
  id: string;
  label: string;
  category: SkillCategory;
  keywords: string[];
  profileSkillId: string | null;
  /** Extra weight for skills that usually decide a hiring decision. */
  weight: number;
};

export const marketSkills: MarketSkill[] = [
  ...profileSkills.map((skill) => ({
    id: skill.id,
    label: skill.label,
    category: skill.category,
    keywords: skill.keywords,
    profileSkillId: skill.id,
    weight: 1,
  })),
  {
    id: "fine-tuning",
    label: "Model fine-tuning",
    category: "AI & retrieval",
    keywords: ["fine-tuning", "finetuning", "lora", "rlhf"],
    profileSkillId: null,
    weight: 1,
  },
  {
    id: "langchain",
    label: "LangChain / LlamaIndex",
    category: "AI & retrieval",
    keywords: ["langchain", "llamaindex", "llama index"],
    profileSkillId: null,
    weight: 0.8,
  },
  {
    id: "graphql",
    label: "GraphQL",
    category: "Full-stack",
    keywords: ["graphql", "apollo"],
    profileSkillId: null,
    weight: 0.8,
  },
  {
    id: "go",
    label: "Go",
    category: "Full-stack",
    keywords: ["golang", "go"],
    profileSkillId: null,
    weight: 0.8,
  },
  {
    id: "kubernetes",
    label: "Kubernetes",
    category: "Delivery",
    keywords: ["kubernetes", "k8s", "helm"],
    profileSkillId: null,
    weight: 0.8,
  },
  {
    id: "terraform",
    label: "Terraform / IaC",
    category: "Delivery",
    keywords: ["terraform", "infrastructure as code", "pulumi"],
    profileSkillId: null,
    weight: 0.8,
  },
  {
    id: "observability",
    label: "Observability",
    category: "Delivery",
    keywords: ["observability", "opentelemetry", "datadog", "sentry", "tracing"],
    profileSkillId: null,
    weight: 0.8,
  },
];

export const categoryWeights: Record<SkillCategory, number> = {
  "AI & retrieval": 1.2,
  "Full-stack": 1.2,
  Data: 1,
  Delivery: 1,
  Product: 0.8,
};

export const profile = {
  name: "Ahmed Housni",
  title: "Full-Stack & AI Engineer",
  location: "Bangkok, Thailand · UTC+7",
  availability: "Open to Full-Stack & AI Engineering roles",
  summary:
    "Full-stack and AI engineer who designs RAG pipelines, LLM and agent workflows and multi-tenant SaaS, then operates them in production: schema, API, interface, deployment and the work after launch.",
  links: {
    site: "https://amdhousni.com",
    tools: "https://amdhousni.com/tools",
    github: "https://github.com/amdhousni",
    linkedin: "https://www.linkedin.com/in/amdhousni/",
  },
  experience: [
    {
      company: "PropMatch.co",
      role: "IT Lead & AI Systems Engineer",
      since: "April 2025",
    },
  ],
  projects: [
    {
      name: "DevProp.io",
      role: "Founder",
      description:
        "Tenant-scoped real-estate CRM: messaging ingestion, pipeline, contracts and a commission ledger resolving to one record per enquiry.",
      stack: ["Next.js", "NestJS", "TypeScript", "PostgreSQL", "LINE OA"],
    },
    {
      name: "VividProp.io",
      role: "Founder",
      description: "Property marketing and listing distribution platform.",
      stack: ["Next.js", "TypeScript", "Cloudflare"],
    },
    {
      name: "PropMatch.co",
      role: "IT Lead & AI Systems Engineer",
      description: "Property matching platform for international buyers.",
      stack: ["Next.js", "TypeScript", "PostgreSQL"],
    },
    {
      name: "Vectoria.ma",
      role: "Founder",
      description: "WebGL-driven brand site and storefront.",
      stack: ["WebGL", "Next.js", "Tailwind CSS"],
    },
    {
      name: "Websiam.io",
      role: "Founder",
      description: "Agency site and delivery pipeline for client platforms.",
      stack: ["Next.js", "Tailwind CSS", "Docker"],
    },
  ],
  certificates,
} as const;

export function getProfileSkill(id: string): ProfileSkill | undefined {
  return profileSkills.find((skill) => skill.id === id);
}
