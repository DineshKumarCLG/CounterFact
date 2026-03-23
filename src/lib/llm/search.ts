import { search as ddgSearch } from "@navetacandra/ddg";
import type { SearchResult } from "../engine/types";
import { CONFIG } from "../engine/config";

// ─── Rate-limit queue ─────────────────────────────────────────────
const MIN_GAP_MS = 2000;
let queue: Promise<void> = Promise.resolve();
let lastRequestTime = 0;

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue = queue.then(async () => {
      const elapsed = Date.now() - lastRequestTime;
      if (elapsed < MIN_GAP_MS) {
        await new Promise((r) => setTimeout(r, MIN_GAP_MS - elapsed));
      }
      lastRequestTime = Date.now();
      try {
        resolve(await fn());
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Search via DuckDuckGo (free, no API key, no limits).
 * Uses @navetacandra/ddg which handles user-agent rotation internally.
 */
async function searchDDG(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const res = await enqueue(() => ddgSearch({ query }, "web"));
    return (res.data ?? []).slice(0, maxResults).map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.description ?? "",
    }));
  } catch (err) {
    console.warn(`[Search:DDG] Failed for "${query.slice(0, 50)}…":`, (err as Error).message);
    return [];
  }
}

/**
 * Search the web — completely free, no API keys needed.
 */
export async function searchWeb(
  query: string,
  maxResults: number = CONFIG.search.maxResultsPerQuery
): Promise<SearchResult[]> {
  const results = await searchDDG(query, maxResults);
  if (results.length === 0) {
    console.warn(`[Search] No results for "${query.slice(0, 60)}…"`);
  }
  return results;
}

/**
 * Run multiple search queries and return combined, deduplicated results.
 */
export async function searchMultiple(
  queries: string[],
  maxResultsPerQuery: number = CONFIG.search.maxResultsPerQuery
): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries.slice(0, CONFIG.search.maxQueriesPerAgent)) {
    const results = await searchWeb(query, maxResultsPerQuery);
    for (const result of results) {
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        allResults.push(result);
      }
    }
  }

  return allResults;
}
