# CounterFact Python Evaluation Engine

A quantitative local evaluation harness and multi-agent simulation runtime for CounterFact built on **LangGraph**, **LangChain**, and **Pydantic v2**.

## Architecture Overview

CounterFact structures counterfactual scenario modeling as a 7-stage Directed Acyclic Graph (DAG) executed via LangGraph's `StateGraph`:

```
[START]
   │
   ▼
[1. planner] ────────── Divergence point extraction & domain agent weighting
   │
   ▼
[2. baseline_search] ── Archival baseline data retrieval & anchoring
   │
   ▼
[3. specialist_agents]  Parallel multi-domain evaluations (Military, Economic, Tech, etc.)
   │
   ▼
[4. guard] ──────────── Factual grounding & causal consistency validation
   │
   ▼
[5. synthesis] ──────── Cross-domain harmonization & contradiction resolution
   │
   ▼
[6. cascade] ────────── 2nd/3rd-order ripple effects & timeline branching
   │
   ▼
[7. stakeholder] ────── Tripartite debate simulation across affected factions
   │
   ▼
 [END]
```

## Supported Model Providers

CounterFact Python evaluation runtime supports both zero-cloud-egress local models and Bring-Your-Own-Key (BYOK) cloud providers:

### Local Models (Offline & Private)
- **Ollama**: `http://localhost:11434` (default: `llama3.2`)
- **vLLM**: OpenAI-compatible local high-throughput serving (`http://localhost:8000/v1`)
- **HuggingFace**: Direct transformer inference or Inference Endpoints

### BYOK Cloud Providers
- **Google Gemini**: `gemini-2.0-flash`, `gemini-1.5-pro` (`GEMINI_API_KEY`)
- **OpenAI**: `gpt-4o`, `gpt-4o-mini` (`OPENAI_API_KEY`)
- **Anthropic**: `claude-3-5-sonnet-latest`, `claude-3-5-haiku-latest` (`ANTHROPIC_API_KEY`)
- **NVIDIA NIM**: Accelerated models at `integrate.api.nvidia.com` (`NVIDIA_API_KEY`)

## Multi-Tier Evaluation Harness

The evaluation harness scores counterfactual outputs across four fundamental quality dimensions:

| Metric | Dimension | Description |
|---|---|---|
| `grounding_score` | Empirical Grounding | Verifiable historical facts and empirical baseline density |
| `causal_validity_score` | Logical Consistency | Plausibility, absence of anachronisms, and guard verification |
| `domain_coverage_score` | Interdisciplinary Breadth | Cross-disciplinary representation across specialized domains |
| `contradiction_resolution_score` | Tension Resolution | Nuanced resolution of cross-domain conflicting claims |

A composite score is computed using weighted multi-criteria aggregation:
$$\text{Composite Score} = 0.30 \cdot \text{Grounding} + 0.30 \cdot \text{Causal Validity} + 0.20 \cdot \text{Domain Coverage} + 0.20 \cdot \text{Contradiction Resolution}$$

## Installation & Setup

Using `uv` (recommended):
```bash
uv venv
source .venv/bin/activate
uv pip install -e .
```

Or using standard `pip`:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Quickstart Example

```python
from src.graph import run_pipeline
from src.evaluator import evaluate_simulation

# 1. Run simulation through LangGraph pipeline
state = run_pipeline(
    scenario="What if the steam engine had been industrialised in Roman Alexandria in 100 BC?",
    departure_point="100 BC",
)

# 2. Inspect generated state channels
print(f"Active Domains: {state.active_agents}")
print(f"Departure Point: {state.departure_point}")
print(f"Synthesis: {state.synthesis['unified_analysis'][:120]}...")
print(f"Token Consumption: {state.cost_tracking['total_tokens']} tokens")

# 3. Evaluate quantitative quality metrics
metrics = evaluate_simulation(state)
print(f"Composite Score: {metrics.composite_score:.2f}")
print(f"Grounding: {metrics.grounding_score:.2f}")
print(f"Causal Validity: {metrics.causal_validity_score:.2f}")
print(f"Domain Coverage: {metrics.domain_coverage_score:.2f}")
print(f"Contradiction Resolution: {metrics.contradiction_resolution_score:.2f}")
```

## Running Automated Tests

```bash
pytest python/tests/
```
