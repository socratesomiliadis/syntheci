"use client";

import { useState } from "react";

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
      {isLoading ? "Signing out..." : "Sign out"}
    </Button>
  );
}
