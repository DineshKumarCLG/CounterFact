import { listSimulations } from "@/lib/storage/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  const simulations = listSimulations(limit, offset);

  return Response.json({ simulations, limit, offset });
}
