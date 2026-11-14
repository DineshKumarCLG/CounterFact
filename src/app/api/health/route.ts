import { CONFIG } from "@/lib/engine/config";

export async function GET() {
  const provider = (process.env.LLM_PROVIDER ?? "bedrock").toLowerCase();
  let model = CONFIG.bedrock.modelId;
  if (provider === "gemini") {
    model = process.env.GEMINI_MODEL_ID ?? "gemini-2.0-flash";
  } else if (provider === "openrouter") {
    model = process.env.OPENROUTER_MODEL_ID ?? "anthropic/claude-3.5-sonnet";
  }

  return Response.json({
    status: "ok",
    version: CONFIG.prompts.version,
    provider,
    model,
    timestamp: new Date().toISOString(),
  });
}
