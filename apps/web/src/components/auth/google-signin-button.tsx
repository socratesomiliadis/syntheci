"use client";

import { useState } from "react";

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
    <button type="button" className="btn" onClick={handleSignIn} disabled={isLoading}>
      {isLoading ? "Signing in..." : "Continue with Google"}
    </button>
  );
}
