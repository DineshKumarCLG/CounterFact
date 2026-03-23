---
description: Deep analysis of a Product Design Requirements (PDR) document — validates vision, architecture, market, UX, and technical feasibility
---

# PDR Deep Analysis Workflow

This workflow performs a comprehensive, multi-pass analysis of a Product Design Requirements document.

## Phase 1 — Document Inventory
1. Read the entire PDR document using `view_file`
2. Create a section index listing all major sections, their line ranges, and a one-line summary of each
3. Identify the product category, target market, and technical domain

## Phase 2 — Competitive Landscape Research
4. Search the web for direct competitors mentioned in the PDR
5. Search for competitors NOT mentioned — use the product category to find overlooked players
6. Search for adjacent tools that serve the same personas
7. For each competitor found, document: name, features, pricing, differentiation, and any weakness Counterfact could exploit
8. Search for recent industry reports or analyst coverage of the product space

## Phase 3 — Technical Architecture Validation
9. Search for best practices and production patterns for the core technical architecture (e.g., multi-agent AI, streaming, LLM orchestration)
10. Validate infrastructure choices — search for known limits, pricing, and gotchas for each service (e.g., AWS Bedrock rate limits, DynamoDB item size limits)
11. Search for alternative technical approaches that could be superior
12. Identify missing architectural components (error handling, caching, observability, security)

## Phase 4 — Design System & UX Review
13. Evaluate the design system against accessibility standards (WCAG AA)
14. Search for design trend references mentioned in the PDR to validate relevance
15. Check colour contrast ratios for all text/background combinations
16. Identify missing UX states (error, empty, loading, offline)

## Phase 5 — Business Model Validation
17. Search for pricing benchmarks of comparable SaaS/AI products
18. Validate unit economics calculations independently
19. Identify missing revenue streams or growth strategies
20. Assess pricing tier structure against target personas

## Phase 6 — Risk & Feasibility Assessment
21. Evaluate timeline realism based on team size assumptions and scope
22. Identify risks NOT covered in the risk section
23. Search for legal/regulatory considerations in the product domain
24. Assess prompt injection and AI safety attack surfaces

## Phase 7 — Synthesis & Recommendations
25. Create a comprehensive analysis artifact with:
    - Section-by-section rating (1-5 stars)
    - Top 10 prioritised recommendations (ranked by impact × effort)
    - Missing sections to add
    - Suggested v2 document outline
26. Present to user via `notify_user` with PathsToReview
