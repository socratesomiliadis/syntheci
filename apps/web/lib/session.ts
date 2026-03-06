import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./auth";
import { getWorkspaceIdForUser } from "./workspace";

export async function getOptionalSession() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  return session;
}

export async function requireSession() {
  const session = await getOptionalSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

export async function requireWorkspaceContext() {
  const session = await requireSession();
  const workspaceId = await getWorkspaceIdForUser(session.user.id);

  if (!workspaceId) {
    throw new Error("Workspace not found for authenticated user");
  }

  return {
    session,
    workspaceId
  };
}
