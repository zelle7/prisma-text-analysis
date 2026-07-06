#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import pLimit from "p-limit";
import { markCheckpoint, loadCheckpoint, saveCheckpoint, isCheckpointDone } from "../src/prisma/checkpoint.js";
import { runPrismaAnalysis } from "../src/prisma/agent.js";
import { loadWorkbookRows, saveWorkbook, writeResult } from "../src/prisma/excel.js";
import { writeReasoningFile } from "../src/prisma/reasoning.js";
import { appendReviewQueue, shouldQueueForReview } from "../src/prisma/review.js";
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
  const reasoningDir = getArg("--reasoning-dir") ?? "artifacts/reasoning";
  const reviewQueuePath = getArg("--review-queue") ?? "artifacts/review-queue.json";
  const requestedModel = getArg("--model");
  const limitArg = Number(getArg("--limit") ?? "0");
  const force = hasFlag("--force");
  const resumeErrors = hasFlag("--retry-errors");

  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;
  let reviewCount = 0;

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
  const skippedCount = rows.length - filteredRows.length;
  const limit = pLimit(1);

  mkdirSync(reasoningDir, { recursive: true });

  console.log(`Loaded ${rows.length} candidate rows from ${input}`);
  console.log(`Eligible rows after skip logic: ${filteredRows.length}`);
  console.log(`Processing ${selectedRows.length} row(s)`);
  console.log(`Checkpoint: ${checkpointPath}`);
  console.log(`Reasoning dir: ${reasoningDir}`);
  console.log(`Review queue: ${reviewQueuePath}`);
  if (requestedModel) console.log(`Requested model: ${requestedModel}`);

  for (const row of selectedRows) {
    await limit(async () => {
      try {
        processedCount += 1;
        console.log(`Processing row ${row.rowNumber}: ${row.programName}`);
        console.log(`  urls: ${row.urls.length ? row.urls.join(", ") : "none"}`);
        const evidence = await scrapeUrls(row.urls);
        console.log(`  scraped: ${evidence.length} document(s)`);
        for (const doc of evidence) {
          console.log(`    - ${doc.url} :: ${doc.error ? `ERROR ${doc.error}` : `${doc.text.length} chars`}`);
        }
        const filteredEvidence = evidence.filter((doc) => doc.relevanceHint !== "generic");
        console.log(`  relevant evidence: ${filteredEvidence.length}/${evidence.length}`);
        const result = await runPrismaAnalysis(row, filteredEvidence.length ? filteredEvidence : evidence, requestedModel);
        console.log(`  result: ${result.phase2.entscheidung} / ${result.finalDecision ?? "n/a"} / confidence=${result.confidence}`);
        writeResult(worksheet, row.rowNumber, result);
        const reasoningPath = writeReasoningFile(reasoningDir, row, result, filteredEvidence.length ? filteredEvidence : evidence);
        console.log(`  reasoning: ${reasoningPath}`);
        if (shouldQueueForReview(result)) {
          appendReviewQueue(reviewQueuePath, row, result, reasoningPath);
          reviewCount += 1;
          console.log(`  queued for review`);
        }
        successCount += 1;
        markCheckpoint(checkpoint, row.rowNumber, row.programName, "done");
        saveCheckpoint(checkpointPath, checkpoint);
        await saveWorkbook(workbook, output);
      } catch (error) {
        errorCount += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  ERROR row ${row.rowNumber}: ${message}`);
        markCheckpoint(checkpoint, row.rowNumber, row.programName, "error", message);
        saveCheckpoint(checkpointPath, checkpoint);
      }
    });
  }

  await saveWorkbook(workbook, output);
  console.log(`Wrote: ${output}`);
  console.log("\nSummary:");
  console.log(`- total rows loaded: ${rows.length}`);
  console.log(`- skipped before run: ${skippedCount}`);
  console.log(`- attempted this run: ${selectedRows.length}`);
  console.log(`- processed: ${processedCount}`);
  console.log(`- succeeded: ${successCount}`);
  console.log(`- errored: ${errorCount}`);
  console.log(`- queued for review: ${reviewCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
