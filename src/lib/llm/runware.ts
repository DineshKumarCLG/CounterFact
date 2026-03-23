import { v4 as uuidv4 } from "uuid";

const RUNWARE_API_URL = "https://api.runware.ai/v1";

interface RunwareImageResult {
  imageURL: string;
  imageUUID: string;
}

/**
 * Generate an image using Runware's API.
 * Uses FLUX model (runware:101@1) for high-quality, realistic output.
 * Returns the image URL or null if generation fails / no API key.
 */
export async function generateImage(
  prompt: string,
  options: { width?: number; height?: number; negativePrompt?: string } = {}
): Promise<string | null> {
  const apiKey = process.env.RUNWARE_API_KEY;
  if (!apiKey) {
    console.warn("[Runware] No RUNWARE_API_KEY set — skipping image generation");
    return null;
  }

  const modelId = process.env.RUNWARE_MODEL_ID || "runware:101@1";
  const { width = 1024, height = 576, negativePrompt } = options;

  const task: Record<string, unknown> = {
    taskType: "imageInference",
    taskUUID: uuidv4(),
    outputType: "URL",
    outputFormat: "jpg",
    positivePrompt: prompt,
    model: modelId,
    width,
    height,
    steps: 30,
    CFGScale: 7,
    numberResults: 1,
  };

  if (negativePrompt) {
    task.negativePrompt = negativePrompt;
  }

  try {
    const res = await fetch(RUNWARE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify([task]),
    });

    if (!res.ok) {
      console.warn(`[Runware] API error ${res.status}: ${await res.text()}`);
      return null;
    }

    const json = await res.json();
    const result = json?.data?.[0] as RunwareImageResult | undefined;
    return result?.imageURL ?? null;
  } catch (err) {
    console.warn("[Runware] Image generation failed:", err);
    return null;
  }
}

/**
 * Generate multiple images from visual prompt descriptions.
 * Returns a map of description → image URL.
 */
export async function generateVisualPromptImages(
  prompts: { description: string; type?: string }[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Generate up to 4 images per simulation to keep costs reasonable
  const limited = prompts.slice(0, 4);

  for (const p of limited) {
    const enhancedPrompt = buildRealisticPrompt(p.description, p.type);
    const url = await generateImage(enhancedPrompt, {
      width: 1024,
      height: 576,
      negativePrompt: "cartoon, anime, illustration, drawing, painting, sketch, low quality, blurry, watermark, text, logo, artificial, CGI, 3D render",
    });
    if (url) {
      results.set(p.description, url);
    }
  }

  return results;
}

/**
 * Enhance a visual prompt description for photorealistic output
 */
function buildRealisticPrompt(description: string, type?: string): string {
  const style = "photorealistic, editorial photography, high resolution, natural lighting, cinematic composition, 8k, detailed";

  if (type === "map") {
    return `${description}, satellite view, geographic visualization, ${style}`;
  }
  if (type === "chart" || type === "diagram") {
    return `${description}, infographic style, clean data visualization, modern design, dark background, ${style}`;
  }
  return `${description}, ${style}`;
}
