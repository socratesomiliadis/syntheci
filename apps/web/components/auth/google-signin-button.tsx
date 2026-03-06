"use client";

import { useState } from "react";

import { Chrome, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { swapReveal, swapTransition } from "@/components/dashboard/motion-presets";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    setIsLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard"
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button type="button" onClick={handleSignIn} disabled={isLoading} size="lg" className="w-full">
      <AnimatePresence mode="popLayout" initial={false}>
        {isLoading ? (
          <motion.span
            key="google-loading"
            className="inline-flex items-center gap-2"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={swapReveal}
            transition={swapTransition}
          >
            <Loader2 className="size-4 animate-spin" />
            Signing in...
          </motion.span>
        ) : (
          <motion.span
            key="google-idle"
            className="inline-flex items-center gap-2"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={swapReveal}
            transition={swapTransition}
          >
            <Chrome className="size-4" />
            Continue with Google
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
