"use client";

import { useState } from "react";

import { FlaskConical, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { swapReveal, swapTransition } from "@/components/dashboard/motion-presets";
import { Button } from "@/components/ui/button";

export function DemoSignInButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDemoSignIn() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/demo/sign-in", {
        method: "POST"
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Demo sign-in failed.");
      }

      window.location.href = "/dashboard";
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Demo sign-in failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleDemoSignIn}
        disabled={isLoading}
        size="lg"
        className="w-full"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {isLoading ? (
            <motion.span
              key="demo-loading"
              className="inline-flex items-center gap-2"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={swapReveal}
              transition={swapTransition}
            >
              <Loader2 className="size-4 animate-spin" />
              Entering demo workspace...
            </motion.span>
          ) : (
            <motion.span
              key="demo-idle"
              className="inline-flex items-center gap-2"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={swapReveal}
              transition={swapTransition}
            >
              <FlaskConical className="size-4" />
              Use demo account
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
