"use client";

import { Chip } from "@heroui/react";
import { type Domain, type AgentStatus } from "@/lib/engine/types";

interface DomainBadgeProps {
  domain: Domain;
  status?: AgentStatus;
  className?: string;
}

const DOMAIN_EMOJIS: Record<Domain, string> = {
  POLITICAL: "🏛️",
  ECONOMIC: "📈",
  MILITARY: "⚔️",
  TECHNOLOGICAL: "💡",
  SOCIAL: "👥",
  CULTURAL: "🎭",
  ENVIRONMENTAL: "🌍",
  HISTORICAL: "⏳",
  DIPLOMATIC: "🤝",
  LEGAL: "⚖️",
  DEMOGRAPHIC: "👨‍👩‍👧‍👦",
  URBAN_PLANNING: "🏙️",
};

export function DomainBadge({ domain, status, className }: DomainBadgeProps) {
  const getStatusStyle = () => {
    switch (status) {
      case "ACTIVE":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[inset_0_1px_0_rgba(245,158,11,0.1),0_0_12px_rgba(245,158,11,0.1)]";
      case "COMPLETE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[inset_0_1px_0_rgba(52,211,153,0.1),0_0_12px_rgba(52,211,153,0.08)]";
      case "FAILED":
        return "bg-red-500/10 text-red-400 border-red-500/20 shadow-[inset_0_1px_0_rgba(239,68,68,0.1),0_0_12px_rgba(239,68,68,0.08)]";
      case "SKIPPED":
        return "bg-white/[0.02] text-zinc-600 border-white/[0.04]";
      case "DISPATCHED":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[inset_0_1px_0_rgba(59,130,246,0.1),0_0_12px_rgba(59,130,246,0.08)]";
      case "PENDING":
      default:
        return "bg-white/[0.03] text-zinc-500 border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]";
    }
  };

  return (
    <Chip
      size="sm"
      className={`font-mono text-xs border rounded-lg backdrop-blur-sm ${getStatusStyle()} ${className || ""}`}
    >
      <span className="mr-1">{DOMAIN_EMOJIS[domain]}</span>
      {domain}
    </Chip>
  );
}
