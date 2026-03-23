---
description: Business model and monetisation validation — pricing benchmarks, unit economics, go-to-market strategy assessment
---

# Business Model Validation Workflow

Deep validation of a product's monetisation strategy, pricing, unit economics, and go-to-market plan.

## Step 1 — Pricing Benchmark Research
// turbo-all
1. Search for pricing of 5-10 comparable AI SaaS products
2. Search for freemium conversion rate benchmarks in AI/developer tools
3. Search for average revenue per user (ARPU) in the product category
4. Identify common pricing models in the space (subscription, usage-based, credit-based, hybrid)

## Step 2 — Unit Economics Validation
5. Independently calculate the cost per core action (e.g., per simulation, per API call):
   - LLM token costs (input + output, per agent, per provider)
   - Image generation costs (per image, per provider)
   - Search API costs (per query, per provider)
   - Database read/write costs
   - Storage costs (S3, CDN bandwidth)
   - Compute costs (Lambda, serverless)
6. Compare calculated costs against PDR estimates
7. Model costs at scale: 100, 1K, 10K, 100K monthly active users
8. Calculate break-even point (users needed to cover infrastructure costs)

## Step 3 — Tier Structure Analysis
9. For each pricing tier, assess:
   - Does the feature set match the target persona's needs?
   - Is there a clear upgrade trigger (what makes a free user need paid?)
   - Is the jump between tiers justified by features?
   - Are there anti-patterns (e.g., free tier too generous, middle tier cannibalised)?

## Step 4 — Go-To-Market Assessment
10. Identify acquisition channels referenced or missing in the PDR
11. Search for successful launch strategies of comparable AI products
12. Assess viral/referral potential of the product
13. Identify content marketing opportunities specific to the product domain
14. Assess community building potential (Reddit, Discord, YouTube)

## Step 5 — Revenue Projection
15. Build a simple revenue model:
    - Month 1-6: beta users (free), estimate conversion at launch
    - Month 6-12: estimate MRR based on user growth assumptions
    - Identify the path to $10K MRR / $100K MRR
16. Identify the biggest risk to the revenue model
