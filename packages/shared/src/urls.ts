function resolveAppBaseUrl() {
  return (
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  );
}

export function buildContactDashboardUrl(contactId: string) {
  return new URL(`/dashboard/contacts?contact=${contactId}`, resolveAppBaseUrl()).toString();
}

export function buildDocumentDashboardUrl(documentId: string) {
  return new URL(`/dashboard/ingestion?document=${documentId}`, resolveAppBaseUrl()).toString();
}
