import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { getOptionalSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getOptionalSession();

  if (session?.user) {
    return (
      <div className="app-shell">
        <div className="panel">
          <h1>Already signed in</h1>
          <p className="muted">
            Your session is active. Open the dashboard to continue using Syntheci.
          </p>
          <a href="/dashboard" className="btn">
            Open dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="panel" style={{ maxWidth: 560, margin: "7rem auto" }}>
        <h1>Syntheci</h1>
        <p className="muted">
          Connect your inbox, Slack, and notes into one AI knowledge base with citations.
        </p>
        <GoogleSignInButton />
      </div>
    </div>
  );
}
