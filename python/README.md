# CounterFact Python Evaluation Engine

> *LangGraph & LangChain implementation of CounterFact with local model support (Ollama) and Bring-Your-Own-Key (BYOK) multi-provider evaluation.*

---

## Features

- **Multi-Agent Directed Graph**: StateGraph DAG orchestrated with LangGraph (Planner → Domain Specialists → Causal Guard → Synthesis → Cascades & Stakeholder Debate).
- **Local LLM Execution**: Default support for local models via **Ollama** (`llama3.2`, `mistral`, `deepseek-r1`, etc.) with zero cloud egress.
- **BYOK Multi-Provider Access**: Seamless cloud switching for **Google Gemini**, **OpenAI**, **Anthropic**, and **NVIDIA NIM**.
- **Rigorous Evaluation Harness**: Built-in automated scoring of counterfactual plausibility:
  - `grounding_score`: empirical baseline factual anchoring
  - `causal_validity`: logic consistency across historical departure points
  - `domain_coverage`: interdisciplinary breadth
  - `contradiction_resolution`: coherence in resolving multi-agent divergence

---

## Architecture

```
                    ┌─────────────────┐
                    │ Scenario Input  │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │  Planner Agent  │ (Domain weighting & Departure Point)
                    └────────┬────────┘
                             ▼
            ┌─────────────────────────────────┐
            │   Parallel Domain Specialists   │ (Military, Economic, Political...)
            └────────────────┬────────────────┘
                             ▼
                    ┌─────────────────┐
                    │   Guard Agent   │ (Causal plausibility check)
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │ Synthesis Agent │ (Unified analysis & Contradictions)
                    └────────┬────────┘
                             ├──────────────────────────┐
                             ▼                          ▼
                    ┌─────────────────┐        ┌─────────────────┐
                    │ Cascade Paths   │        │   Stakeholder   │
                    │ & Tipping Points│        │     Debate      │
                    └────────┬────────┘        └────────┬────────┘
                             └──────────┬───────────────┘
                                        ▼
                               ┌─────────────────┐
                               │ Completed State │
                               └─────────────────┘
```

---

## Quickstart

### 1. Requirements
- Python 3.10+
- (Optional) [Ollama](https://ollama.ai) installed and running locally for local models

### 2. Installation
```bash
cd python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Environment Configuration
Copy the template and configure your preferred provider:
```bash
cp .env.example .env
```

### 4. Running a Simulation
Run with local Ollama:
```bash
python -m counterfact.cli "What if the Library of Alexandria had never burned down?"
```

Run with Google Gemini (BYOK):
```bash
python -m counterfact.cli "What if AI was invented during the Industrial Revolution?" \
  --provider gemini \
  --api-key your_gemini_api_key \
  --eval
```

Run with Anthropic Claude (BYOK):
```bash
python -m counterfact.cli "What if the Roman Empire never fell?" \
  --provider anthropic \
  --api-key your_anthropic_api_key \
  --eval
```

Run with NVIDIA NIM:
```bash
python -m counterfact.cli "What if electricity was harnessed in 1500?" \
  --provider nvidia \
  --api-key your_nvidia_api_key \
  --eval
```

### 5. Running the Tests
```bash
pytest tests/ -v
```
