"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Navbar() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 glass-heavy glass-shine"
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

        <div className="hidden sm:flex items-center gap-1">
          {[
            { label: "Simulations", href: "/" },
            { label: "Docs", href: "#" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="relative text-xs text-zinc-500 hover:text-zinc-200 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-all duration-200"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </motion.nav>
  );
}
