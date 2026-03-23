import { Card, CardProps } from "@heroui/react";
import { clsx } from "clsx";

interface RefinedCardProps extends Omit<CardProps, "shadow"> {
  cardStyle?: "glass" | "solid" | "well" | "ultra";
}

/**
 * Premium card with layered glassmorphism depth.
 * - glass: frosted translucent panel
 * - solid: opaque raised surface with inner highlight
 * - well: recessed inset surface
 * - ultra: hero-level glass with maximum depth
 */
export function RefinedCard({
  children,
  className,
  cardStyle = "glass",
  ...props
}: RefinedCardProps) {
  return (
    <Card
      className={clsx(
        "rounded-2xl overflow-hidden shadow-none",
        cardStyle === "glass" && "glass glass-shine",
        cardStyle === "solid" && "bg-[#0a0a14]/90 border border-white/[0.06] skeuo-raised backdrop-blur-sm",
        cardStyle === "well" && "glass-well rounded-xl",
        cardStyle === "ultra" && "glass-ultra glass-shine",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}
