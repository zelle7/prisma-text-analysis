import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { PrismaAgentResult, PrismaRowInput } from "./types.js";

export interface ReviewQueueEntry {
  rowNumber: number;
  programName: string;
  confidence: PrismaAgentResult["confidence"];
  finalDecision?: PrismaAgentResult["finalDecision"];
  phase2Decision: PrismaAgentResult["phase2"]["entscheidung"];
  notes?: string[];
  reasoningPath: string;
}

export interface ReviewQueueFile {
  updatedAt: string;
  entries: ReviewQueueEntry[];
}

export function shouldQueueForReview(result: PrismaAgentResult): boolean {
  return result.confidence === "niedrig" || Boolean(result.notes?.length);
}

export function appendReviewQueue(path: string, row: PrismaRowInput, result: PrismaAgentResult, reasoningPath: string): void {
  const queue: ReviewQueueFile = existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf8")) as ReviewQueueFile)
    : { updatedAt: new Date().toISOString(), entries: [] };

  queue.entries = queue.entries.filter((entry) => entry.rowNumber !== row.rowNumber);
  queue.entries.push({
    rowNumber: row.rowNumber,
    programName: row.programName,
    confidence: result.confidence,
    finalDecision: result.finalDecision,
    phase2Decision: result.phase2.entscheidung,
    notes: result.notes,
    reasoningPath,
  });
  queue.updatedAt = new Date().toISOString();
  queue.entries.sort((a, b) => a.rowNumber - b.rowNumber);
  writeFileSync(path, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
}
