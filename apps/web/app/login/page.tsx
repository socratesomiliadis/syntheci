import Link from "next/link";

import { Sparkles } from "lucide-react";

import { DemoSignInButton } from "@/components/auth/demo-signin-button";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/env";
import { getOptionalSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getOptionalSession();

  if (session?.user) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-3xl items-center justify-center px-6 py-12">
        <Card className="w-full border-primary/15 shadow-lg shadow-primary/10">
          <CardHeader>
            <CardTitle>Already signed in</CardTitle>
            <CardDescription>
              Your workspace is ready. Open the dashboard to continue with triage, chat, and
              action automation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Open dashboard
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="relative min-h-svh overflow-hidden bg-background">
      <section className="relative mx-auto flex min-h-svh w-full max-w-5xl items-center justify-center px-6 py-12">
        <Card className="w-full max-w-xl border-primary/15 bg-card/95 shadow-xl shadow-primary/20 backdrop-blur">
          <CardHeader className="space-y-4">
            <Badge
              variant="secondary"
              className="w-fit tone-info"
            >
              <Sparkles className="mr-1 size-3.5" />
              AI Workspace
            </Badge>
            <div className="space-y-2">
              <CardTitle className="text-3xl tracking-tight text-foreground">Syntheci</CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                A unified workspace for priority inbox triage, grounded answers with citations,
                meeting proposals, and approval-driven drafting.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <GoogleSignInButton />
            {env.DEMO_MODE_ENABLED ? (
              <div className="space-y-3 rounded-xl border border-border/80 bg-muted/55 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Judge review path</p>
                  <p className="text-xs text-muted-foreground">
                    Enter the seeded demo workspace without connecting a real Google account.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Demo email: <span className="font-medium text-foreground">{env.DEMO_ACCOUNT_EMAIL}</span>
                  </p>
                </div>
                <DemoSignInButton />
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              By continuing, you authorize the Google-based workspace flows used by the app.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
