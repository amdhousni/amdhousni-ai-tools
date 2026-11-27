import {
  fitModelOutputSchema,
  type FitPreset,
  type JdFitInput,
} from "../../contracts/tools";
import { completeJson, type LlmConfig, type LlmUsage } from "../../llm/adapter";
import {
  categoryWeights,
  marketSkills,
  profile,
  profileSkills,
  type SkillCategory,
} from "../../profile";

/**
 * The score is computed here, not by a model.
 *
 * A language model is good at phrasing evidence and finding the angle worth
 * raising; it is bad at arithmetic that has to stay stable between runs. So the
 * coverage number always comes from the weighted keyword matcher, and the model
 * only enriches the evidence lines — anything it invents about a skill that is
 * not in the matched set is dropped.
 */

export type FitMatch = {
  skill: string;
  skillId: string;
  category: SkillCategory;
  evidence: string;
};

export type FitGap = {
  skill: string;
  skillId: string;
  category: SkillCategory;
  why: string;
};

export type FitCategoryRow = {
  name: SkillCategory;
  required: number;
  matched: number;
};

export type FitResult = {
  coverageScore: number;
  requiredSkills: string[];
  matchedSkills: FitMatch[];
  gaps: FitGap[];
  interviewAngles: string[];
  categories: FitCategoryRow[];
  strengths: string[];
  note: string;
  method: "model" | "rules";
};

export type FitPresetDefinition = { id: FitPreset; label: string; text: string };

export const fitPresets: FitPresetDefinition[] = [
  {
    id: "fullstack-lead",
    label: "Full-Stack Lead",
    text: `Full-Stack Lead Engineer (Bangkok, hybrid)

We are hiring a lead engineer to own a multi-tenant SaaS product end to end.
You will design the data model in PostgreSQL, build REST APIs in Node.js and
NestJS, and ship the React/Next.js interface with the product team.

Requirements
- 6+ years building production TypeScript applications
- Strong PostgreSQL and API design skills
- Experience with authentication, RBAC and tenant isolation
- Comfortable owning CI/CD, Docker and a release process
- Experience leading code review and mentoring

Nice to have
- LLM or RAG features in a shipped product
- Cloudflare or edge deployment experience
- GraphQL`,
  },
  {
    id: "ai-rag-engineer",
    label: "AI / RAG Engineer",
    text: `AI Engineer — Retrieval & Agents (Remote, UTC+7 ± 4)

You will build RAG systems over customer documents: chunking, embeddings,
hybrid retrieval and reranking, then the answer layer with citations and a
refusal path when the evidence is weak.

Requirements
- Production experience with LLM applications and prompt design
- Embeddings and vector search (pgvector, Qdrant or similar)
- Strong Python and TypeScript
- Evaluation: measuring retrieval quality and hallucination rate
- Experience with agents and tool calling

Nice to have
- LangChain or LlamaIndex
- Fine-tuning experience
- Kubernetes`,
  },
  {
    id: "founding-engineer",
    label: "Founding Engineer",
    text: `Founding Engineer (Bangkok)

Early engineer at a seed-stage property-tech startup. You will ship the first
version of the product and keep it running: Next.js front end, Node.js API,
PostgreSQL, deployment on Cloudflare.

What we need
- Full-stack TypeScript, comfortable across the stack
- Product judgement: you talk to users and cut scope
- Docker, CI/CD and an on-call mentality
- Bonus: AI features, technical SEO, performance work

You will work directly with the founders. Equity-heavy package.`,
  },
];

function mentions(haystack: string, keyword: string): boolean {
  const normalised = keyword.trim().toLowerCase();
  if (!normalised) return false;
  if (normalised.length > 3) return haystack.includes(normalised);

  const escaped = normalised.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
}

const anglesBySkill: Record<string, string> = {
  rag: "Walk through how you measure retrieval quality — and how the system decides to refuse instead of guessing.",
  embeddings: "Ask which embedding model and index they use, and what happens when recall drops after a document update.",
  llm: "Ask how prompt changes are reviewed and rolled back when output quality regresses.",
  agents: "Ask how tool calls are bounded: timeouts, permissions and what happens when a tool fails mid-plan.",
  "prompt-eval": "Ask for the eval set behind the last prompt change, and the metric it moved.",
  multitenant: "Raise the tenant boundary and the data model: it decides whether a second customer is cheap or a rewrite.",
  auth: "Ask how authorisation is enforced at the query layer, not only in the UI.",
  postgres: "Ask about the migration path for the largest table and the rollback story.",
  api: "Ask how API contracts are versioned and validated before they reach a client.",
  cicd: "Ask what the pipeline blocks on, and how a bad deploy is reverted.",
  docker: "Ask how environments are kept identical between local, staging and production.",
  nextjs: "Ask about the rendering strategy per route and where it broke under real traffic.",
  performance: "Ask which Core Web Vitals they actually monitor, and on which devices.",
  seo: "Ask how indexation is verified after a release, beyond metadata tags.",
  accessibility: "Ask whether contrast and keyboard paths are checked in review or only after launch.",
};

const anglesByCategory: Record<SkillCategory, string> = {
  "AI & retrieval": "Ask for one production failure in an AI feature and the control that now prevents it.",
  "Full-stack": "Ask where the system boundary sits, and what the second customer would break.",
  Data: "Ask about the operational data model, not the dashboards.",
  Delivery: "Ask about the release path and the rollback story; production ownership is the differentiator.",
  Product: "Ask for a decision they reversed after talking to users.",
};

export function analyseFit(jobDescription: string): FitResult {
  const jd = jobDescription.toLowerCase();

  const required = marketSkills.filter((skill) =>
    skill.keywords.some((keyword) => mentions(jd, keyword)),
  );

  const matchedSkills: FitMatch[] = [];
  const gaps: FitGap[] = [];

  for (const skill of required) {
    const profileSkill = skill.profileSkillId
      ? profileSkills.find((item) => item.id === skill.profileSkillId)
      : undefined;

    if (profileSkill) {
      matchedSkills.push({
        skill: skill.label,
        skillId: skill.id,
        category: skill.category,
        evidence: profileSkill.evidence[0] ?? "Evidenced in the portfolio.",
      });
    } else {
      gaps.push({
        skill: skill.label,
        skillId: skill.id,
        category: skill.category,
        why: "Not claimed anywhere on amdhousni.com, so it is listed as a gap rather than inferred from adjacent work.",
      });
    }
  }

  const requiredWeight = required.reduce(
    (total, skill) => total + skill.weight * categoryWeights[skill.category],
    0,
  );
  const matchedWeight = required
    .filter((skill) => skill.profileSkillId)
    .reduce((total, skill) => total + skill.weight * categoryWeights[skill.category], 0);

  const coverageScore = requiredWeight > 0 ? Math.round((matchedWeight / requiredWeight) * 100) : 0;

  const categories: FitCategoryRow[] = (
    Object.keys(categoryWeights) as SkillCategory[]
  )
    .map((name) => {
      const inCategory = required.filter((skill) => skill.category === name);
      return {
        name,
        required: inCategory.length,
        matched: inCategory.filter((skill) => skill.profileSkillId).length,
      };
    })
    .filter((row) => row.required > 0);

  const strengths = matchedSkills
    .slice()
    .sort((a, b) => Number(Boolean(anglesBySkill[b.skillId])) - Number(Boolean(anglesBySkill[a.skillId])))
    .slice(0, 3)
    .map((match) => match.skill);

  const interviewAngles = matchedSkills
    .map((match) => anglesBySkill[match.skillId])
    .filter((angle): angle is string => Boolean(angle))
    .slice(0, 4);

  if (interviewAngles.length === 0) {
    const firstCategory = categories.find((category) => category.matched > 0);
    if (firstCategory) interviewAngles.push(anglesByCategory[firstCategory.name]);
  }

  const note =
    required.length === 0
      ? "No recognised engineering requirements were found. Paste the responsibilities and requirements sections for a useful comparison."
      : "Weighted keyword coverage against the published profile. Transferable experience is not inferred, which is why each gap is named individually.";

  return {
    coverageScore,
    requiredSkills: required.map((skill) => skill.label),
    matchedSkills,
    gaps,
    interviewAngles,
    categories,
    strengths,
    note,
    method: "rules",
  };
}

function profileContext(): string {
  const skills = profileSkills
    .map((skill) => `- ${skill.label} (${skill.category}): ${skill.evidence.join(" ")}`)
    .join("\n");
  const certificates = profile.certificates
    .map((certificate) => `- ${certificate.title} — ${certificate.issuer}`)
    .join("\n");

  return `Candidate: ${profile.name}, ${profile.title}, ${profile.location}.
${profile.summary}

Evidenced skills:
${skills}

Projects:
${profile.projects.map((project) => `- ${project.name} (${project.role}): ${project.description} Stack: ${project.stack.join(", ")}.`).join("\n")}

Certificates:
${certificates}`;
}

const SYSTEM_PROMPT = `You analyse how well a candidate matches a job description, for a recruiter who will read your output in 30 seconds.

You are given the candidate's evidenced skills and the job description. The list of matched skills has already been computed deterministically and is authoritative — do not add or remove skills from it.

Return JSON only:
{
  "coverageScore": number (0-100, echo the provided score),
  "matchedSkills": [{"skill": string, "evidence": string}],   // only skills from the provided matched list
  "gaps": [{"skill": string, "why": string}],                  // only skills from the provided gap list
  "interviewAngles": [string]                                  // 2-4 sharp technical topics for a first call
}

Rules:
- Never invent experience, clients, metrics or certifications.
- Evidence must reference something in the provided profile, in one sentence.
- Gaps must be honest and specific about what is missing, not softened.
- Interview angles must be technical questions a hiring manager can actually ask.`;

export async function analyseFitWithModel(
  input: JdFitInput,
  base: FitResult,
  options: { config: LlmConfig; signal?: AbortSignal },
): Promise<{ result: FitResult; usage: LlmUsage } | { failure: string } | null> {
  const user = [
    profileContext(),
    `Deterministic coverage score: ${base.coverageScore}`,
    `Matched skills: ${base.matchedSkills.map((match) => match.skill).join(", ") || "none"}`,
    `Gaps: ${base.gaps.map((gap) => gap.skill).join(", ") || "none"}`,
    "Job description:",
    input.jobDescription,
  ].join("\n\n");

  const response = await completeJson({
    system: SYSTEM_PROMPT,
    user,
    schema: fitModelOutputSchema,
    config: options.config,
    maxTokens: 900,
    signal: options.signal,
  });

  if (!response.ok) return { failure: response.reason };

  const evidenceBySkill = new Map(
    response.data.matchedSkills.map((entry) => [entry.skill.toLowerCase(), entry.evidence]),
  );

  const matchedSkills = base.matchedSkills.map((match) => ({
    ...match,
    evidence: evidenceBySkill.get(match.skill.toLowerCase()) ?? match.evidence,
  }));

  const whyBySkill = new Map(
    response.data.gaps.map((entry) => [entry.skill.toLowerCase(), entry.why]),
  );

  const gaps = base.gaps.map((gap) => ({
    ...gap,
    why: whyBySkill.get(gap.skill.toLowerCase()) ?? gap.why,
  }));

  // The evidence/why maps are keyed by the computed skill labels, so anything
  // the model said about a skill outside those sets is discarded by design.

  return {
    usage: response.usage,
    result: {
      ...base,
      matchedSkills,
      gaps,
      interviewAngles:
        response.data.interviewAngles.length > 0
          ? response.data.interviewAngles.slice(0, 4)
          : base.interviewAngles,
      note: "Coverage is computed deterministically from the published profile; the model only rewrote the evidence and the interview angles, and skills outside the computed sets were discarded.",
      method: "model",
    },
  };
}

/** Compact profile digest used by the tool page's "what this reads" panel. */
export const profileDigest = {
  name: profile.name,
  title: profile.title,
  location: profile.location,
  skillCount: profileSkills.length,
  certificateCount: profile.certificates.length,
  certificates: profile.certificates.map((certificate) => certificate.title),
};
