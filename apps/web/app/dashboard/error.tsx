"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-8 md:px-6">
      <section className="max-w-lg rounded-[1.75rem] border border-destructive/20 bg-card/90 p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
          Dashboard load failed
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {error.message || "Something went wrong while loading this workspace."}
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </section>
    </main>
  );
}
