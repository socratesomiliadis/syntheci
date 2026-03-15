import Link from "next/link";

import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";

import { SyntheciLogo } from "@/components/brand/syntheci-logo";
import { DemoSignInButton } from "@/components/auth/demo-signin-button";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/env";
import { getOptionalSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const capabilityNotes = [
  "Priority inbox triage with real-time labels and confidence.",
  "Grounded chat across email, notes, uploads, links, and contacts.",
  "Approval-first drafting and meeting extraction workflows.",
];

export default async function LoginPage() {
  const session = await getOptionalSession();

  if (session?.user) {
    return (
      <main className="relative min-h-svh overflow-hidden bg-[linear-gradient(180deg,#f6faf9_0%,#eef5f4_52%,#ffffff_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(100,168,169,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,71,71,0.08),transparent_26%)]" />
        <section className="relative mx-auto flex min-h-svh w-full max-w-5xl items-center justify-center px-6 py-12">
          <Card className="w-full max-w-xl rounded-[2rem] border-border/70 bg-card/95 shadow-[0_24px_80px_rgba(0,71,71,0.10)] backdrop-blur">
            <CardHeader className="space-y-5">
              <SyntheciLogo className="w-36" />
              <div className="space-y-2">
                <CardTitle className="text-3xl tracking-tight text-foreground">
                  Already signed in
                </CardTitle>
                <CardDescription className="text-base leading-7 text-muted-foreground">
                  Your workspace is ready. Open the dashboard to continue with
                  triage, grounded answers, and approval-driven actions.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Open dashboard
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-svh overflow-hidden bg-[linear-gradient(180deg,#f7fbfa_0%,#edf5f4_45%,#ffffff_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(100,168,169,0.20),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(0,71,71,0.08),transparent_18%),radial-gradient(circle_at_bottom_left,rgba(0,71,71,0.10),transparent_28%)]" />
      <div className="absolute left-1/2 top-20 h-56 w-56 -translate-x-1/2 rounded-full bg-white/50 blur-3xl" />

      <section className="relative mx-auto flex min-h-svh w-full max-w-6xl items-center px-6 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="max-w-2xl space-y-8">
            <div className="space-y-6">
              <Badge
                variant="outline"
                className="w-fit rounded-full border-primary/15 bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-primary shadow-sm backdrop-blur"
              >
                <Sparkles className="mr-2 size-3.5" />
                Netcompany Hackathon Demo
              </Badge>

              <div className="space-y-5">
                <SyntheciLogo className="w-44 sm:w-52" />
                <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
                  Calm operations for teams buried in email, documents, and follow-ups.
                </h1>
                <p className="max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                  Syntheci turns a noisy workspace into a focused execution layer
                  with grounded AI answers, triaged inboxes, and approval-first
                  automation.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:max-w-xl">
              {capabilityNotes.map((note) => (
                <div
                  key={note}
                  className="rounded-[1.3rem] border border-white/70 bg-white/70 px-4 py-4 shadow-[0_10px_30px_rgba(0,71,71,0.06)] backdrop-blur"
                >
                  <p className="text-sm leading-7 text-foreground">{note}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="rounded-[2rem] border-border/70 bg-card/92 shadow-[0_28px_90px_rgba(0,71,71,0.12)] backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="inline-flex size-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/5 text-primary">
                <LockKeyhole className="size-5" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl tracking-tight text-foreground">
                  Enter workspace
                </CardTitle>
                <CardDescription className="text-sm leading-7 text-muted-foreground">
                  Use the demo path to explore the full product experience with
                  seeded data and live AI actions.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-3 rounded-[1.35rem] border border-border/80 bg-muted/45 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Demo workspace
                  </p>
                  <p className="text-xs leading-6 text-muted-foreground">
                    Enter the seeded Syntheci environment without connecting a
                    real Google account.
                  </p>
                  {env.DEMO_MODE_ENABLED ? (
                    <p className="text-xs text-muted-foreground">
                      Demo email:{" "}
                      <span className="font-medium text-foreground">
                        {env.DEMO_ACCOUNT_EMAIL}
                      </span>
                    </p>
                  ) : null}
                </div>
                {env.DEMO_MODE_ENABLED ? (
                  <DemoSignInButton />
                ) : (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                    Demo mode is currently unavailable.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Google workspace
                </p>
                <GoogleSignInButton disabled />
                <p className="text-xs leading-6 text-muted-foreground">
                  Google sign-in is temporarily disabled while the demo flow is
                  the primary review path.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
