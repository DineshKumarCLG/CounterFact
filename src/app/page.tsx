"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefinedButton } from "@/components/ui/RefinedButton";
import { RefinedCard } from "@/components/ui/RefinedCard";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import Link from "next/link";

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

function getTimeAgo(dateStr: string): string {
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

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  RUNNING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  PENDING: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
  FAILED: "text-red-400 bg-red-500/10 border-red-500/20",
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
      className="absolute hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-[10px] font-mono text-zinc-500 select-none pointer-events-none"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 0.6, scale: 1 }}
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
  const router = useRouter();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotlightX = useTransform(mouseX, (v) => `${v}px`);
  const spotlightY = useTransform(mouseY, (v) => `${v}px`);

  useEffect(() => {
    fetch("/api/simulations?limit=12")
      .then((r) => r.json())
      .then((data) => setHistory(data.simulations ?? []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  const handleSimulate = async () => {
    if (!scenario.trim()) return;
    setIsSimulating(true);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      if (!res.ok) throw new Error("Failed");
      const { id } = await res.json();
      router.push(`/simulations/${id}`);
    } catch {
      setIsSimulating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSimulate();
    }
  };

  return (
    <div
      className="flex flex-col items-center p-4 space-y-20"
      onMouseMove={(e) => { mouseX.set(e.clientX); mouseY.set(e.clientY); }}
    >

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="relative min-h-[60vh] flex flex-col items-center justify-center w-full">
        {/* Floating ambient badges */}
        <FloatingBadge delay={1.2} x="5%" y="25%">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
          12 domains
        </FloatingBadge>
        <FloatingBadge delay={1.5} x="85%" y="20%">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
          cascade engine
        </FloatingBadge>
        <FloatingBadge delay={1.8} x="8%" y="70%">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60" />
          multi-agent
        </FloatingBadge>
        <FloatingBadge delay={2.0} x="82%" y="72%">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
          AI synthesis
        </FloatingBadge>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-2xl flex flex-col items-center gap-10 relative z-10"
        >
          {/* Title */}
          <motion.div variants={itemVariants} className="text-center space-y-4">
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-[10px] font-mono text-zinc-500 mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#7c5cfc] animate-pulse" />
              Predictive Geopolitical Simulation
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white skeuo-emboss leading-[1.05]">
              <span className="bg-gradient-to-b from-white via-white/90 to-white/50 bg-clip-text text-transparent">
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

            <p className="text-zinc-500 md:text-lg max-w-md mx-auto leading-relaxed">
              Describe a hypothetical scenario and watch cascading consequences unfold across civilizations.
            </p>
          </motion.div>

          {/* Input card */}
          <motion.div variants={itemVariants} className="w-full relative group">
            {/* Spotlight glow that follows focus */}
            <motion.div
              className="absolute -inset-6 rounded-3xl pointer-events-none transition-opacity duration-700"
              style={{
                opacity: isFocused ? 0.6 : 0,
                background: "radial-gradient(ellipse 400px 200px at 50% 50%, rgba(124,92,252,0.08), transparent 70%)",
              }}
            />

            <div className="relative glass-ultra rounded-2xl overflow-hidden glass-shine group-focus-within:border-white/[0.16] transition-all duration-500">
              <textarea
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="e.g. The Roman Empire never falls, leading to an industrialized 5th century..."
                rows={4}
                className="w-full bg-transparent text-lg text-zinc-200 placeholder:text-zinc-700 resize-none p-6 leading-relaxed outline-none relative z-10"
                aria-label="Scenario description"
              />
              <div className="flex justify-between items-center px-6 py-4 bg-black/20 border-t border-white/[0.04] relative z-10">
                <span className="text-xs text-zinc-600 font-mono">
                  Press{" "}
                  <kbd className="px-1.5 py-0.5 text-[11px] text-zinc-400 glass rounded-md border border-white/[0.08]">
                    Enter
                  </kbd>{" "}
                  to simulate
                </span>
                <RefinedButton
                  variant="primary"
                  onPress={handleSimulate}
                  isDisabled={!scenario.trim() || isSimulating}
                  isLoading={isSimulating}
                  className="h-9 px-5 text-sm rounded-xl"
                >
                  {isSimulating ? "Simulating…" : "Simulate →"}
                </RefinedButton>
              </div>
            </div>
          </motion.div>

          {/* Example chips */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[10px] text-zinc-600 mr-1 uppercase tracking-[0.2em] font-semibold">Try</span>
            {EXAMPLES.map((ex) => (
              <motion.button
                key={ex.text}
                onClick={() => setScenario(ex.text)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl glass text-xs text-zinc-500 hover:text-zinc-200 hover:border-white/[0.14] transition-all duration-300 interactive-scale"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span>{ex.icon}</span>
                {ex.text}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* ── Previous Simulations ─────────────────────────── */}
      <div className="w-full max-w-6xl pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            <span className="text-[10px] text-zinc-600 uppercase tracking-[0.25em] font-semibold skeuo-emboss">
              Previous Simulations
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          </div>

          {loadingHistory ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="glass rounded-2xl h-44"
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
              className="text-center py-20"
            >
              <div className="inline-flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center text-2xl">
                  🌍
                </div>
                <p className="text-zinc-600 text-sm">
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
                  const ago = getTimeAgo(sim.created_at);
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
                          className="h-full p-5 hover:border-white/[0.14] transition-all duration-300 group cursor-pointer interactive-lift"
                        >
                          <div className="flex flex-col gap-3 h-full">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-zinc-300 leading-snug line-clamp-2 group-hover:text-white transition-colors duration-300">
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
                              <p className="text-xs text-zinc-600 line-clamp-1">
                                <span className="text-zinc-700">↳</span> {sim.departure_point}
                              </p>
                            )}

                            <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/[0.04]">
                              <div className="flex items-center gap-1.5">
                                {domains.slice(0, 3).map((d: string) => (
                                  <span
                                    key={d}
                                    className="text-[10px] text-zinc-600 font-mono bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.04]"
                                  >
                                    {d}
                                  </span>
                                ))}
                                {domains.length > 3 && (
                                  <span className="text-[10px] text-zinc-700 font-mono">
                                    +{domains.length - 3}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                {sim.cost_cents > 0 && (
                                  <span className="text-[10px] text-zinc-700 font-mono">
                                    ${(sim.cost_cents / 100).toFixed(2)}
                                  </span>
                                )}
                                <span className="text-[10px] text-zinc-700">{ago}</span>
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
    </div>
  );
}
