"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { RefinedButton } from "@/components/ui/RefinedButton";
import { RefinedCard } from "@/components/ui/RefinedCard";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  BYOKModal,
  getBYOKConfig,
  getBYOKHeaders,
  PROVIDER_OPTIONS,
  type BYOKConfig,
  BYOK_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  BYOK_EVENT_NAME,
  LEGACY_EVENT_NAME,
} from "@/components/ui/BYOKModal";

interface SimRecord {
  id: string;
  scenario: string;
  departure_point: string;
  status: string;
  agent_count: number;
  domains: string;
  cost_cents: number;
  created_at: string;
}

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

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  COMPLETE: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  PARTIAL: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  RUNNING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  PENDING: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  FAILED: "text-red-400 bg-red-500/10 border-red-500/20",
  BLOCKED: "text-red-400 bg-red-500/10 border-red-500/20",
};

const EXAMPLES = [
  { text: "AI becomes sentient in 1995", icon: "🤖" },
  { text: "Antarctica is perfectly habitable", icon: "🏔️" },
  { text: "Universal Basic Income since 2000", icon: "💰" },
  { text: "The Roman Empire never fell", icon: "🏛️" },
];

/* ── Stagger animation variants ── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

/* ── Floating badge component ── */
function FloatingBadge({ children, delay, x, y }: { children: React.ReactNode; delay: number; x: string; y: string }) {
  return (
    <motion.div
      className="absolute hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-[10px] font-mono text-zinc-400 select-none pointer-events-none"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 0.7, scale: 1 }}
      transition={{ delay, duration: 0.8, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const [scenario, setScenario] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [history, setHistory] = useState<SimRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [isByokModalOpen, setIsByokModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

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
    ? PROVIDER_OPTIONS.find((p) => p.id === byok.provider) || PROVIDER_OPTIONS[0]
    : PROVIDER_OPTIONS[0];

  const isCustomByok = byok && byok.provider !== "bedrock";

  useEffect(() => {
    setIsMounted(true);
    fetch("/api/simulations?limit=12")
      .then((r) => r.json())
      .then((data) => setHistory(data.simulations ?? []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  const handleSimulate = async () => {
    const trimmed = scenario.trim();
    if (!trimmed || isSimulating) return;

    setIsSimulating(true);
    setError(null);

    try {
      const activeByok = getBYOKConfig();
      const byokPayload = activeByok && activeByok.provider !== "bedrock" ? {
        provider: activeByok.provider,
        apiKey: activeByok.apiKey,
        modelId: activeByok.modelId,
        baseUrl: activeByok.baseUrl,
      } : undefined;

      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getBYOKHeaders(),
        },
        body: JSON.stringify({
          scenario: trimmed,
          ...(byokPayload ? { byok: byokPayload } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          data.details ||
          data.error ||
          `Simulation creation failed (Status ${res.status}). Please verify your scenario and provider settings.`;
        throw new Error(message);
      }

      const data = await res.json();
      const id = data?.id;

      if (id && data?.state && typeof window !== "undefined") {
        try {
          localStorage.setItem(`counterfact_sim_${id}`, JSON.stringify(data.state));
        } catch (storageErr) {
          console.warn("Failed to cache simulation state in localStorage:", storageErr);
        }
      }

      router.push(`/simulations/${id}`);
    } catch (err) {
      setIsSimulating(false);
      setError(
        err instanceof Error
          ? err.message
          : "Engine connection failed. Please check your network and provider keys."
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSimulate();
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex-1 flex flex-col items-center space-y-16">
      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="relative min-h-[55vh] flex flex-col items-center justify-center w-full">
        {/* Floating ambient badges */}
        <FloatingBadge delay={1.2} x="5%" y="25%">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
          12 domains
        </FloatingBadge>
        <FloatingBadge delay={1.5} x="85%" y="20%">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80" />
          cascade engine
        </FloatingBadge>
        <FloatingBadge delay={1.8} x="8%" y="70%">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400/80" />
          multi-agent
        </FloatingBadge>
        <FloatingBadge delay={2.0} x="82%" y="72%">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
          AI synthesis
        </FloatingBadge>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-2xl flex flex-col items-center gap-8 relative z-10"
        >
          {/* Title */}
          <motion.div variants={itemVariants} className="text-center space-y-4">
            <motion.div
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass text-[11px] font-mono text-zinc-300 mb-2 border border-white/10"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <span className="w-2 h-2 rounded-full bg-[#7c5cfc] animate-pulse" />
              Predictive Geopolitical Simulation
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white skeuo-emboss leading-[1.05]">
              <span className="bg-gradient-to-b from-white via-white/90 to-white/60 bg-clip-text text-transparent">
                What if
              </span>
              <motion.span
                className="bg-gradient-to-r from-[#7c5cfc] to-[#22d3ee] bg-clip-text text-transparent"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                ?
              </motion.span>
            </h1>

            <p className="text-zinc-400 md:text-lg max-w-md mx-auto leading-relaxed">
              Describe a hypothetical scenario and watch cascading consequences unfold across civilizations.
            </p>
          </motion.div>

          {/* Inline Error Alert Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs sm:text-sm flex items-start justify-between gap-3 shadow-lg backdrop-blur-md"
            >
              <div className="flex items-start gap-2.5">
                <span className="text-red-400 font-bold text-base leading-none mt-0.5">⚠</span>
                <div>
                  <p className="font-semibold text-red-100">Simulation Error</p>
                  <p className="text-xs text-red-300/90 mt-0.5 leading-relaxed">{error}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsByokModalOpen(true)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 transition-colors border border-red-500/30"
                >
                  Configure BYOK
                </button>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="p-1 text-red-400 hover:text-red-200 rounded transition-colors"
                  aria-label="Dismiss error"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}

          {/* Input card */}
          <motion.div variants={itemVariants} className="w-full relative group">
            {/* Spotlight glow that follows focus */}
            <motion.div
              className="absolute -inset-6 rounded-3xl pointer-events-none transition-opacity duration-700"
              style={{
                opacity: isFocused ? 0.6 : 0,
                background: "radial-gradient(ellipse 400px 200px at 50% 50%, rgba(124,92,252,0.12), transparent 70%)",
              }}
            />

            <div className="relative glass-ultra rounded-2xl overflow-hidden glass-shine group-focus-within:border-white/[0.2] transition-all duration-500 border border-white/10">
              <textarea
                value={scenario}
                onChange={(e) => {
                  setScenario(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="e.g. The Roman Empire never falls, leading to an industrialized 5th century..."
                rows={4}
                className="w-full bg-transparent text-lg text-zinc-100 placeholder:text-zinc-500 resize-none p-6 leading-relaxed outline-none relative z-10"
                aria-label="Scenario description"
              />

              {/* Textarea Toolbar & Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-6 py-3.5 bg-black/40 border-t border-white/[0.06] relative z-10">
                {/* Active BYOK Indicator Chip */}
                <button
                  type="button"
                  onClick={() => setIsByokModalOpen(true)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-mono bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white transition-all shadow-sm"
                  title="Configure LLM Provider (BYOK)"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isCustomByok ? "bg-purple-400 animate-pulse" : "bg-emerald-400"
                    }`}
                  />
                  <span className="text-zinc-400">Provider:</span>
                  <span className="font-medium text-zinc-200">
                    {isCustomByok ? activeProvider.name : "Server Default"}
                  </span>
                  {byok?.modelId && (
                    <span className="text-[10px] text-zinc-400 hidden sm:inline">
                      ({byok.modelId})
                    </span>
                  )}
                  <span className="text-[9px] text-purple-300 bg-purple-500/20 px-1 py-0.5 rounded border border-purple-500/30">
                    BYOK ⚙
                  </span>
                </button>

                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                  <span className="text-xs text-zinc-400 font-mono hidden md:inline">
                    Press{" "}
                    <kbd className="px-1.5 py-0.5 text-[11px] text-zinc-300 glass rounded-md border border-white/[0.12]">
                      Enter
                    </kbd>{" "}
                    to simulate
                  </span>
                  <RefinedButton
                    variant="primary"
                    onPress={handleSimulate}
                    isDisabled={!scenario.trim() || isSimulating}
                    isLoading={isSimulating}
                    className="h-9 px-5 text-sm rounded-xl font-medium"
                  >
                    {isSimulating ? "Simulating…" : "Simulate →"}
                  </RefinedButton>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Example chips */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[10px] text-zinc-400 mr-1 uppercase tracking-[0.2em] font-semibold">Try</span>
            {EXAMPLES.map((ex) => (
              <motion.button
                key={ex.text}
                onClick={() => {
                  setScenario(ex.text);
                  if (error) setError(null);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl glass text-xs text-zinc-400 hover:text-zinc-200 hover:border-white/[0.18] transition-all duration-300 interactive-scale border border-white/[0.08]"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span>{ex.icon}</span>
                <span>{ex.text}</span>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* ── Previous Simulations ─────────────────────────── */}
      <div className="w-full max-w-6xl pb-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            <span className="text-[11px] text-zinc-400 uppercase tracking-[0.25em] font-semibold skeuo-emboss">
              Previous Simulations
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          </div>

          {loadingHistory ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="glass rounded-2xl h-44 border border-white/[0.06]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
          ) : history.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="inline-flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center text-2xl border border-white/10">
                  🌍
                </div>
                <p className="text-zinc-400 text-sm">
                  No simulations yet. Describe a scenario above to explore alternate realities.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence mode="popLayout">
                {history.map((sim) => {
                  const domains = sim.domains
                    ? sim.domains.split(",").map((d: string) => d.trim()).filter(Boolean)
                    : [];
                  const ago = isMounted ? formatRelativeTime(sim.created_at) : "";
                  return (
                    <motion.div
                      key={sim.id}
                      variants={itemVariants}
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                    >
                      <Link href={`/simulations/${sim.id}`}>
                        <RefinedCard
                          cardStyle="glass"
                          className="h-full p-5 hover:border-white/[0.18] transition-all duration-300 group cursor-pointer interactive-lift border border-white/[0.08]"
                        >
                          <div className="flex flex-col gap-3 h-full">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-zinc-200 leading-snug line-clamp-2 group-hover:text-white transition-colors duration-300">
                                {sim.scenario}
                              </p>
                              <span
                                className={`shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                  STATUS_COLORS[sim.status] ?? STATUS_COLORS.PENDING
                                }`}
                              >
                                {sim.status}
                              </span>
                            </div>

                            {sim.departure_point && (
                              <p className="text-xs text-zinc-400 line-clamp-1">
                                <span className="text-zinc-500">↳</span> {sim.departure_point}
                              </p>
                            )}

                            <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/[0.06]">
                              <div className="flex items-center gap-1.5">
                                {domains.slice(0, 3).map((d: string) => (
                                  <span
                                    key={d}
                                    className="text-[10px] text-zinc-400 font-mono bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]"
                                  >
                                    {d}
                                  </span>
                                ))}
                                {domains.length > 3 && (
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    +{domains.length - 3}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                {sim.cost_cents > 0 && (
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    ${(sim.cost_cents / 100).toFixed(2)}
                                  </span>
                                )}
                                <span className="text-[10px] text-zinc-400">{ago}</span>
                              </div>
                            </div>
                          </div>
                        </RefinedCard>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </div>

      <BYOKModal isOpen={isByokModalOpen} onClose={() => setIsByokModalOpen(false)} />
    </div>
  );
}
