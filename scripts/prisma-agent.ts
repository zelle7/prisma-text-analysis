#!/usr/bin/env node
import pLimit from "p-limit";
import { markCheckpoint, loadCheckpoint, saveCheckpoint, isCheckpointDone } from "../src/prisma/checkpoint.js";
import { runPrismaAnalysis } from "../src/prisma/agent.js";
import { loadWorkbookRows, saveWorkbook, writeResult } from "../src/prisma/excel.js";
import { scrapeUrls } from "../src/prisma/scrape.js";

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main(): Promise<void> {
  const input = getArg("--input") ?? "docs/Zellot_PRISMA-Checkliste.xlsx";
  const output = getArg("--output") ?? "docs/Zellot_PRISMA-Checkliste.filled.xlsx";
  const checkpointPath = getArg("--checkpoint") ?? ".prisma-checkpoint.json";
  const limitArg = Number(getArg("--limit") ?? "0");
  const force = hasFlag("--force");
  const resumeErrors = hasFlag("--retry-errors");

  const { workbook, worksheet, rows } = await loadWorkbookRows(input);
  const checkpoint = loadCheckpoint(checkpointPath, input, output);

  const filteredRows = rows.filter((row) => {
    if (force) return true;
    if (row.existingDecision || row.existingReason) return false;
    if (isCheckpointDone(checkpoint, row.rowNumber)) return false;
    if (!resumeErrors && checkpoint.entries[String(row.rowNumber)]?.status === "error") return false;
    return true;
  });

  const selectedRows = limitArg > 0 ? filteredRows.slice(0, limitArg) : filteredRows;
  const limit = pLimit(1);

  console.log(`Loaded ${rows.length} candidate rows from ${input}`);
  console.log(`Eligible rows after skip logic: ${filteredRows.length}`);
  console.log(`Processing ${selectedRows.length} row(s)`);
  console.log(`Checkpoint: ${checkpointPath}`);

  for (const row of selectedRows) {
    await limit(async () => {
      try {
        console.log(`Processing row ${row.rowNumber}: ${row.programName}`);
        console.log(`  urls: ${row.urls.length ? row.urls.join(", ") : "none"}`);
        const evidence = await scrapeUrls(row.urls);
        console.log(`  scraped: ${evidence.length} document(s)`);
        for (const doc of evidence) {
          console.log(`    - ${doc.url} :: ${doc.error ? `ERROR ${doc.error}` : `${doc.text.length} chars`}`);
        }
        const result = await runPrismaAnalysis(row, evidence);
        console.log(`  result: ${result.phase2.entscheidung} / ${result.finalDecision ?? "n/a"}`);
        writeResult(worksheet, row.rowNumber, result);
        markCheckpoint(checkpoint, row.rowNumber, row.programName, "done");
        saveCheckpoint(checkpointPath, checkpoint);
        await saveWorkbook(workbook, output);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  ERROR row ${row.rowNumber}: ${message}`);
        markCheckpoint(checkpoint, row.rowNumber, row.programName, "error", message);
        saveCheckpoint(checkpointPath, checkpoint);
      }
    });
  }

  await saveWorkbook(workbook, output);
  console.log(`Wrote: ${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
