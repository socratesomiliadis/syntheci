import { IngestPanel } from "@/components/dashboard/ingest-panel";

export const dynamic = "force-dynamic";

export default function IngestionPage() {
  return (
    <main className="px-4 py-5 md:px-6 md:py-6">
      <IngestPanel />
    </main>
  );
}
