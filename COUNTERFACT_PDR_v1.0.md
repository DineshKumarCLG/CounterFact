# COUNTERFACT — PRODUCT DESIGN REQUIREMENTS
### Geopolitical Simulation Engine — AI-Powered Scenario Intelligence

---

| | |
|---|---|
| **Prepared By** | Dinesh Kumar — CPO / Founding Engineer |
| **Company** | Kenesis Labs Pvt Ltd — kenesis.ai |
| **Version** | v1.0 — Initial Release |
| **Date** | March 2026 — Chennai, India |
| **Classification** | Confidential |

---

> *What if Tamil Nadu was a separate country? What if India never gained independence? Counterfact is the simulation engine that answers these questions — not with fiction, but with structured, multi-domain intelligence research, cascade modelling, and cinematic visual output.*

---

## Table of Contents

```
01  EXECUTIVE SUMMARY ................................. 02
02  PRODUCT VISION & MARKET POSITION .................. 03
03  TARGET AUDIENCE ................................... 04
04  CORE FEATURES & PRODUCT REQUIREMENTS .............. 05
05  SIMULATION ENGINE ARCHITECTURE .................... 09
06  MULTI-AGENT SYSTEM DESIGN ......................... 11
07  TECHNICAL ARCHITECTURE ............................ 13
08  UI/UX DESIGN SYSTEM ............................... 16
09  DATA MODELS & API DESIGN .......................... 20
10  MONETISATION STRATEGY ............................. 22
11  DEVELOPMENT ROADMAP ............................... 23
12  RISK ASSESSMENT ................................... 25
```

---

# 01 — EXECUTIVE SUMMARY
*The one-paragraph case for why Counterfact exists*

Counterfact is an agentic AI simulation platform that takes hypothetical "What If" geopolitical scenarios and produces structured, multi-domain intelligence reports — grounded in real data, cascade-modelled across time, and delivered with cinematic visual output. Think of it as a think-tank panel of 12 expert specialists — historian, economist, military strategist, urban planner, cultural anthropologist, and more — locked in a room to analyse your scenario, then handing you a fully illustrated intelligence dossier.

Unlike existing alternate-history or worldbuilding AI tools that generate narrative fiction, Counterfact produces **analytical simulation**: every claim is anchored to real baseline data, every projection is cascade-modelled through second and third-order effects, and every output includes confidence labelling to distinguish grounded analysis from modelled speculation. The experience mirrors talking to Claude — conversational, streaming, deeply intelligent — with a final report that looks like a classified government brief.

| DIMENSION | VALUE |
|---|---|
| Product Name | Counterfact |
| Tagline | *Simulate what history never built.* |
| Category | Agentic AI — Geopolitical Simulation & Intelligence |
| Primary Platform | Web (Next.js) — Mobile-responsive from day one |
| LLM Engine | Claude Sonnet via AWS Bedrock |
| Image Generation | Runware AI + Together AI (Flux Schnell / Dev) |
| Core Output | Streamed conversational report + reimagined SVG map + AI-generated visuals |
| Target Launch | Q3 2026 (v1 Beta) |
| Built By | Kenesis Labs Pvt Ltd |

---

# 02 — PRODUCT VISION & MARKET POSITION
*Where Counterfact lives in the competitive landscape*

## Vision Statement

> *To become the world's definitive platform for structured scenario intelligence — the tool researchers, writers, educators, and curious minds reach for when they want to understand not just what happened, but what could have been.*

## Competitive Landscape

The current market has a clear ceiling: existing tools are narrative generators, not simulation engines. None combine deep structured research, causal cascade modelling, and cinematic visual output.

| TOOL | TYPE | DEPTH | VISUALS |
|---|---|---|---|
| Chronostates | Narrative game | Surface-level | Minimal |
| Talefy | Story generator | Fictional only | None |
| Alt-History GPTs | Chatbot prompting | Variable / shallow | None |
| Policy Sim platforms | Academic / closed | Deep but narrow | Charts only |
| **COUNTERFACT** | **Simulation Engine** | **Multi-domain, cascade-modelled** | **Maps + AI visuals + dashboards** |

> *The gap is architectural, not incremental. Counterfact is the first tool that treats "What If" as an intelligence problem rather than a storytelling one.*

## Market Opportunity

- Global alternate history and speculative fiction community: ~15M active participants across Reddit, forums, and YouTube
- Policy research and think-tank ecosystem: thousands of analysts who currently do this manually
- Education market: history, political science, and social studies teachers and students globally
- Fiction writers, game designers, and worldbuilders who need internally consistent world logic
- Geopolitical journalists and content creators building explainer content

---

# 03 — TARGET AUDIENCE
*Who uses Counterfact and why they pay for it*

| PERSONA | WHO THEY ARE | WHAT THEY WANT |
|---|---|---|
| **The Curious Mind** | Students, Reddit/YouTube geopolitics enthusiasts, history buffs aged 18–35 | Explore "What If" scenarios with real depth — not just entertainment but genuine insight |
| **The World Builder** | Fiction writers, game designers, DMs, alt-history novelists | An internally consistent world logic engine that grounds their creative work in plausible reality |
| **The Policy Researcher** | Graduate students, think-tank analysts, policy journalists | Quick structured analysis of hypothetical scenarios anchored to real data and sources |
| **The Educator** | History, political science, economics teachers at university and high school level | Engaging interactive tool to teach systemic thinking, cause-effect reasoning, and geopolitics |
| **The Content Creator** | YouTube essayists, Substack writers, podcast producers covering geopolitics | Fast-generated, visually rich scenario reports to build episodes or articles around |

---

# 04 — CORE FEATURES & PRODUCT REQUIREMENTS
*What Counterfact must do — prioritised and specified*

---

## F01 — Scenario Intake & Intelligent Decomposition

When the user submits a scenario, the system performs structured decomposition before any research begins. This is not a direct Q&A pass-through — it is a planning stage that maps the simulation tree.

**Requirements**

- **NLP parsing** — Extract the core counterfactual claim, the implied departure point from history, and the scope (geographic, temporal, political)
- **Domain mapping** — Automatically identify which of the 12 research domains are relevant and assign priority weight to each
- **Scope clarification** — Optionally ask the user 1–2 targeted questions if the scenario is ambiguous before launching the simulation
- **Departure point anchoring** — Identify and display the real historical baseline from which the simulation diverges
- **Estimated depth indicator** — Show the user how many research threads will run and approximate completion time

---

## F02 — Multi-Agent Parallel Research Engine

The core simulation engine runs 12 specialist sub-agents in parallel. Each agent speaks as that domain's expert and produces structured findings that feed into the synthesis layer.

### The 12 Specialist Agents

```
┌─────────┬────────────────────────────────────────────────────────────────────────────────────────────┐
│ HIST    │ Historical Agent                                                                           │
│ HISTORY │ Traces roots, precedents, prior movements, and empire history relevant to the scenario.   │
│         │ Identifies analogous historical events for comparison.                                    │
├─────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ GEO     │ Geographic Agent                                                                           │
│ GEO     │ Maps coastlines, rivers, borders, terrain, climate zones, resource deposits, strategic    │
│         │ chokepoints, and agricultural capacity.                                                   │
├─────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ ECON    │ Economic Agent                                                                             │
│ ECON    │ Models GDP baseline, tax base viability, industrial sectors, trade dependencies, currency  │
│         │ feasibility, and 10/25/50-year fiscal trajectory.                                         │
├─────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ POL     │ Political Agent                                                                            │
│ GOV     │ Designs constitutional structure, likely political parties, governance model, UN          │
│         │ recognition pathway, international treaty landscape.                                      │
├─────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ MIL     │ Military Agent                                                                             │
│ DEF     │ Estimates force structure, defence budget, geographic vulnerabilities, likely allies and  │
│         │ adversaries, arms acquisition pathway.                                                    │
├─────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ SOC     │ Social & Cultural Agent                                                                    │
│ SOC     │ Analyses identity, caste/ethnic composition, linguistic homogeneity, diaspora influence,  │
│         │ gender indices, social cohesion risk.                                                     │
├─────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ TECH    │ Technology Agent                                                                           │
│ TECH    │ Evaluates existing tech ecosystem, digital infrastructure, startup density, R&D capacity, │
│         │ and technology leapfrog opportunities.                                                    │
├─────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ URB     │ Urban Planning Agent                                                                       │
│ CITIES  │ Models how major cities transform — capital city dynamics, infrastructure investment,      │
│         │ population migration, urban vs rural split.                                               │
├─────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ ENV     │ Environmental Agent                                                                        │
│ ENV     │ Assesses climate exposure, natural disaster risk, water security, energy independence     │
│         │ potential, and sustainability trajectory.                                                 │
├─────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ INT     │ International Relations Agent                                                              │
│ DIPL    │ Simulates how neighbours, regional blocs, and global powers react — recognition           │
│         │ timelines, trade treaties, alliance formation.                                            │
├─────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ MED     │ Media & Narrative Agent                                                                    │
│ SOFT    │ Explores cultural exports, language spread, media ecosystem, national mythology, and how  │
│         │ the nation projects identity globally.                                                    │
├─────────┼────────────────────────────────────────────────────────────────────────────────────────────┤
│ COMP    │ Comparative History Agent                                                                  │
│ PREC    │ Anchors the scenario to real historical analogues — Singapore 1965, Bangladesh 1971,      │
│         │ Kosovo 2008 — for credibility and calibration.                                            │
└─────────┴────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## F03 — Cross-Agent Synthesis & Contradiction Detection

After all agents complete their analysis, a synthesis agent reads all 12 outputs and produces a coherent unified world model. Critically, it also detects and surfaces internal contradictions — if the economic model projects strong exports but the diplomatic model projects trade isolation, that tension is flagged and resolved with explicit reasoning.

**Requirements**

- **Coherence pass** — Generate a unified narrative that integrates all 12 domain findings
- **Contradiction engine** — Flag any logical inconsistencies between agent outputs and resolve them with stated reasoning
- **Confidence layer** — Label each section: `HIGH CONFIDENCE` (data-grounded) / `MODERATE` (modelled) / `SPECULATIVE` (extrapolated)
- **Source attribution** — Every factual claim cites its real-world source or data anchor

---

## F04 — Cascade Engine (2nd & 3rd Order Effects)

This is the feature that makes Counterfact a simulation rather than a summary. The cascade engine models ripple effects: if X happens, then Y follows, which causes Z. Users can visualise the full causal chain.

> **Example cascade:** Tamil Nadu independence → India loses major IT tax revenue → Union budget pressure increases → Indian rupee weakens → Tamil Nadu's new currency faces import inflation in Year 2 → triggers austerity → delays military buildup until Year 5.

**Requirements**

- **3-level cascade depth** — Model at least 3 levels of consequence for each major scenario development
- **Visual cascade tree** — D3.js rendered cascade diagram showing the causal chain interactively
- **Positive & negative cascades** — Model both upside and downside ripple effects — not just problems

---

## F05 — Three-Path Scenario Branching

Every simulation produces three distinct outcome paths, not a single linear answer.

| PATH | NAME | DESCRIPTION |
|---|---|---|
| OPTIMISTIC | Best-Case Trajectory | Assumes favourable conditions: strong leadership, cooperative neighbours, effective institutions, economic tailwinds |
| BASE CASE | Most Probable Path | Assumes realistic friction: moderate governance, mixed international response, expected economic volatility |
| PESSIMISTIC | Worst-Case Cascade | Assumes systemic failure points: political instability, hostile neighbours, economic shocks, institutional collapse |

---

## F06 — Conversational Drill-Down

After the initial simulation completes, users can continue the conversation to explore specific branches in greater depth. The system maintains full simulation state across turns.

**Example drill-down queries**
- *"What happens if Tamil Nadu joins ASEAN instead of SAARC?"*
- *"How does the Cauvery water dispute get resolved in the base case?"*
- *"Show me the military in the pessimistic scenario at Year 10."*
- *"What is the capital city called and what does it look like?"*

---

## F07 — Visual Output Pipeline

| VISUAL | TECHNOLOGY | DESCRIPTION |
|---|---|---|
| Reimagined Nation Map | D3.js + GeoJSON + SVG | Interactive SVG map showing the new nation-state with borders, capital, military zones, economic zones, major cities |
| City Concept Renders | Runware AI / Together AI (Flux) | 3–5 AI-generated images of how major cities look — capital city skyline, government district, military base |
| People & Culture Visuals | Runware AI (Flux Dev) | National dress, military uniform design, street scenes depicting the culture and aesthetic of the new state |
| Economic Dashboard | D3.js / Recharts | GDP projection charts, sector breakdown pie, trade flow Sankey diagram rendered in-browser |
| Timeline Scroll View | GSAP ScrollTrigger | Horizontal scroll from Year 0 (independence) → Year 5 → Year 20 → Year 50 with key milestones plotted |
| Flag & National Identity | SVG + Runware AI | AI-generated national flag, coat of arms, and national symbols designed for the scenario |
| Force Structure Chart | D3.js | Military organisation chart showing branch breakdown, estimated personnel, equipment categories, base locations |

---

## F08 — Stakeholder Debate Simulation

Counterfact simulates how key stakeholders would publicly argue about the scenario. Different perspectives, different interests, authentic voice differentiation.

**Example stakeholders for "Tamil Nadu as independent nation"**
- Indian central government — opposition framing, constitutional concerns, economic loss arguments
- Tamil diaspora in Singapore — optimistic, pro-independence, investment angle
- Sri Lanka foreign ministry — cautious, security-focused, Tamil Eelam parallel concerns
- IMF economist — neutral, analytical, fiscal viability assessment
- Chennai business community — pragmatic, trade-focused, infrastructure investment angle

---

## F09 — World Bible Export

Users can export the complete simulation as a structured "World Bible" — a 30–50 page PDF document formatted like a classified intelligence brief, including all domain analyses, visuals, cascade maps, and stakeholder positions.

**Export formats**
- `PDF` — full-fidelity intelligence dossier format (Puppeteer + Lambda)
- `Markdown` — clean structured text for writers and researchers
- `JSON` — full simulation state for developers / game engines

---

# 05 — SIMULATION ENGINE ARCHITECTURE
*How the core engine is structured from intake to output*

## High-Level Pipeline

| STAGE | DESCRIPTION |
|---|---|
| 01 / Intake | User submits scenario via conversational UI. NLP decomposition extracts counterfactual claim, departure point, scope boundaries, and domain weight map. |
| 02 / Baseline Fetch | System fetches real-world baseline data for the scenario subject using Tavily API and Claude web search. Grounds the simulation in actual GDP, population, geography, political history. |
| 03 / Agent Dispatch | Planner agent dispatches all 12 specialist agents in parallel via Claude Bedrock API calls. Each receives the scenario, the baseline data, and its domain-specific system prompt. |
| 04 / Research Phase | Agents run concurrently. Each performs deep research via web search tool, produces structured JSON output: findings, confidence level, key data points, source citations. |
| 05 / Synthesis | Synthesis agent receives all 12 JSON outputs. Runs coherence pass, contradiction detection, and confidence labelling. Produces unified world model. |
| 06 / Cascade Modelling | Cascade engine takes the unified model and generates 3-level ripple effects across all domains. Branches into 3 scenario paths (optimistic / base / pessimistic). |
| 07 / Visual Generation | Map data → D3 renderer. Image prompts → Runware AI / Together AI. Chart data → Recharts. All triggered in parallel post-synthesis. |
| 08 / Report Assembly | Final report assembled: domain sections + cascade diagram + 3 scenario paths + visual gallery + stakeholder debate + timeline. Streamed to frontend progressively. |
| 09 / Conversation Layer | Simulation state persisted in DynamoDB. User can drill down conversationally. Each new query triggers targeted sub-agent re-runs on the relevant domain. |

---

## State Management

```typescript
SimulationState {
  id:              string          // UUID
  scenario:        string          // Original user input
  departure_point: string          // Historical divergence point
  baseline_data:   DomainBaseline  // Real-world grounding data
  domain_weights:  Record<Domain, number>  // 0-1 relevance weights
  agent_outputs:   Record<Domain, AgentOutput>
  synthesis:       SynthesisOutput
  cascades:        CascadeTree
  paths:           { optimistic, base, pessimistic }
  visuals:         VisualAssets
  conversation:    Message[]       // Full turn history
  version:         number          // Increments on each drill-down
}
```

## Agent Output Schema

```typescript
AgentOutput {
  domain:          Domain
  findings:        string          // Narrative analysis
  key_datapoints:  DataPoint[]     // Structured facts with sources
  confidence:      "HIGH" | "MODERATE" | "SPECULATIVE"
  contradictions:  string[]        // Flags for synthesis agent
  cascade_seeds:   string[]        // Inputs to cascade engine
  visual_prompts:  VisualPrompt[]  // For image generation
}
```

---

# 06 — MULTI-AGENT SYSTEM DESIGN
*Prompt architecture, agent roles, and orchestration logic*

## Orchestration Model

Counterfact uses a **hub-and-spoke orchestration pattern** — a single planner/orchestrator agent manages the dispatch and synthesis of 12 specialist agents. All agents run on Claude Sonnet via AWS Bedrock. There is no multi-model routing.

> **Critical design principle:** one LLM, one voice, one memory chain. Multi-model routing was evaluated and rejected — it breaks memory continuity and produces incoherent voice differentiation in the final report.

---

## Planner Agent — System Prompt Architecture

The planner agent receives the user scenario and produces the decomposition.

**Planner system prompt structure**

- **Role** — You are the lead analyst at a geopolitical intelligence firm. When given a hypothetical scenario, your job is to plan the research operation — not conduct it.
- **Output format** — Return structured JSON: scenario summary, departure point, `domain_weights` (12 domains, each 0–1), `baseline_data_required` (list of specific real-world data points to fetch), `clarification_questions` (0–2 if needed).
- **Constraint** — Do not begin analysis. Do not hallucinate data. Do not speculate. Only plan.

---

## Specialist Agent — System Prompt Architecture

Each specialist agent receives a domain-specific system prompt that establishes expert persona, analytical framework, and output format.

**Example: Economic Agent system prompt structure**

- **Role** — You are a senior development economist with 20 years of experience in emerging market fiscal analysis. You speak with precision and cite data.
- **Task** — Analyse the economic dimension of `[SCENARIO]`. You have access to the following real-world baseline data: `[BASELINE]`. Use web search to verify and deepen your analysis.
- **Output format** — Return structured JSON conforming to `AgentOutput` schema. Include confidence level per finding. Flag any tensions with other domains (especially political and diplomatic) for the synthesis agent.
- **Constraint** — Never fabricate statistics. Label all projections explicitly as projections. Acknowledge uncertainty ranges.

---

## Synthesis Agent — Contradiction Resolution Protocol

| STEP | ACTION |
|---|---|
| DETECT | Identify any claim in one agent output that is logically incompatible with a claim in another agent output |
| FLAG | Surface the contradiction explicitly: *"Economic Agent projects X, but Diplomatic Agent projects Y — these are incompatible."* |
| RESOLVE | Choose the more data-grounded position and explain why, OR generate a nuanced synthesis that accommodates both |
| DOCUMENT | Record all resolutions in the synthesis output for transparency |

---

# 07 — TECHNICAL ARCHITECTURE
*Full stack specification — frontend, backend, infrastructure*

## Tech Stack Summary

| LAYER | TECHNOLOGY | RATIONALE |
|---|---|---|
| Frontend Framework | Next.js 15 (App Router) | Primary stack; Server Components for SEO, streaming for conversational UX |
| Styling | Tailwind CSS + CVA component system | Consistent with existing Kenesis Labs toolchain (Kiro Power setup) |
| Animations | GSAP ScrollTrigger + Framer Motion | Timeline scroll view + micro-interactions; matches Waabi-inspired approach |
| Maps & Diagrams | D3.js + GeoJSON | Full control over SVG output, no vendor lock-in, free |
| Charts | Recharts | Clean React integration, sufficient for economic dashboard outputs |
| LLM | Claude Sonnet 4 via AWS Bedrock | Same AWS account, credits-based billing, no Anthropic API key needed |
| Web Search | Tavily API (1000 free calls/month) | Grounded research; Claude web search as secondary fallback |
| Image Generation | Runware AI (primary) + Together AI Flux Schnell (quality fallback) | Sub-$0.005/image; Runware already familiar |
| Streaming | Next.js Server-Sent Events (SSE) | Native App Router streaming; conversational feel like Claude app |
| Database | DynamoDB (simulation state + sessions) | Existing AWS setup; schemaless fits simulation JSON perfectly |
| File Storage | S3 (generated images + PDF exports) | Existing AWS setup; cheap at scale |
| PDF Export | Puppeteer on Lambda | Headless Chrome for full-fidelity World Bible export |
| Auth | Clerk or NextAuth.js | Fast integration; supports Google/GitHub OAuth for target audience |
| Deployment | Vercel (frontend) + AWS (Lambda + DDB + S3) | Standard Kenesis stack |

---

## AWS Bedrock Integration

| CONFIG | VALUE |
|---|---|
| Model ID | `anthropic.claude-sonnet-4-20250514-v1:0` |
| Max tokens per agent call | 4096 (specialist agents) / 8192 (synthesis agent) |
| Parallel calls | Up to 12 concurrent Bedrock invocations |
| Tool use | Enable web search tool for all specialist agents via Bedrock tool config |
| Streaming | `InvokeModelWithResponseStream` for real-time output to frontend |
| Region | `ap-south-1` (Mumbai) — lowest latency from Chennai |

---

## Streaming Architecture — SSE Event Types

The wait time during simulation is a core UX moment. The streaming architecture makes it feel like watching an intelligence agency in real time — not a loading spinner.

| EVENT TYPE | PAYLOAD & UI EFFECT |
|---|---|
| `simulation:start` | Scenario accepted — displays decomposition: N domains, estimated time |
| `agent:dispatched` | Agent name + domain — lights up that domain card on the progress map |
| `agent:progress` | Partial text from agent — streams text into that domain's card in real-time |
| `agent:complete` | Agent output JSON — marks domain card as complete, confidence badge appears |
| `synthesis:start` | All agents complete — synthesis phase begins, progress bar shows |
| `synthesis:chunk` | Streaming synthesis text — main report body begins populating |
| `cascade:ready` | Cascade tree data — D3 diagram renders with animation |
| `visual:ready` | Image URL + type — image appears in report with reveal animation |
| `map:ready` | GeoJSON + overlay data — SVG map renders interactively |
| `simulation:complete` | Final state — export buttons appear, conversation input re-activates |

---

## Request Lifecycle

```
01  User types scenario in Next.js UI → POST to /api/simulate
02  API Route creates SSE stream, generates simulation ID, writes initial state to DynamoDB
03  Planner agent called via Bedrock → returns decomposition JSON
04  12 specialist agents dispatched in parallel via Promise.allSettled
    → each streams agent:progress events
05  Agent outputs written to DynamoDB simulation state as they complete
06  Synthesis agent called with all 12 outputs → streams synthesis:chunk events
07  Cascade engine runs on synthesis output → cascade tree generated
08  Image prompts extracted → Runware API called → images stored in S3
    → visual:ready events fired
09  Map GeoJSON generated from geographic agent output → map:ready event
10  simulation:complete fired → frontend enters conversation mode
11  User follow-up queries hit /api/simulate/[id]/refine
    → targeted sub-agent re-runs only
```

---

# 08 — UI/UX DESIGN SYSTEM
*Design language, component system, and interaction philosophy*

## Design Direction — Intelligence Dossier Brutalism

Counterfact's visual identity sits at the intersection of two 2026 design trends: **Technical Monospaced Authenticity** (the builder/hacker aesthetic using Courier-family fonts and utilitarian layouts that signal intellectual credibility) and **Editorial Magazine Depth** (layered information hierarchy, structured grids, annotation-rich data visualisation).

The result is what an intelligence agency's internal briefing system would look like if a premium design studio built it.

> **Anti-generic principle:** no purple gradients, no glassmorphism cards, no Inter or Space Grotesk, no generic SaaS dashboard patterns. Counterfact should look like it was designed for analysts, not for marketing websites.

---

## Design Pillars

| PILLAR | EXPRESSION |
|---|---|
| Technical Authenticity | Monospaced type (IBM Plex Mono) for UI chrome, labels, tags, codes. Signals precision and credibility to the target audience. |
| Editorial Structure | Georgia / Lora for body copy. Dense information hierarchy. Clear visual weight system. Content-first layout inspired by The Economist and Jane's Defence. |
| Controlled Darkness | Deep charcoal `#1A1A1A` primary background with warm off-white `#F8F6F2` for document regions. Not pure black — has warmth. Like aged paper under lamplight. |
| Amber as Signal | A single, sharp amber `#C8892A` as the primary accent — used for section codes, highlights, CTAs, and active states. Nothing else competes with it. |
| Imperfect Grid | Layouts that feel designed, not templated. Overlapping type layers, large section numbers as background elements, occasional diagonal text for metadata. |
| Functional Animation | Every animation serves a purpose. Agent cards light up as agents activate. Cascade trees build branch by branch. Map reveals with a redacted → unredacted effect. |

---

## Typography System

| ROLE | FONT | USAGE |
|---|---|---|
| UI Chrome / Labels / Tags | IBM Plex Mono | Section numbers, metadata, status badges, confidence labels, timestamps, code-like UI elements |
| Display / Section Titles | Libre Baskerville Bold | Hero headings, simulation result titles, World Bible export headers |
| Body / Analysis Text | Georgia / Lora | All report body copy, agent findings, synthesis narrative |
| UI Copy / Navigation | Syne | Buttons, nav items, form labels — geometric but with personality |
| Data / Numbers | IBM Plex Mono | All numeric data, percentages, coordinates, model IDs |

---

## Colour System

| TOKEN | HEX | USAGE |
|---|---|---|
| `background.primary` | `#0F0F0F` | Main app background |
| `background.surface` | `#1A1A1A` | Card / panel surfaces — agent cards, sidebar |
| `background.elevated` | `#242424` | Modals, popovers |
| `background.document` | `#F8F6F2` | Report body regions — warm off-white |
| `accent.amber` | `#C8892A` | Primary CTA, active states, section codes |
| `accent.amber.light` | `#E8A83A` | Hover states on amber elements |
| `text.primary` | `#E8E6E0` | Main body text on dark — warm off-white |
| `text.secondary` | `#9A9890` | Metadata, labels, timestamps |
| `text.dark` | `#1A1A1A` | Body text on document background |
| `status.high` | `#2E7D52` | HIGH confidence badge — muted green |
| `status.moderate` | `#C8892A` | MODERATE confidence badge |
| `status.speculative` | `#8B4513` | SPECULATIVE badge — muted red-brown |
| `border.default` | `#2D2D2D` | Card borders on dark bg |
| `border.amber` | `#C8892A` | Active / focus borders |

---

## Core UI Components

### Simulation Input — The Entry Point
A full-width, minimal input area that looks more like a secure message terminal than a chatbox. Dark background, amber cursor, monospaced font. A faint `READY FOR SCENARIO INPUT` label in small caps above the field. Submit via Enter — no button visible until text is typed.

### Domain Progress Map
The most important UI moment during simulation. A 12-cell grid showing all specialist domains. Each cell: domain code (e.g. `ECON`), domain name, and a status indicator.

```
States:
IDLE      → dark, dim
ACTIVE    → amber glow, streaming text preview
COMPLETE  → confidence badge appears: HIGH / MOD / SPEC
```

The grid animates cell by cell as agents activate — feels like a mission operations board coming online.

### Simulation Report — Document View
Once synthesis is complete, the main report renders as a rich document — not a chat transcript. Structured sections with clear visual hierarchy. Each domain section has a labelled header with confidence badge. Pull-quotes from the analysis highlighted in the margin. The report uses `background.document` (`#F8F6F2`) against the dark app shell — like opening a physical file.

### Cascade Tree
D3.js force-directed tree showing causal chains. Nodes are events; edges are causal links. Colour-coded by domain. Click any node to expand it — child nodes animate in. The tree starts collapsed at the root (the scenario departure point) and expands progressively.

### Reimagined Nation Map
SVG map rendered in an intelligence-map aesthetic — dark background, amber border outline, city markers as dots with labels, military zones as hatched regions, economic zones with subtle fills. Hover reveals data overlays per region. D3.js + custom GeoJSON — no Mapbox dependency.

### Visual Gallery — The Cinematic Layer
A horizontal scroll gallery of AI-generated visuals. Each image has a label overlay in the bottom-left (IBM Plex Mono, amber) describing what it depicts. First image always loads with a **"DECLASSIFIED" redaction-reveal animation** — black bars lift to reveal the image underneath.

### Three-Path Scenario Switcher
A toggle at the top of the report with three states: `OPTIMISTIC` / `BASE CASE` / `PESSIMISTIC`. Switching re-renders the relevant sections with the appropriate path data. Active path highlighted in amber. A subtle divergence indicator shows where the three paths split from base reality.

### Conversation Input — Drill-Down Mode
After simulation, the input reappears at the bottom of the report — now labelled `DEEPEN THE ANALYSIS`. User queries append to the report below the main synthesis, clearly marked as drill-down expansions. The thread stays unified as a single scrollable document.

---

## Screen Flow

| SCREEN | DESCRIPTION |
|---|---|
| Landing / Home | Minimal dark hero. Large headline: *"SIMULATE WHAT HISTORY NEVER BUILT."* Single input field in the centre. Example scenarios rotate as ghost text. Recent public simulations shown as "intelligence file" cards below. |
| Simulation Active | Full-screen progress state. Domain grid (12 cells) in centre. Live text feed on the right — streaming agent outputs. Amber progress bar at top. Estimated time remaining counter. |
| Report View | Primary experience. Left sidebar: simulation metadata + domain navigation. Main: rich document report. Right panel (collapsible): visual gallery + cascade tree. Sticky header: scenario title + 3-path switcher. |
| World Bible Export | Full-screen modal: export options (PDF / Markdown / JSON), cover page preview, section toggle. Generate button triggers Puppeteer Lambda. |
| Scenario Library | Grid of past simulations styled as file cards. Filter by domain, region, confidence level. Featured/public simulations highlighted. Search. |
| Settings / Account | Minimal. API usage meter, subscription plan, export history, saved simulations. |

---

# 09 — DATA MODELS & API DESIGN
*DynamoDB schema and Next.js API surface*

## DynamoDB Tables

| TABLE | PK / SK | DESCRIPTION |
|---|---|---|
| `simulations` | PK: `user_id` \| SK: `sim_id` | Full simulation state JSON — scenario, agent outputs, synthesis, cascades, visual URLs, conversation history |
| `users` | PK: `user_id` | Auth data, plan tier, usage counters, preferences |
| `public_simulations` | PK: `sim_id` \| GSI: `featured` | Opt-in public simulations for the library; indexed for browse/filter |
| `usage_events` | PK: `user_id` \| SK: `timestamp` | Granular usage tracking: simulations run, agents called, images generated |

---

## API Routes

| ROUTE | METHOD | DESCRIPTION |
|---|---|---|
| `/api/simulate` | `POST` | Start new simulation. Returns SSE stream. Body: `{ scenario, userId }` |
| `/api/simulate/[id]` | `GET` | Fetch full simulation state from DynamoDB |
| `/api/simulate/[id]/refine` | `POST` | Drill-down query on existing simulation. Streams targeted agent re-run. |
| `/api/simulate/[id]/export` | `POST` | Trigger PDF / Markdown / JSON export. Returns download URL. |
| `/api/simulate/[id]/share` | `POST` | Make simulation public. Returns public URL. |
| `/api/simulations` | `GET` | List user's simulations with pagination |
| `/api/simulations/public` | `GET` | Browse public simulation library with filter/search |
| `/api/usage` | `GET` | Current user usage stats and plan limits |

---

# 10 — MONETISATION STRATEGY
*Freemium to premium — pricing and tier design*

## Pricing Tiers

| FEATURE | FREE | EXPLORER ($12/mo) | ANALYST ($39/mo) |
|---|---|---|---|
| Simulations / month | 2 (shallow depth) | 15 (full depth) | Unlimited |
| Agents per simulation | 6 of 12 | 12 of 12 | 12 of 12 |
| Scenario branching | Base case only | All 3 paths | All 3 paths + custom |
| AI-generated visuals | 2 images | 8 images | 20 images |
| World Bible export | No | PDF only | PDF + MD + JSON |
| Stakeholder debate | No | Yes | Yes |
| Cascade depth | 1 level | 3 levels | 5 levels |
| Public library share | Yes | Yes | Yes + featured |
| Conversation turns | 3 follow-ups | 15 follow-ups | Unlimited |
| API access | No | No | Yes (coming v2) |

## Education & Research

Discounted annual plans for verified educators and research institutions. Bulk licensing for universities. Custom pricing for think-tanks and government policy teams wanting private deployments.

---

## Unit Economics — Cost Per Deep Simulation

| COST COMPONENT | ESTIMATE |
|---|---|
| Claude Sonnet on Bedrock (12 agents + synthesis + cascade) | ~$0.08–0.14 |
| Tavily API search calls (~30 calls per simulation) | ~$0.003 (within free tier initially) |
| Runware AI image generation (8 images @ $0.004 avg) | ~$0.032 |
| DynamoDB + S3 storage per simulation | ~$0.001 |
| Lambda (PDF export, occasional) | ~$0.002 |
| **TOTAL COST PER DEEP SIMULATION** | **~$0.12–0.18** |

> **Explorer plan at $12/month:** 15 simulations at max $0.18 cost = $2.70 COGS. **77.5% gross margin** before infra overhead. Strong unit economics from day one.

---

# 11 — DEVELOPMENT ROADMAP
*Phased build plan from prototype to scale*

---

## PHASE 1 — Core Engine: Proof of Concept
**Duration: 6–8 weeks**

```
01. Set up AWS Bedrock integration with Claude Sonnet — streaming InvokeModel API working end-to-end
02. Build planner agent + 6 core specialist agents (HIST, GEO, ECON, POL, MIL, SOC)
03. Build synthesis agent with basic contradiction detection
04. Next.js SSE streaming pipeline — messages stream to frontend in real time
05. Minimal UI: dark terminal-style input + streaming text output per domain card
06. DynamoDB simulation state persistence + basic session management
07. Tavily API integration for grounded research in specialist agents
08. Basic D3.js SVG map generation from geographic agent output
09. Runware AI integration for 3 core image types (city, people, flag)
10. End-to-end demo: Tamil Nadu scenario → full streamed report + map + 3 images
```

---

## PHASE 2 — Full Agent Suite + Visual Layer
**Duration: 6–8 weeks**

```
01. Remaining 6 specialist agents (TECH, URB, ENV, INT, MED, COMP)
02. Cascade engine — 3-level ripple effect modelling with D3 tree visualisation
03. Three-path scenario branching (optimistic / base / pessimistic)
04. Full visual pipeline: 8 image types, S3 storage, reveal animations
05. Economic dashboard — Recharts integration, GDP projection + trade flow charts
06. Timeline scroll view — GSAP ScrollTrigger horizontal Year 0 → Year 50
07. Stakeholder debate simulation feature
08. Confidence labelling system across all agent outputs
09. Conversation drill-down — targeted sub-agent re-runs on follow-up queries
10. World Bible PDF export — Puppeteer Lambda pipeline
```

---

## PHASE 3 — Product Polish + Auth + Beta Launch
**Duration: 4–6 weeks**

```
01. Full UI implementation: Intelligence Dossier Brutalism design system
02. Clerk/NextAuth authentication with Google/GitHub OAuth
03. Freemium tier system — usage metering, plan enforcement, upgrade flows
04. Public simulation library — browse, filter, share
05. Mobile-responsive layout — full report readable on phone
06. Onboarding flow — interactive example scenario walkthrough on first session
07. Performance optimisation — agent parallelisation tuning, image lazy loading
08. Beta launch: closed beta to 200 users from target audience communities
09. Feedback loop — structured session recordings, interview programme
```

---

## PHASE 4 — Scale + v2 Features
**Duration: 8–12 weeks post-beta**

```
01. Full public launch with freemium pricing live
02. API access tier for developers and researchers
03. Custom scenario parameters — user can set departure year, constrain scope, add domain weights
04. Comparative overlay feature — anchor scenario to historical analogue
05. Time slider — explore simulation at Year 1, 5, 10, 25, 50 with state changes
06. Multiplayer scenario — two users debate opposing scenarios in a shared session
07. Vector DB integration for simulation memory across sessions at scale
08. Education portal — teacher dashboard, class scenario management, structured rubrics
09. Tamil Nadu deep preset — pre-loaded baseline data for instant quality on local scenario
```

---

# 12 — RISK ASSESSMENT
*Known risks, their severity, and mitigation strategies*

| RISK | SEVERITY | LIKELIHOOD | MITIGATION |
|---|---|---|---|
| Causal graph hallucination — agents inventing plausible-sounding but false data | HIGH | HIGH | Mandatory web search grounding for all factual claims; confidence labelling surfaces speculation; source citation requirement in all agent prompts |
| Bedrock concurrency limits — 12 parallel agent calls hitting rate limits | MEDIUM | MEDIUM | Implement exponential backoff; queue system for concurrent simulations; test account limits before launch |
| Simulation depth vs. speed tension — 3+ minute wait times deterring users | HIGH | HIGH | The streaming UX IS the product — agent progress cards + live text makes waiting engaging. A/B test depth presets (Quick 6-agent vs. Deep 12-agent) |
| Politically sensitive scenarios — independence, genocide, ethnic conflict scenarios | HIGH | MEDIUM | Content policy: academic framing required; no scenarios advocating real-world violence; moderation queue for flagged outputs |
| Image gen cost spikes — viral simulation generating thousands of images | MEDIUM | LOW | Freemium tier limits images; Runware has no minimum; implement rate limiting per user per day |
| Agent voice inconsistency — synthesis feels like 12 different AI styles | MEDIUM | MEDIUM | Single model (Claude Sonnet), shared stylistic instructions in all agent prompts, synthesis agent normalises voice explicitly |
| Competitor fast-follow — another team builds similar after public launch | MEDIUM | HIGH | First-mover in this specific niche; network effects from public simulation library; World Bible export and cascade engine are moats |
| Legal risk — simulation outputs used for real political manipulation | HIGH | LOW | Clear "simulation only" disclaimers; watermarked exports; Terms of Service prohibiting political influence operations |

---

```
─────────────────────────────────────────────────────────────────
  COUNTERFACT  //  KENESIS LABS PVT LTD  //  2026
  Simulate what history never built.
─────────────────────────────────────────────────────────────────
```
