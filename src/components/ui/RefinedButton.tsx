import { Button, type ButtonProps } from "@heroui/react";
import { clsx } from "clsx";

interface RefinedButtonProps extends Omit<ButtonProps, "variant"> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  isLoading?: boolean;
}

export function RefinedButton({
  children,
  className,
  variant = "primary",
  isLoading,
  ...props
}: RefinedButtonProps) {
  return (
    <Button
      className={clsx(
        "font-medium h-10 px-6 rounded-xl interactive-scale truncate transition-all duration-300 relative overflow-hidden",
        variant === "primary" &&
          "bg-gradient-to-b from-[#8b6fff] via-[#7c5cfc] to-[#6346e8] text-white border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.2),0_4px_16px_rgba(124,92,252,0.35),0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_24px_rgba(124,92,252,0.5),0_2px_8px_rgba(0,0,0,0.3)] hover:brightness-110",
        variant === "secondary" &&
          "glass text-zinc-300 hover:text-white hover:border-white/15 hover:bg-white/[0.08]",
        variant === "ghost" &&
          "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06]",
        variant === "danger" &&
          "bg-gradient-to-b from-red-900/40 to-red-950/60 text-red-400 border border-red-800/30 shadow-[inset_0_1px_0_rgba(255,100,100,0.1),0_2px_8px_rgba(200,0,0,0.15)] hover:border-red-700/40 hover:text-red-300",
        isLoading && "opacity-70 cursor-wait",
        className
      )}
      isDisabled={isLoading || props.isDisabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children as React.ReactNode}
        </span>
      ) : (
        children
      )}
    </Button>
  );
}
