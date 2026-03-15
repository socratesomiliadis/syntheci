import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

export async function POST() {
  if (!env.DEMO_MODE_ENABLED) {
    return NextResponse.json({ error: "demo mode is disabled" }, { status: 404 });
  }

  const response = await auth.api.signInEmail({
    asResponse: true,
    body: {
      email: env.DEMO_ACCOUNT_EMAIL,
      password: env.DEMO_ACCOUNT_PASSWORD,
      callbackURL: "/dashboard",
      rememberMe: true
    }
  });

  if (response.status === 401) {
    return NextResponse.json(
      {
        error:
          "The demo account has not been bootstrapped yet. Start the bootstrap service or rerun `pnpm compose:dev`."
      },
      { status: 503 }
    );
  }

  return response;
}
