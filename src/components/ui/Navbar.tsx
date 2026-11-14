"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PROVIDER_OPTIONS, type ClientBYOKConfig } from "@/lib/byok-client";
import { ByokModal } from "./ByokModal";

function subscribeByok(callback: () => void) {
  window.addEventListener("cf-byok-changed", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("cf-byok-changed", callback);
    window.removeEventListener("storage", callback);
  };
}

function getByokSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("cf_byok_config");
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

  let byok: ClientBYOKConfig | null = null;
  if (byokRaw) {
    try {
      byok = JSON.parse(byokRaw);
    } catch {
      byok = null;
    }
  }

  const activeProvider = byok?.provider
    ? PROVIDER_OPTIONS.find((p) => p.id === byok.provider) || PROVIDER_OPTIONS[0]
    : PROVIDER_OPTIONS[0];

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-40 glass-heavy glass-shine"
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#7c5cfc] via-[#6366f1] to-[#4f46e5] flex items-center justify-center shadow-[0_2px_12px_rgba(124,92,252,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] group-hover:shadow-[0_4px_20px_rgba(124,92,252,0.5),inset_0_1px_0_rgba(255,255,255,0.3)] transition-shadow duration-300">
                <span className="text-[10px] font-mono font-bold text-white/95 tracking-tight leading-none">CF</span>
              </div>
              <div className="absolute -inset-1.5 rounded-xl bg-[#7c5cfc]/10 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            <span className="text-sm font-semibold text-zinc-200 tracking-tight skeuo-emboss group-hover:text-white transition-colors duration-300">
              Counterfact
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* BYOK Provider Selector Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all duration-200 bg-white/[0.03] border-white/10 hover:border-purple-500/40 hover:bg-purple-500/10 text-zinc-300 hover:text-white"
              title="Configure LLM Provider (BYOK)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{activeProvider.name}</span>
              {byok?.modelId && (
                <span className="text-[10px] text-zinc-400 hidden md:inline">
                  ({byok.modelId})
                </span>
              )}
              <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 ml-0.5">
                BYOK
              </span>
            </button>

            <div className="hidden sm:flex items-center gap-1">
              {[
                { label: "Simulations", href: "/" },
                { label: "Docs", href: "https://github.com/DineshKumarCLG/CounterFact#readme" },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="relative text-xs text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-all duration-200"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </motion.nav>

      <ByokModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
