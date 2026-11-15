"""
Command-line interface (CLI) for CounterFact Python LangGraph engine.
Supports on-device Apple Foundation Model inference and Caveman token optimization.
"""

import argparse
import sys
import json
from .config import get_default_config
from .graph.workflow import run_counterfact_workflow
from .eval.evaluate import evaluate_simulation


def main():
    parser = argparse.ArgumentParser(
        description="CounterFact: Multi-Agent Speculative Counterfactual Simulation (Python/LangGraph)"
    )
    parser.add_argument(
        "scenario",
        nargs="?",
        default="What if the Library of Alexandria had never burned down?",
        help="The counterfactual 'What If' question to simulate",
    )
    parser.add_argument(
        "--provider",
        choices=["ollama", "gemini", "openai", "anthropic", "nvidia", "apple", "apple_foundation"],
        default=None,
        help="LLM provider (defaults to LLM_PROVIDER or apple)",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Model ID override",
    )
    parser.add_argument(
        "--api-key",
        default=None,
        help="BYOK API key override",
    )
    parser.add_argument(
        "--base-url",
        default=None,
        help="Custom base URL endpoint",
    )
    parser.add_argument(
        "--caveman",
        action="store_true",
        default=True,
        help="Enable Caveman prompt compression style (default: True)",
    )
    parser.add_argument(
        "--no-caveman",
        action="store_false",
        dest="caveman",
        help="Disable Caveman prompt compression style",
    )
    parser.add_argument(
        "--eval",
        action="store_true",
        help="Run the evaluation harness on the completed simulation",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw JSON state",
    )

    args = parser.parse_args()
    default_cfg = get_default_config()

    provider = args.provider or default_cfg.provider or "apple"
    api_key = args.api_key or default_cfg.api_key
    if args.model:
        model_id = args.model
    elif provider in ("apple", "apple_foundation", "apple-foundation"):
        model_id = "apple/foundation-model-3b"
    else:
        model_id = default_cfg.model_id
    base_url = args.base_url or default_cfg.base_url

    print("=" * 60)
    print(" COUNTERFACT: Multi-Agent Simulation Engine")
    print(f" Provider: {provider.upper()} | Model: {model_id or 'apple/foundation-model-3b'}")
    print(f" Prompt Mode: {'CAVEMAN (Token-Optimized)' if args.caveman else 'STANDARD'}")
    print(f" Scenario: {args.scenario}")
    print("=" * 60)

    try:
        result = run_counterfact_workflow(
            scenario=args.scenario,
            provider=provider,
            api_key=api_key,
            model_id=model_id,
            base_url=base_url,
            caveman=args.caveman,
        )

        if args.json:
            print(json.dumps(result, default=str, indent=2))
            return

        planner = result.get("planner_output")
        if planner:
            print(f"\n[Departure Point]: {planner.departure_point}")
            print(f"[Active Domains]: {', '.join([d.value for d in planner.active_agents])}")

        synthesis = result.get("synthesis")
        if synthesis:
            print("\n[Unified Synthesis Analysis]:")
            print(synthesis.unified_analysis[:1000] + ("..." if len(synthesis.unified_analysis) > 1000 else ""))

        costs = result.get("cost_tracking", {})
        if costs:
            print("\n" + "=" * 60)
            print(" TOKEN CONSUMPTION & EFFICIENCY (Caveman Optimization)")
            print("=" * 60)
            print(f" Total Tokens Consumed:       {costs.get('total_tokens', 0)}")
            print(f"   - Prompt Tokens:           {costs.get('prompt_tokens', 0)}")
            print(f"   - Completion Tokens:       {costs.get('completion_tokens', 0)}")
            print(f" Uncompressed Baseline:       {costs.get('uncompressed_baseline_tokens', 0)}")
            print(f" Tokens Saved:                {costs.get('tokens_saved', 0)} ({costs.get('reduction_percentage', 0)}% reduction)")
            print(f" Cloud Egress Cost:           ${costs.get('cost_usd', 0.0):.4f} (Zero Cloud Egress - Apple On-Device)")
            print("=" * 60)

        if args.eval:
            eval_metrics = evaluate_simulation(result)
            print("\n" + "=" * 60)
            print(" EVALUATION HARNESS REPORT")
            print("=" * 60)
            print(f" Grounding Score:            {eval_metrics.grounding_score:.3f}")
            print(f" Causal Validity:            {eval_metrics.causal_validity:.3f}")
            print(f" Domain Coverage:            {eval_metrics.domain_coverage:.3f}")
            print(f" Contradiction Resolution:   {eval_metrics.contradiction_resolution:.3f}")
            print(f" Overall Quality Score:      {eval_metrics.overall_score:.3f}")
            print(f" Summary: {eval_metrics.summary}")
            print("=" * 60)

    except Exception as e:
        print(f"\n[Simulation Error]: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
