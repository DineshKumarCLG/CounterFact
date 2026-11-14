import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { CONFIG } from "../engine/config";

const promptCache = new Map<string, string>();

/**
 * Load a prompt file from the versioned prompts directory
 */
export function loadPrompt(name: string, version?: string): string {
  const ver = version || CONFIG.prompts.version;
  const cacheKey = `${ver}/${name}`;

  if (promptCache.has(cacheKey)) {
    return promptCache.get(cacheKey)!;
  }

  const candidatePaths = [
    join(process.cwd(), CONFIG.prompts.basePath, ver, `${name}.md`),
    join(process.cwd(), "src/lib/prompts", ver, `${name}.md`),
    join(__dirname, "../prompts", ver, `${name}.md`),
    join(__dirname, "../../prompts", ver, `${name}.md`),
  ];

  for (const filePath of candidatePaths) {
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8");
        promptCache.set(cacheKey, content);
        return content;
      } catch {
        // Continue to next candidate
      }
    }
  }

  throw new Error(`Prompt file not found for ${name} (${ver}). Searched paths: ${candidatePaths.join(", ")}`);
}
