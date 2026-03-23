import { readFileSync } from "fs";
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

  const filePath = join(
    process.cwd(),
    CONFIG.prompts.basePath,
    ver,
    `${name}.md`
  );

  try {
    const content = readFileSync(filePath, "utf-8");
    promptCache.set(cacheKey, content);
    return content;
  } catch {
    throw new Error(`Prompt file not found: ${filePath}`);
  }
}
