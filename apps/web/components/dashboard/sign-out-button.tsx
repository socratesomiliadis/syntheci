"use client";

import { useState } from "react";

import { Loader2, LogOut } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { swapReveal, swapTransition } from "@/components/dashboard/motion-presets";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function onSignOut() {
    setIsLoading(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/login";
          }
        }
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={onSignOut} disabled={isLoading}>
      <AnimatePresence mode="popLayout" initial={false}>
        {isLoading ? (
          <motion.span
            key="signout-loading"
            className="inline-flex items-center gap-2"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={swapReveal}
            transition={swapTransition}
          >
            <Loader2 className="size-4 animate-spin" />
            Signing out...
          </motion.span>
        ) : (
          <motion.span
            key="signout-idle"
            className="inline-flex items-center gap-2"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={swapReveal}
            transition={swapTransition}
          >
            <LogOut className="size-4" />
            Sign out
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
