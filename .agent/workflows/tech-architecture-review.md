---
description: Technical architecture review — validates infrastructure choices, identifies gaps, and researches best practices for AI/LLM production systems
---

# Technical Architecture Review Workflow

A deep technical validation of a product's proposed architecture, focused on AI/LLM systems.

## Step 1 — Service-by-Service Validation
// turbo-all
1. For each infrastructure service in the tech stack:
   - Search for current pricing (compute the real cost, not estimates)
   - Search for known rate limits, quotas, and scaling constraints
   - Search for production gotchas and common failure modes
   - Identify free tier limitations that could block development

## Step 2 — LLM Architecture Review
2. Validate the LLM provider choice:
   - Search for current model pricing (input/output tokens)
   - Search for context window limits and token counting strategies
   - Search for concurrency/rate limit documentation
   - Search for alternatives (Gemini, GPT-4o, open-source) and compare price/performance
3. Evaluate the multi-agent orchestration pattern:
   - Search for production multi-agent frameworks (LangGraph, CrewAI, AutoGen)
   - Search for hub-and-spoke vs. graph vs. hierarchical orchestration trade-offs
   - Search for agent evaluation and testing best practices

## Step 3 — Streaming & Real-Time Architecture
4. Validate the streaming approach:
   - Search for SSE vs. WebSocket trade-offs for the use case
   - Search for Next.js App Router SSE production patterns
   - Identify connection timeout and reconnection handling strategies

## Step 4 — Data Layer Review
5. Validate the database choice:
   - Search for DynamoDB item size limits and large-document patterns
   - Search for DynamoDB vs. PostgreSQL for JSON-heavy workloads
   - Identify data migration and backup strategies

## Step 5 — Missing Architecture Components
6. Check for these commonly missing components:
   - Error handling and retry strategy
   - Circuit breaker pattern for external APIs
   - Caching layer (Redis, CDN, in-memory)
   - Observability (logging, tracing, metrics, alerting)
   - Rate limiting and abuse prevention
   - Security (auth, encryption, prompt injection defense)
   - CDN for static assets and generated images
   - Queue/job system for background processing
   - Feature flags for gradual rollout

## Step 6 — Cost Modelling
7. Build an independent cost estimate:
   - Calculate per-request cost for each external service
   - Model monthly costs at 100, 1000, and 10000 active users
   - Identify cost scaling risks (which service becomes expensive first?)
   - Compare against the PDR's unit economics claims
