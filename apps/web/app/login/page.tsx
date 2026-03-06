import Link from "next/link";

import { Sparkles } from "lucide-react";

import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOptionalSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getOptionalSession();

  if (session?.user) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-3xl items-center justify-center px-6 py-12">
        <Card className="w-full border-blue-100 shadow-lg shadow-blue-100/60">
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
    <main className="relative min-h-svh overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(59,130,246,0.18),transparent_38%),radial-gradient(circle_at_90%_10%,rgba(14,165,233,0.16),transparent_40%)]" />
      <section className="relative mx-auto flex min-h-svh w-full max-w-5xl items-center justify-center px-6 py-12">
        <Card className="w-full max-w-xl border-blue-100 bg-white/95 shadow-xl shadow-blue-200/50 backdrop-blur">
          <CardHeader className="space-y-4">
            <Badge
              variant="secondary"
              className="w-fit border border-blue-200 bg-blue-50 text-blue-700"
            >
              <Sparkles className="mr-1 size-3.5" />
              AI Workspace
            </Badge>
            <div className="space-y-2">
              <CardTitle className="text-3xl tracking-tight text-slate-900">Syntheci</CardTitle>
              <CardDescription className="text-base text-slate-600">
                A unified workspace for priority inbox triage, grounded answers with citations,
                meeting proposals, and approval-driven drafting.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <GoogleSignInButton />
            <p className="text-xs text-slate-500">
              By continuing, you authorize Gmail and Slack connection flows inside your workspace.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
