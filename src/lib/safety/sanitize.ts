/**
 * Sanitise user scenario input before passing to agents.
 * Strips markdown formatting, code blocks, HTML tags, and
 * excessive whitespace that could confuse or inject into prompts.
 */
export function sanitizeScenarioInput(raw: string): string {
  let text = raw;

  // Strip fenced code blocks (```...```)
  text = text.replace(/```[\s\S]*?```/g, "");

  // Strip inline code (`...`)
  text = text.replace(/`[^`]*`/g, "");

  // Strip HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Strip markdown headings
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Strip markdown bold/italic markers
  text = text.replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1");
  text = text.replace(/_{1,3}([^_]+)_{1,3}/g, "$1");

  // Strip markdown links, keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Strip markdown images
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

  // Collapse multiple newlines
  text = text.replace(/\n{3,}/g, "\n\n");

  // Collapse multiple spaces
  text = text.replace(/ {2,}/g, " ");

  // Trim
  text = text.trim();

  // Length cap — 2000 chars max for scenario input
  if (text.length > 2000) {
    text = text.slice(0, 2000).trimEnd() + "…";
  }

  return text;
}
