import { AuthStorage, createAgentSession, ModelRegistry, SessionManager, SettingsManager } from "@earendil-works/pi-coding-agent";
import { prismaAgentResultSchema } from "./schema.js";
import { buildPrismaPrompt } from "./prompts.js";
import type { EvidenceDocument, PrismaAgentResult, PrismaRowInput } from "./types.js";

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON object found in model output: ${text.slice(0, 500)}`);
  return match[0];
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

async function resolveModel() {
  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);
  const models = await modelRegistry.getAvailable();
  if (models.length === 0) throw new Error("No pi models available. Configure ~/.pi/agent/auth.json or provider API keys.");

  const requested = process.env.PRISMA_PI_MODEL;
  const model = requested
    ? models.find((entry) => `${entry.provider}/${entry.id}` === requested || entry.id === requested)
    : models[0];

  if (!model) throw new Error(`Requested model not found: ${requested}`);
  return { authStorage, modelRegistry, model };
}

export async function runPrismaAnalysis(row: PrismaRowInput, evidence: EvidenceDocument[]): Promise<PrismaAgentResult> {
  const settingsManager = SettingsManager.inMemory({
    compaction: { enabled: false },
  });
  const { authStorage, modelRegistry, model } = await resolveModel();
  console.log(`  using model: ${model.provider}/${model.id}`);

  const { session } = await createAgentSession({
    cwd: process.cwd(),
    model,
    authStorage,
    modelRegistry,
    tools: [],
    sessionManager: SessionManager.inMemory(process.cwd()),
    settingsManager,
  });

  try {
    let output = "";
    session.subscribe((event) => {
      if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
        output += event.assistantMessageEvent.delta;
      }
      if (event.type === "agent_end") {
        console.log("  agent finished");
      }
    });

    await withTimeout(session.prompt(buildPrismaPrompt(row, evidence)), 90000, "pi analysis");
    const parsed = JSON.parse(extractJson(output));
    return prismaAgentResultSchema.parse(parsed);
  } finally {
    session.dispose();
  }
}
