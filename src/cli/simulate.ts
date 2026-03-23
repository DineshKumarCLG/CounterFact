#!/usr/bin/env tsx

/**
 * Counterfact CLI — Run a simulation from the command line
 *
 * Usage: npx tsx src/cli/simulate.ts "What if Tamil Nadu was independent?"
 */

import chalk from "chalk";
import { runSimulation } from "../lib/engine/pipeline";
import { saveSimulationState } from "../lib/storage/filesystem";
import { saveSimulationMeta } from "../lib/storage/db";
import { DOMAIN_METADATA } from "../lib/engine/domains";
import type { Domain } from "../lib/engine/types";

// Load .env file if it exists
import { config } from "dotenv";
config();

const scenario = process.argv[2];

if (!scenario) {
  console.error(
    chalk.red("\n✗ Please provide a scenario as argument.\n")
  );
  console.log(
    chalk.dim(
      '  Example: npx tsx src/cli/simulate.ts "What if Tamil Nadu was a separate country?"'
    )
  );
  process.exit(1);
}

console.log(chalk.bold("\n╔══════════════════════════════════════════════╗"));
console.log(chalk.bold("║    COUNTERFACT — Geopolitical Simulation     ║"));
console.log(chalk.bold("╚══════════════════════════════════════════════╝\n"));

console.log(chalk.dim("SCENARIO:"), chalk.yellow(scenario));
console.log(chalk.dim("─".repeat(50)));

const startTime = Date.now();

try {
  const state = await runSimulation(scenario, {
    onSafetyCheck: (status, reason) => {
      const color =
        status === "ALLOWED"
          ? chalk.green
          : status === "RESTRICTED"
            ? chalk.yellow
            : chalk.red;
      console.log(`\n${chalk.dim("[F00 SAFETY]")} ${color(status)} — ${reason}`);
      if (status === "BLOCKED") {
        console.log(chalk.red("\n✗ Simulation blocked by safety pipeline.\n"));
      }
    },

    onPlannerComplete: (domains, weights) => {
      console.log(
        `\n${chalk.dim("[PLANNER]")} ${chalk.cyan("Decomposition complete")}`
      );
      console.log(chalk.dim(`  Active domains (${domains.length}):`));
      for (const d of domains) {
        const meta = DOMAIN_METADATA[d];
        const w = (weights[d] ?? 0).toFixed(1);
        console.log(`    ${meta.emoji} ${meta.code} — ${meta.label} [${w}]`);
      }
    },

    onAgentStart: (domain) => {
      const meta = DOMAIN_METADATA[domain];
      console.log(
        `\n${chalk.dim("[AGENT]")} ${meta.emoji} ${chalk.cyan(meta.code)} dispatched...`
      );
    },

    onAgentComplete: (domain, confidence) => {
      const meta = DOMAIN_METADATA[domain];
      const confColor =
        confidence === "HIGH"
          ? chalk.green
          : confidence === "MODERATE"
            ? chalk.yellow
            : chalk.red;
      console.log(
        `  ${chalk.dim("[AGENT]")} ${meta.emoji} ${chalk.green(meta.code)} ✓ complete — ${confColor(confidence)}`
      );
    },

    onAgentFailed: (domain, error) => {
      const meta = DOMAIN_METADATA[domain];
      console.log(
        `  ${chalk.dim("[AGENT]")} ${meta.emoji} ${chalk.red(meta.code)} ✗ FAILED — ${error}`
      );
    },

    onGuardResult: (domain, passed, issues) => {
      const meta = DOMAIN_METADATA[domain as Domain];
      if (passed) {
        console.log(
          `  ${chalk.dim("[GUARD]")} ${meta.code} — ${chalk.green("PASSED")}`
        );
      } else {
        console.log(
          `  ${chalk.dim("[GUARD]")} ${meta.code} — ${chalk.red("FAILED")}: ${issues.join(", ")}`
        );
      }
    },

    onSynthesisStart: () => {
      console.log(
        `\n${chalk.dim("[SYNTHESIS]")} ${chalk.cyan("Combining agent reports...")}`
      );
    },

    onSynthesisComplete: () => {
      console.log(
        `  ${chalk.dim("[SYNTHESIS]")} ${chalk.green("✓ Unified analysis complete")}`
      );
    },

    onCascadeStart: () => {
      console.log(
        `\n${chalk.dim("[CASCADE]")} ${chalk.cyan("Modelling ripple effects...")}`
      );
    },

    onCascadeComplete: () => {
      console.log(
        `  ${chalk.dim("[CASCADE]")} ${chalk.green("✓ Cascade tree + scenario paths generated")}`
      );
    },

    onCostUpdate: (cost) => {
      console.log(`\n${chalk.dim("─".repeat(50))}`);
      console.log(chalk.dim("[COST]"), `$${cost.totalCostUsd.toFixed(4)}`);
      console.log(
        chalk.dim(`  Input:  ${cost.totalInputTokens} tokens ($${cost.inputCostUsd.toFixed(4)})`)
      );
      console.log(
        chalk.dim(`  Output: ${cost.totalOutputTokens} tokens ($${cost.outputCostUsd.toFixed(4)})`)
      );
      console.log(
        chalk.dim(`  Search: ${cost.searchCalls} queries`)
      );
    },
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (state.safetyResult.status === "BLOCKED") {
    process.exit(0);
  }

  // Save state
  saveSimulationState(state);
  saveSimulationMeta({
    id: state.id,
    scenario: state.scenario,
    departurePoint: state.departurePoint,
    status: state.synthesis ? "COMPLETE" : "PARTIAL",
    agentCount: state.activeAgents.length,
    domains: state.activeAgents.join(","),
    costCents: Math.round(state.costTracking.totalCostUsd * 100),
    promptVersion: state.promptVersion,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  });

  // Print summary
  console.log(`\n${chalk.bold("═".repeat(50))}`);
  console.log(chalk.bold("SIMULATION COMPLETE"));
  console.log(chalk.bold("═".repeat(50)));
  console.log(chalk.dim(`ID:       ${state.id}`));
  console.log(chalk.dim(`Time:     ${elapsed}s`));
  console.log(chalk.dim(`Agents:   ${state.activeAgents.length}`));
  console.log(chalk.dim(`Status:   ${state.synthesis ? "COMPLETE" : "PARTIAL"}`));
  console.log(chalk.dim(`Cost:     $${state.costTracking.totalCostUsd.toFixed(4)}`));

  if (state.synthesis) {
    console.log(`\n${chalk.bold("UNIFIED ANALYSIS")}`);
    console.log(chalk.dim("─".repeat(50)));
    console.log(state.synthesis.unifiedAnalysis.substring(0, 2000));
    if (state.synthesis.unifiedAnalysis.length > 2000) {
      console.log(chalk.dim("\n... [truncated — see full output in data/simulations/]"));
    }

    if (state.synthesis.contradictions.length > 0) {
      console.log(`\n${chalk.bold("CONTRADICTIONS")}`);
      for (const c of state.synthesis.contradictions) {
        console.log(
          `  ${chalk.yellow("⚡")} ${c.description} → ${chalk.cyan(c.mode)}: ${c.resolution}`
        );
      }
    }

    console.log(`\n${chalk.dim("Overall confidence:")} ${chalk.bold(state.synthesis.overallConfidence)}`);
  }

  if (state.cascades) {
    console.log(`\n${chalk.bold("CASCADE TREE")}`);
    console.log(chalk.dim("─".repeat(50)));
    console.log(chalk.dim(`  Nodes: ${state.cascades.cascadeTree.nodes.length}`));
    console.log(chalk.dim(`  Edges: ${state.cascades.cascadeTree.edges.length}`));
    console.log(chalk.dim(`  Feedback loops: ${state.cascades.cascadeTree.feedbackLoops.length}`));

    console.log(`\n${chalk.bold("SCENARIO PATHS")}`);
    for (const path of state.cascades.scenarioPaths) {
      const icon = path.type === "OPTIMISTIC" ? "🟢" : path.type === "BASE_CASE" ? "🟡" : "🔴";
      console.log(`  ${icon} ${chalk.bold(path.label)}`);
      console.log(`     ${chalk.dim(path.summary.substring(0, 200))}`);
      if (path.keyMilestones.length > 0) {
        for (const m of path.keyMilestones.slice(0, 3)) {
          console.log(`     ${chalk.dim(`Year ${m.year}:`)} ${m.event}`);
        }
        if (path.keyMilestones.length > 3) {
          console.log(chalk.dim(`     ... +${path.keyMilestones.length - 3} more milestones`));
        }
      }
    }
  }

  console.log(
    `\n${chalk.dim("Full state saved to:")} ./data/simulations/${state.id}/state.json\n`
  );
} catch (error) {
  console.error(chalk.red("\n✗ Simulation failed:"), (error as Error).message);
  if (process.env.DEBUG) {
    console.error(error);
  }
  process.exit(1);
}
