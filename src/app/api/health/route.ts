import { CONFIG } from "@/lib/engine/config";

export async function GET() {
  return Response.json({
    status: "ok",
    version: CONFIG.prompts.version,
    model: CONFIG.bedrock.modelId,
    timestamp: new Date().toISOString(),
  });
}
