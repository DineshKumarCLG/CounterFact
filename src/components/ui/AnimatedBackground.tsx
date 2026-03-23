"use client";

import { motion } from "framer-motion";

/**
 * Premium ambient background — layered color orbs with depth.
 * Multiple layers at different blur levels create parallax-like depth.
 */
export function AnimatedBackground() {
  const deepOrbs = [
    { color: "rgba(100, 40, 200, 0.12)", size: 800, x: "20%", y: "15%", duration: 35, blur: 120 },
    { color: "rgba(30, 80, 200, 0.08)", size: 700, x: "80%", y: "25%", duration: 40, blur: 100 },
    { color: "rgba(200, 50, 100, 0.06)", size: 600, x: "60%", y: "80%", duration: 38, blur: 110 },
  ];

  const midOrbs = [
    { color: "rgba(124, 92, 252, 0.18)", size: 500, x: "15%", y: "20%", duration: 22, blur: 80 },
    { color: "rgba(34, 211, 238, 0.10)", size: 420, x: "75%", y: "15%", duration: 28, blur: 70 },
    { color: "rgba(220, 100, 60, 0.08)", size: 380, x: "55%", y: "70%", duration: 25, blur: 75 },
    { color: "rgba(52, 211, 153, 0.07)", size: 350, x: "10%", y: "60%", duration: 30, blur: 65 },
  ];

  const nearOrbs = [
    { color: "rgba(124, 92, 252, 0.06)", size: 300, x: "30%", y: "30%", duration: 18, blur: 50 },
    { color: "rgba(59, 130, 246, 0.05)", size: 250, x: "70%", y: "50%", duration: 20, blur: 45 },
  ];

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Deep base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(124,92,252,0.04) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 80% 20%, rgba(34,211,238,0.03) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 20% 80%, rgba(220,100,60,0.02) 0%, transparent 60%)",
        }}
      />

      {/* Deep layer — slow, large, very blurred */}
      {deepOrbs.map((orb, i) => (
        <motion.div
          key={`deep-${i}`}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 65%)`,
            left: orb.x,
            top: orb.y,
            transform: "translate(-50%, -50%)",
            filter: `blur(${orb.blur}px)`,
          }}
          animate={{
            x: [0, 60, -40, 30, 0],
            y: [0, -40, 30, -50, 0],
            scale: [1, 1.08, 0.96, 1.04, 1],
          }}
          transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Mid layer — medium speed, medium blur */}
      {midOrbs.map((orb, i) => (
        <motion.div
          key={`mid-${i}`}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            left: orb.x,
            top: orb.y,
            transform: "translate(-50%, -50%)",
            filter: `blur(${orb.blur}px)`,
          }}
          animate={{
            x: [0, 35, -25, 15, 0],
            y: [0, -25, 15, -30, 0],
            scale: [1, 1.12, 0.94, 1.06, 1],
          }}
          transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Near layer — faster, smaller, less blur */}
      {nearOrbs.map((orb, i) => (
        <motion.div
          key={`near-${i}`}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            left: orb.x,
            top: orb.y,
            transform: "translate(-50%, -50%)",
            filter: `blur(${orb.blur}px)`,
          }}
          animate={{
            x: [0, 20, -15, 10, 0],
            y: [0, -15, 10, -20, 0],
            scale: [1, 1.15, 0.92, 1.08, 1],
            opacity: [0.8, 1, 0.7, 0.9, 0.8],
          }}
          transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Vignette overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, rgba(3,3,6,0.6) 100%)",
        }}
      />
    </div>
  );
}
