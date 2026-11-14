import { loadSimulationState } from "@/lib/storage/filesystem";

const SIMULATION_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id || !SIMULATION_ID_REGEX.test(id)) {
    return Response.json({ error: "Invalid simulation ID" }, { status: 400 });
  }
  
  // Set SSE headers
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: unknown) => new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
      
      let lastUpdatedAt: string | null = null;
      let missedCount = 0;
      let isClosed = false;

      const cleanup = () => {
        if (!isClosed) {
          isClosed = true;
          clearInterval(interval);
          try {
            controller.close();
          } catch {
            // Controller might already be closed or stream aborted
          }
        }
      };
      
      const interval = setInterval(() => {
        try {
          if (isClosed || request.signal.aborted) {
            clearInterval(interval);
            cleanup();
            return;
          }

          const state = loadSimulationState(id);
          if (state) {
            missedCount = 0;
            // Send update if initial state or if state changed
            if (lastUpdatedAt === null || state.updatedAt !== lastUpdatedAt) {
              controller.enqueue(encode(state));
              lastUpdatedAt = state.updatedAt;
            }
            
            // Close stream if simulation is fully complete or explicitly blocked
            const isComplete = Boolean(
              state.status === "COMPLETE" ||
              state.status === "PARTIAL" ||
              state.status === "FAILED" ||
              state.safetyResult?.status === "BLOCKED" ||
              (state.synthesis && Boolean(state.cascades) && Boolean(state.stakeholderDebate))
            );

            if (isComplete) {
              // Also send final "CLOSE" event so client knows to stop reconnecting
              try {
                controller.enqueue(new TextEncoder().encode(`event: close\ndata: null\n\n`));
              } catch {
                // Ignore if client closed
              }
              cleanup();
            }
          } else {
            missedCount++;
            // Give initial state up to 20 seconds to appear before giving up
            if (missedCount >= 20) {
              cleanup();
            }
          }
        } catch {
          cleanup();
        }
      }, 1000); // poll every 1s

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        cleanup();
      });
    },
  });

  return new Response(stream, { headers });
}
