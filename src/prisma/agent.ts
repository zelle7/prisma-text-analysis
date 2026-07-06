import { createAgentSession, SessionManager, SettingsManager } from "@earendil-works/pi-coding-agent";
import { prismaAgentResultSchema } from "./schema.js";
import { buildPrismaPrompt } from "./prompts.js";
import type { EvidenceDocument, PrismaAgentResult, PrismaRowInput } from "./types.js";

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in model output");
  return match[0];
}

export async function runPrismaAnalysis(row: PrismaRowInput, evidence: EvidenceDocument[]): Promise<PrismaAgentResult> {
  const settingsManager = SettingsManager.inMemory({
    compaction: { enabled: false },
  });

  const { session } = await createAgentSession({
    cwd: process.cwd(),
    tools: ["read", "bash", "grep", "find", "ls"],
    sessionManager: SessionManager.inMemory(process.cwd()),
    settingsManager,
  });

  try {
    let output = "";
    session.subscribe((event) => {
      if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
        output += event.assistantMessageEvent.delta;
      }
    });

    await session.prompt(buildPrismaPrompt(row, evidence));
    const parsed = JSON.parse(extractJson(output));
    return prismaAgentResultSchema.parse(parsed);
  } finally {
    session.dispose();
  }
}
