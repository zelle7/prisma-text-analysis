#!/usr/bin/env node
import pLimit from "p-limit";
import { runPrismaAnalysis } from "../src/prisma/agent.js";
import { loadWorkbookRows, saveWorkbook, writeResult } from "../src/prisma/excel.js";
import { scrapeUrls } from "../src/prisma/scrape.js";

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const input = getArg("--input") ?? "docs/Zellot_PRISMA-Checkliste.xlsx";
  const output = getArg("--output") ?? "docs/Zellot_PRISMA-Checkliste.filled.xlsx";
  const limitArg = Number(getArg("--limit") ?? "0");

  const { workbook, worksheet, rows } = await loadWorkbookRows(input);
  const selectedRows = limitArg > 0 ? rows.slice(0, limitArg) : rows;
  const limit = pLimit(1);

  console.log(`Loaded ${rows.length} candidate rows from ${input}`);
  console.log(`Processing ${selectedRows.length} row(s)`);

  for (const row of selectedRows) {
    await limit(async () => {
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
    });
  }

  await saveWorkbook(workbook, output);
  console.log(`Wrote: ${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
