import { loadSimulationState } from "@/lib/storage/filesystem";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Set SSE headers
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: unknown) => new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
      
      let lastUpdatedAt = "";
      let missedCount = 0;
      
      const interval = setInterval(() => {
        const state = loadSimulationState(id);
        if (state) {
          missedCount = 0;
          // Send update if state changed
          if (state.updatedAt !== lastUpdatedAt) {
            controller.enqueue(encode(state));
            lastUpdatedAt = state.updatedAt;
          }
          
          // Close stream if simulation is fully complete or explicitly blocked
          const isComplete =
            (state.synthesis && state.cascades !== undefined && state.stakeholderDebate !== undefined) ||
            state.safetyResult?.status === "BLOCKED";

          if (isComplete) {
            // Also send final "CLOSE" event so client knows to stop reconnecting
            controller.enqueue(new TextEncoder().encode(`event: close\ndata: null\n\n`));
            clearInterval(interval);
            controller.close();
          }
        } else {
          missedCount++;
          // Give initial state up to 20 seconds to appear before giving up
          if (missedCount >= 20) {
            clearInterval(interval);
            controller.close();
          }
        }
      }, 1000); // poll every 1s

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
      });
    },
  });

  return new Response(stream, { headers });
}
