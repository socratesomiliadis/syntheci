import { IngestPanel } from "@/components/dashboard/ingest-panel";
import { getIngestionDocuments } from "@/lib/ingestion";
import { requireWorkspaceContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function IngestionPage() {
  const { workspaceId } = await requireWorkspaceContext();
  const documents = await getIngestionDocuments(workspaceId);

  return (
    <main className="px-4 py-5 md:px-6 md:py-6">
      <IngestPanel documents={documents} />
    </main>
  );
}
