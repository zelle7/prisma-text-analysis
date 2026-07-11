import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { EvidenceDocument, PrismaAgentResult, PrismaRowInput } from "./types.js";

function sanitizeArtifactName(input: string): string {
  return input.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

function safeName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function writeReasoningFile(baseDir: string, row: PrismaRowInput, result: PrismaAgentResult, evidence: EvidenceDocument[]): string {
  const fileName = `${String(row.rowNumber).padStart(3, "0")}-${safeName(row.programName || "row")}.json`;
  const outputPath = join(baseDir, fileName);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        row,
        result,
        evidence,
        writtenAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return outputPath;
}

export function writeEvidenceArtifacts(baseDir: string, row: PrismaRowInput, evidence: EvidenceDocument[]): EvidenceDocument[] {
  const rowDir = join(baseDir, `${String(row.rowNumber).padStart(3, "0")}-${safeName(row.programName || "row")}`);
  mkdirSync(rowDir, { recursive: true });

  return evidence.map((doc, index) => {
    const extension = doc.contentType?.includes("pdf") || /\.pdf($|\?)/i.test(doc.finalUrl ?? doc.url)
      ? ".txt"
      : doc.contentType?.includes("html")
        ? ".txt"
        : ".txt";
    const fileName = `${String(index + 1).padStart(2, "0")}-${sanitizeArtifactName(doc.title || doc.finalUrl || doc.url || "evidence")}${extension}`;
    const artifactPath = join(rowDir, fileName);
    const content = [
      `URL: ${doc.url}`,
      doc.finalUrl ? `Final URL: ${doc.finalUrl}` : undefined,
      doc.title ? `Title: ${doc.title}` : undefined,
      doc.contentType ? `Content-Type: ${doc.contentType}` : undefined,
      doc.sourceType ? `Source-Type: ${doc.sourceType}` : undefined,
      doc.relevanceHint ? `Relevance: ${doc.relevanceHint}` : undefined,
      doc.error ? `Error: ${doc.error}` : undefined,
      "",
      doc.text,
    ]
      .filter((value) => value !== undefined)
      .join("\n");
    writeFileSync(artifactPath, `${content}\n`, "utf8");
    return { ...doc, artifactPath };
  });
}
