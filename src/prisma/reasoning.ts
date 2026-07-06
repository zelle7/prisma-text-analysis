import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { EvidenceDocument, PrismaAgentResult, PrismaRowInput } from "./types.js";

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
