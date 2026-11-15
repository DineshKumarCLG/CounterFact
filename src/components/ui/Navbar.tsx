"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BYOKModal,
  PROVIDER_OPTIONS,
  ALL_PROVIDER_OPTIONS,
  type BYOKConfig,
  BYOK_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  BYOK_EVENT_NAME,
  LEGACY_EVENT_NAME,
} from "./BYOKModal";

function subscribeByok(callback: () => void) {
  window.addEventListener(BYOK_EVENT_NAME, callback);
  window.addEventListener(LEGACY_EVENT_NAME, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(BYOK_EVENT_NAME, callback);
    window.removeEventListener(LEGACY_EVENT_NAME, callback);
    window.removeEventListener("storage", callback);
  };
}

function getByokSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      localStorage.getItem(BYOK_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY)
    );
  } catch {
    return null;
  }
}

function getServerSnapshot(): null {
  return null;
}

export function Navbar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const byokRaw = useSyncExternalStore(subscribeByok, getByokSnapshot, getServerSnapshot);

  let byok: BYOKConfig | null = null;
  if (byokRaw) {
    try {
      byok = JSON.parse(byokRaw);
    } catch {
      byok = null;
    }
  }

  const activeProvider = byok?.provider
    ? ALL_PROVIDER_OPTIONS.find((p) => p.id === byok.provider) || ALL_PROVIDER_OPTIONS[0]
    : ALL_PROVIDER_OPTIONS[0];

  const isCustomByok = byok && byok.provider !== "bedrock";

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-40 glass-heavy glass-shine border-b border-white/[0.06]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#7c5cfc] via-[#6366f1] to-[#4f46e5] flex items-center justify-center shadow-[0_2px_12px_rgba(124,92,252,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] group-hover:shadow-[0_4px_20px_rgba(124,92,252,0.5),inset_0_1px_0_rgba(255,255,255,0.3)] transition-shadow duration-300">
                <span className="text-[10px] font-mono font-bold text-white/95 tracking-tight leading-none">CF</span>
              </div>
              <div className="absolute -inset-1.5 rounded-xl bg-[#7c5cfc]/10 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-zinc-100 tracking-tight skeuo-emboss group-hover:text-white transition-colors duration-300">
                Counterfact
              </span>
              <span className="text-[9px] font-mono text-zinc-400 hidden sm:inline -mt-0.5">
                Predictive Simulation Engine
              </span>
            </div>
          </Link>

          {/* Actions & Navigation */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* BYOK Provider Selector & Status Badge */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border transition-all duration-200 bg-white/[0.03] border-white/10 hover:border-purple-500/40 hover:bg-purple-500/10 text-zinc-300 hover:text-white shadow-sm"
              title="Configure API Keys & LLM Provider (BYOK)"
              aria-label="Configure API Keys and BYOK provider"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isCustomByok ? "bg-purple-400 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]" : "bg-emerald-400"
                }`}
              />
              <span className="font-medium">
                {isCustomByok ? activeProvider.name : "Server Default"}
              </span>
              {byok?.modelId && (
                <span className="text-[10px] text-zinc-400 hidden md:inline">
                  ({byok.modelId})
                </span>
              )}
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                  isCustomByok
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold"
                    : "bg-white/[0.06] text-zinc-400"
                }`}
              >
                {isCustomByok ? (byok?.provider === "apple" ? "On-Device" : "BYOK") : "API Keys"}
              </span>
            </button>

            {/* Navigation links */}
            <div className="flex items-center gap-1">
              <Link
                href="/"
                className="text-xs text-zinc-400 hover:text-zinc-100 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] transition-all duration-200"
              >
                Simulations
              </Link>
              <a
                href="https://github.com/DineshKumarCLG/CounterFact#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-400 hover:text-zinc-100 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] transition-all duration-200 hidden sm:inline-block"
              >
                Docs ↗
              </a>
            </div>
          </div>
        </div>
      </motion.nav>

      <BYOKModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
