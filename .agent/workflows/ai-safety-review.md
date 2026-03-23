---
description: AI safety and content moderation review — prompt injection, output validation, content policy, and ethical risk assessment
---

# AI Safety & Content Moderation Review Workflow

Assesses an AI product's safety posture, content moderation strategy, and ethical risk profile.

## Step 1 — Prompt Injection Attack Surface
// turbo-all
1. Identify all user input points that flow into LLM prompts
2. For each input point, assess:
   - Can the user override system prompt instructions?
   - Can the user extract system prompt contents?
   - Can the user manipulate agent output format?
3. Search for known prompt injection attack patterns relevant to the product
4. Recommend input sanitisation and output validation strategies

## Step 2 — Content Safety Assessment
5. Identify scenario categories that require moderation:
   - Genocide / ethnic cleansing scenarios
   - Scenarios targeting real living individuals
   - Scenarios designed to generate propaganda materials
   - Scenarios involving minors or vulnerable populations
6. Define a content policy framework:
   - ALLOWED: Academic, historical, educational, speculative
   - RESTRICTED: Requires framing guardrails (conflict scenarios)
   - BLOCKED: Harmful, illegal, or targeting individuals
7. Search for content moderation best practices in AI products

## Step 3 — Output Validation
8. Assess the risk of generated outputs being:
   - Misrepresented as real intelligence documents
   - Used in disinformation campaigns
   - Shared without attribution or context
9. Recommend output watermarking and disclaimer strategies
10. Search for best practices in AI output labelling

## Step 4 — Data Privacy & Ethics
11. Assess what user data is collected and stored
12. Identify GDPR, CCPA, and Indian DPDPA compliance requirements
13. Evaluate whether user scenarios could be considered sensitive personal data
14. Recommend data retention and deletion policies

## Step 5 — Bias & Fairness
15. Assess potential regional, cultural, or political biases in the simulation engine
16. Identify whether the system could produce systematically biased outputs for certain regions
17. Recommend bias testing and fairness audit procedures
