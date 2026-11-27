import { describe, expect, it } from "vitest";
import {
  analyseFit,
  certificates,
  fitPresets,
  jdFitInputSchema,
  marketSkills,
  profile,
  profileSkills,
} from "../src";

const fullStackJd = `Senior Full-Stack Engineer

Requirements
- TypeScript, React and Next.js in production
- PostgreSQL data modelling and REST APIs
- Authentication and multi-tenant SaaS experience
- Docker and CI/CD ownership
- Kubernetes and Terraform are used here every day
- GraphQL gateway experience`;

describe("analyseFit", () => {
  const result = analyseFit(fullStackJd);

  it("scores coverage between 0 and 100", () => {
    expect(result.coverageScore).toBeGreaterThanOrEqual(0);
    expect(result.coverageScore).toBeLessThanOrEqual(100);
  });

  it("matches evidenced skills with concrete profile evidence", () => {
    const skills = result.matchedSkills.map((match) => match.skill);
    expect(skills).toContain("TypeScript");
    expect(skills).toContain("PostgreSQL");
    expect(result.matchedSkills.every((match) => match.evidence.length > 20)).toBe(true);
  });

  it("names genuine gaps instead of inferring transferable experience", () => {
    const gaps = result.gaps.map((gap) => gap.skill);
    expect(gaps).toContain("Kubernetes");
    expect(gaps).toContain("Terraform / IaC");
    expect(gaps).toContain("GraphQL");
    expect(result.gaps.every((gap) => gap.why.length > 20)).toBe(true);
  });

  it("produces interview angles for the matched categories", () => {
    expect(result.interviewAngles.length).toBeGreaterThan(0);
    expect(result.interviewAngles.length).toBeLessThanOrEqual(4);
  });

  it("returns a useful note when the description has no requirements", () => {
    const empty = analyseFit("We are a friendly team looking for someone curious.");
    expect(empty.coverageScore).toBe(0);
    expect(empty.note).toContain("No recognised engineering requirements");
  });

  it("scores the AI/RAG preset above the pure infrastructure requirements", () => {
    const preset = fitPresets.find((item) => item.id === "ai-rag-engineer");
    expect(preset).toBeDefined();
    if (!preset) return;

    const parsed = jdFitInputSchema.parse({ jobDescription: preset.text });
    const aiResult = analyseFit(parsed.jobDescription);

    expect(aiResult.coverageScore).toBeGreaterThan(40);
    expect(aiResult.matchedSkills.map((match) => match.skill)).toContain(
      "RAG & retrieval pipelines",
    );
    expect(aiResult.gaps.map((gap) => gap.skill)).toContain("LangChain / LlamaIndex");
  });
});

describe("profile integrity", () => {
  it("lists exactly the six agreed certificates, by name and issuer", () => {
    expect(certificates.map((certificate) => certificate.title)).toEqual([
      "IBM RAG and Agentic AI",
      "IBM Generative AI Engineering",
      "IBM AI Engineering",
      "IBM Full Stack Software",
      "IBM DevOps and Software Engineering",
      "Wild Code School — Data Analytics",
    ]);
    expect(certificates.every((certificate) => certificate.issuer.length > 0)).toBe(true);
  });

  it("publishes no credential URL, verification link or credential id", () => {
    const serialised = JSON.stringify(profile).toLowerCase();
    expect(serialised).not.toContain("coursera.org/verify");
    expect(serialised).not.toContain("credential");
    expect(serialised).not.toContain("verify");
    expect(serialised).not.toContain("badge");
  });

  it("gives every advertised skill at least one piece of evidence", () => {
    expect(profileSkills.length).toBeGreaterThanOrEqual(20);
    expect(profileSkills.every((skill) => skill.evidence.length > 0)).toBe(true);
  });

  it("only exposes skills that exist in the profile through the taxonomy", () => {
    for (const skill of marketSkills) {
      if (skill.profileSkillId === null) continue;
      expect(profileSkills.some((item) => item.id === skill.profileSkillId)).toBe(true);
    }
  });
});
