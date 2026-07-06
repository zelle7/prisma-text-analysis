import { existsSync, readFileSync, writeFileSync } from "node:fs";

export interface CheckpointEntry {
  rowNumber: number;
  status: "done" | "error";
  programName: string;
  updatedAt: string;
  error?: string;
}

export interface CheckpointFile {
  input: string;
  output: string;
  entries: Record<string, CheckpointEntry>;
}

export function loadCheckpoint(path: string, input: string, output: string): CheckpointFile {
  if (!existsSync(path)) {
    return { input, output, entries: {} };
  }

  const parsed = JSON.parse(readFileSync(path, "utf8")) as CheckpointFile;
  return {
    input,
    output,
    entries: parsed.entries ?? {},
  };
}

export function saveCheckpoint(path: string, checkpoint: CheckpointFile): void {
  writeFileSync(path, `${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");
}

export function markCheckpoint(
  checkpoint: CheckpointFile,
  rowNumber: number,
  programName: string,
  status: "done" | "error",
  error?: string,
): void {
  checkpoint.entries[String(rowNumber)] = {
    rowNumber,
    programName,
    status,
    updatedAt: new Date().toISOString(),
    ...(error ? { error } : {}),
  };
}

export function isCheckpointDone(checkpoint: CheckpointFile, rowNumber: number): boolean {
  return checkpoint.entries[String(rowNumber)]?.status === "done";
}
