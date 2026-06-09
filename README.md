# Counterfact — Geopolitical Simulation Engine

> *Simulate what history never built.*

**Counterfact** is an agentic AI platform that takes hypothetical "What If" geopolitical scenarios and produces structured, multi-domain intelligence reports — grounded in real data, cascade-modelled through second and third-order effects, and delivered with a cinematic real-time dashboard.

Think of it as a panel of 12 expert analysts — historian, economist, military strategist, demographer, and more — running in parallel on AWS Bedrock, handing you a fully structured intelligence dossier.

---

## Demo

![Simulation Dashboard](https://via.placeholder.com/1200x600/030306/7c5cfc?text=Counterfact+Dashboard)

> *"What if Tamil Nadu became an independent country?" — Counterfact dispatches 8 specialist agents, synthesises contradictions, models a 5-level cascade DAG, and streams the complete intelligence report to your browser in real time.*

---

## What makes it interesting (technically)

| Layer | What's happening |
|---|---|
| **Orchestration** | A Planner LLM decomposes the scenario, assigns domain relevance weights (0–1), and dispatches only the relevant agents (typically 4–8 of 12). No wasted calls. |
| **Parallel agents** | Each specialist agent runs a full web-search + analysis cycle on AWS Bedrock (Claude Sonnet). They run in batches of 3–4 concurrently. |
| **Guard layer** | A dedicated Guard agent reviews every agent output for prompt injection, policy violations, and format compliance before it reaches synthesis. |
| **Synthesis** | A Synthesis LLM reads all agent JSON outputs, resolves contradictions across three modes (`RESOLVED`, `NUANCED`, `UNRESOLVED_TENSION`), and produces a confidence-labelled unified world model. |
| **Cascade engine** | A Cascade LLM generates a probabilistic directed acyclic graph (DAG) of 2nd and 3rd-order effects with confidence scores on every edge. |
| **Streaming** | The entire pipeline emits Server-Sent Events (SSE) — the browser updates in real time as each agent completes. |
| **Geo-visualisation** | MapLibre GL v5 with globe projection, CartoDB Dark Matter tiles, a heatmap layer for cascade density, and quadratic bezier arc lines connecting impacted regions. |

---

## Architecture

```
User Input
    │
    ▼
┌───────────────┐
│  Safety Gate  │  Block / restrict / allow + content policy classification
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    Planner    │  Decomposes scenario → domain weights → agent selection
└───────┬───────┘
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│                    Baseline Fetch                         │
│  DuckDuckGo web search → real-world grounding data        │
└───────────────────────────────┬───────────────────────────┘
                                │
        ┌───────────────────────▼───────────────────────┐
        │              Specialist Agents (parallel)     │
        │  HISTORICAL · ECONOMIC · POLITICAL · MILITARY │
        │  DIPLOMATIC · SOCIAL · TECHNOLOGICAL          │
        │  ENVIRONMENTAL · CULTURAL · LEGAL             │
        │  DEMOGRAPHIC · URBAN_PLANNING                 │
        │  (only domains with weight ≥ 0.3 dispatched)  │
        └───────────────────────┬───────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │     Guard Review      │
                    │  Policy + format QA   │
                    └───────────┬───────────┘
                                │
              ┌─────────────────▼─────────────────┐
              │            Synthesis              │
              │  Coherence · Contradiction detect  │
              │  Confidence labelling              │
              └─────────────┬─────────────────────┘
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
          ▼                 ▼                  ▼
    ┌──────────┐    ┌──────────────┐   ┌──────────────┐
    │  Cascade │    │ Stakeholder  │   │    Images    │
    │  DAG +   │    │   Debate     │   │  (Runware)   │
    │  3 Paths │    │  Simulation  │   │              │
    └──────────┘    └──────────────┘   └──────────────┘
          │
          ▼
   Streamed to browser via SSE
   Full-viewport 2-panel dashboard
   Map (globe) | Intel (tabs)
```

---

## Tech Stack

### Backend
| Technology | Usage |
|---|---|
| **Next.js 16** (App Router) | Full-stack framework, API routes, SSE streaming |
| **TypeScript** | End-to-end type safety across pipeline, API, and UI |
| **AWS Bedrock** (Claude Sonnet) | LLM inference for all agents — planner, specialists, guard, synthesis, cascade, stakeholder |
| **Zod v4** | Runtime schema validation and parsing for all LLM outputs |
| **better-sqlite3** | Lightweight local persistence for simulation state |
| **DuckDuckGo Search** | Free web search for baseline data grounding (no API key required) |
| **Runware AI** | AI image generation for visual output |

### Frontend
| Technology | Usage |
|---|---|
| **React 19** | UI with concurrent features |
| **Framer Motion 12** | All animations — agent progress, tab transitions, spring physics |
| **MapLibre GL v5.21** | Globe-projected interactive map with heatmap, arc, and marker layers |
| **CartoDB Dark Matter** | Vector tile base style |
| **topojson-client** | World Atlas TopoJSON→GeoJSON conversion for country borders |
| **Tailwind CSS v4** | Utility styling with custom design system |
| **react-markdown** | Rendering LLM-generated analysis content |

---

## Pipeline in depth

### Stage 0 — Safety Gate
Every scenario is classified before any LLM calls:
- `ALLOWED` — proceeds normally
- `RESTRICTED` — proceeds with auto-injected disclaimers (e.g. active conflict scenarios)
- `BLOCKED` — rejected with reason (violence glorification, specific individual targeting)

### Stage 1 — Planner
The Planner LLM reads the scenario and returns:
```typescript
{
  scenarioSummary: string,
  departurePoint: string,        // "The Tamil Nadu independence referendum passes — June 1967"
  domainWeights: Record<Domain, number>,  // { ECONOMIC: 0.9, MILITARY: 0.7, ... }
  activeAgents: Domain[],        // only domains with weight >= 0.3
  baselineDataRequired: string[] // web search queries
}
```
This means a scenario about currency reform only dispatches 4–5 agents. A full independence scenario dispatches 8–10.

### Stage 2 — Parallel Specialist Agents
Each active agent runs independently:
1. Receives: scenario + departure point + baseline web data + domain-specific system prompt
2. Calls Claude Sonnet via Bedrock with tool use for additional web searches
3. Returns structured JSON: `findings`, `keyDatapoints`, `confidence`, `contradictions`, `cascadeSeeds`, `visualPrompts`
4. Agents run in batches of 3–4 concurrently

### Stage 3 — Guard Review
Before synthesis, a Guard LLM reviews each output:
- Checks for prompt injection artifacts
- Verifies confidence labelling is honest
- Ensures source citations are present
- Non-blocking: failed guard passes with a flag rather than halting the pipeline

### Stage 4 — Synthesis
The Synthesis agent receives all approved outputs and:
- Produces a unified `unifiedAnalysis` markdown narrative
- Detects contradictions between domains and resolves them:
  - `RESOLVED` — one position is more data-grounded
  - `NUANCED` — both perspectives co-exist with explanation
  - `UNRESOLVED_TENSION` — surfaces both sides explicitly
- Labels each claim by confidence: `HIGH` / `MODERATE` / `SPECULATIVE`

### Stage 5 — Cascade Engine
Generates a probabilistic DAG of ripple effects:
```
Tamil Nadu independence
  → India loses ₹2.3T IT tax revenue [HIGH, 0.9]
    → Union budget deficit widens [HIGH, 0.85]
      → Rupee depreciates [MODERATE, 0.6]
        → New Tamil currency faces import inflation [MODERATE, 0.55]
          → Fiscal austerity in Year 2 [SPECULATIVE, 0.4]
```
Also produces three scenario paths: `OPTIMISTIC`, `BASE_CASE`, `PESSIMISTIC` — each with year-tagged milestones.

### Stage 6 — Streaming
All state changes emit SSE events. The browser subscribes via `EventSource` and updates the dashboard incrementally — agents light up one by one, the map heatmap intensifies, the tab content populates as data arrives.

---

## Map Visualisation

The left panel of the dashboard is a full-height MapLibre GL map:

- **Globe projection** with CartoDB Dark Matter vector tiles and atmospheric sky
- **Heatmap layer** — cascade nodes generate weighted GeoJSON points scattered across affected regions. Impact density renders as a purple→cyan→emerald gradient cloud
- **Arc lines** — cascade edges between regions render as animated quadratic bezier arcs, color-coded by effect type (green=positive, red=negative, blue=neutral)
- **Pulse markers** — scenario focus countries get animated pulsing rings at their geographic center
- **Hover tooltips** — hover any country to see its regional impact summary, active domains, and intensity bar
- **Region jump pills** — click any affected region to fly the globe there

This approach is **border-agnostic** by design — the heatmap and arcs represent impact flows, not political boundaries. Alternate-history scenarios (Nazi victory, Tamil Nadu independence) don't rely on which country lines exist on the map.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── simulate/          # POST — kick off a new simulation
│   │   ├── simulations/
│   │   │   └── [id]/
│   │   │       ├── route.ts   # GET — fetch state
│   │   │       ├── stream/    # SSE — live state updates
│   │   │       ├── refine/    # POST — conversational drill-down
│   │   │       └── export/    # GET — export simulation
│   ├── simulations/[id]/
│   │   └── DashboardClient.tsx  # Full-viewport 2-panel dashboard (~1300 lines)
│   └── page.tsx               # Home — scenario input
├── lib/
│   ├── agents/
│   │   ├── planner.ts         # Domain weight decomposition
│   │   ├── specialists/       # 12 domain specialist runners
│   │   ├── guard.ts           # Output policy review
│   │   ├── synthesis.ts       # Cross-agent coherence + contradiction
│   │   ├── cascade.ts         # DAG cascade modelling
│   │   └── stakeholder.ts     # Stakeholder debate simulation
│   ├── engine/
│   │   ├── pipeline.ts        # Full 10-stage orchestration
│   │   ├── types.ts           # Zod schemas + TypeScript types
│   │   └── config.ts          # Model IDs, costs, batch sizes
│   ├── llm/
│   │   ├── bedrock-client.ts  # AWS Bedrock wrapper + token tracking
│   │   └── search.ts          # DuckDuckGo web search
│   └── safety/
│       └── validator.ts       # Scenario safety classification
└── components/
    └── ui/
        ├── AnimatedBackground.tsx
        ├── ConfidenceLabel.tsx
        ├── DomainBadge.tsx
        ├── Markdown.tsx
        ├── Navbar.tsx
        ├── RefinedButton.tsx
        └── RefinedCard.tsx
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- AWS account with Bedrock access (Claude Sonnet model enabled in your region)
- Runware API key (optional — image generation only)

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/counterfact.git
cd counterfact
npm install --legacy-peer-deps
```

Copy the environment template:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1

# Optional — image generation
RUNWARE_API_KEY=your-runware-api-key
```

Run the dev server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### AWS Bedrock Setup
1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock)
2. Navigate to **Model access** → **Manage model access**
3. Enable `anthropic.claude-sonnet-4-20250514-v1:0` (or whichever Sonnet version is available in your region)
4. Ensure your IAM user/role has the `bedrock:InvokeModel` permission

---

## Running a Simulation

1. Navigate to `http://localhost:3000`
2. Enter a counterfactual scenario:
   - *"What if India never gained independence from Britain?"*
   - *"What if the Soviet Union won the Space Race?"*
   - *"What if Tamil Nadu became an independent country in 1967?"*
3. Watch the agents dispatch and complete in real time
4. Explore the intelligence report across 7 tabs: Synthesis · Domains · Contradictions · Cascades · Paths · Stakeholders · Ask
5. Use the **Ask** tab to drill down with follow-up questions

---

## API

### `POST /api/simulate`
Kick off a new simulation. Returns a simulation ID immediately; use the stream endpoint for live updates.

```json
{
  "scenario": "What if Taiwan declared independence in 2010?"
}
```

Response:
```json
{ "id": "uuid", "status": "running" }
```

### `GET /api/simulations/:id`
Fetch the current full simulation state.

### `GET /api/simulations/:id/stream`
Server-Sent Events stream. Each event is a raw `SimulationState` JSON object. Subscribe with:
```javascript
const es = new EventSource(`/api/simulations/${id}/stream`);
es.onmessage = (e) => {
  const state = JSON.parse(e.data);
  // state.agentStatus updated on each agent completion
};
```

### `POST /api/simulations/:id/refine`
Conversational drill-down. Streams token deltas.
```json
{ "message": "What happens if the new country joins ASEAN?" }
```

### `GET /api/simulations/:id/export`
Export the simulation as JSON.

---

## Design System

The UI is built on a custom dark intelligence aesthetic:

- **Colour**: Near-black base (`#030306`), layered surfaces, `#7c5cfc` purple accent
- **Glass**: Four-level glassmorphism system (`glass`, `glass-heavy`, `glass-well`, `glass-ultra`)
- **Typography**: Geist Sans + Geist Mono, heavy use of small-caps labels and monospace data
- **Motion**: Framer Motion 12 throughout — agent completion spring animations, tab indicator `layoutId`, streaming text reveal
- **Noise overlay**: 1.5% opacity SVG fractal noise for premium tactile texture

---

## Cost Model

Approximate per-simulation cost on AWS Bedrock (Claude Sonnet pricing):

| Analysis depth | Agents dispatched | Est. cost |
|---|---|---|
| Quick (4–6 agents) | Min domain weight ≥ 0.5 | ~$0.10–0.20 |
| Standard (6–8 agents) | Min domain weight ≥ 0.3 | ~$0.25–0.50 |
| Deep (all 12 agents) | All domains | ~$0.50–0.80 |

Token tracking is built into the pipeline — `costTracking` is part of every `SimulationState`.

---

## Tests

```bash
npm run test
```

Uses Vitest. Current coverage targets the type schemas and validation layer.

---

## Roadmap

- [ ] Reimagined SVG nation map (D3 + GeoJSON custom borders)
- [ ] AI-generated city concept renders (Runware integration complete, display pending)
- [ ] PDF export — full intelligence dossier (Puppeteer)
- [ ] User accounts + saved simulation library
- [ ] Public simulation sharing
- [ ] Deep Analysis mode (all 12 agents)
- [ ] Timeline scroll view (GSAP ScrollTrigger)

---

## Built by

**Dinesh Kumar** — CPO / Founding Engineer, Kenesis Labs Pvt Ltd  
Chennai, India · [kenesis.ai](https://kenesis.ai)

> *Counterfact is a product design and engineering project demonstrating agentic AI orchestration, streaming LLM pipelines, and real-time geospatial visualisation at production quality.*

---

## License

Private — All rights reserved. Kenesis Labs Pvt Ltd.
