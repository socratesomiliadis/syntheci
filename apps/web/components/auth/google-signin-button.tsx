"use client";

import { useState } from "react";

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
      {isLoading ? "Signing in..." : "Continue with Google"}
    </Button>
  );
}
