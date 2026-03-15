import { IngestPanel } from "@/components/dashboard/ingest-panel";
import { getIngestionDocuments } from "@/lib/ingestion";
import { requireWorkspaceContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function IngestionPage({
  searchParams
}: {
  searchParams?: Promise<{ document?: string }>;
}) {
  const { workspaceId } = await requireWorkspaceContext();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const documents = await getIngestionDocuments(workspaceId);
  const initialSelectedDocumentId =
    resolvedSearchParams?.document && documents.some((document) => document.id === resolvedSearchParams.document)
      ? resolvedSearchParams.document
      : documents[0]?.id ?? null;

  return (
    <main className="px-4 py-5 md:px-6 md:py-6">
      <IngestPanel
        documents={documents}
        initialSelectedDocumentId={initialSelectedDocumentId}
      />
    </main>
  );
}
