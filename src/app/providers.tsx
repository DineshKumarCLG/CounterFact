"use client";

import { HeroUIProvider } from "@heroui/system";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/navigation";
import { AnimatedBackground } from "@/components/ui/AnimatedBackground";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
        <AnimatedBackground />
        {children}
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
