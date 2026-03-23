"use client";

import { Chip } from "@heroui/react";

interface ConfidenceLabelProps {
  level: string;
}

export function ConfidenceLabel({ level }: ConfidenceLabelProps) {
  const upper = level.toUpperCase();
  const isHigh = upper === "HIGH";
  const isSpeculative = upper === "SPECULATIVE" || upper === "LOW";

  const colorClass = isHigh
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[inset_0_1px_0_rgba(52,211,153,0.1),0_0_12px_rgba(52,211,153,0.08)]"
    : isSpeculative
    ? "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[inset_0_1px_0_rgba(245,158,11,0.1),0_0_12px_rgba(245,158,11,0.08)]"
    : "bg-white/[0.03] text-zinc-400 border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

  return (
    <Chip
      size="sm"
      className={`font-mono text-[10px] tracking-wider border rounded-lg backdrop-blur-sm ${colorClass}`}
    >
      {upper}
    </Chip>
  );
}
