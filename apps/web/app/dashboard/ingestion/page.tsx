import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IngestPanel } from "@/components/dashboard/ingest-panel";

export const dynamic = "force-dynamic";

export default function IngestionPage() {
  return (
    <main className="space-y-6 px-4 py-5 md:px-6 md:py-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[1.75rem] border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(240,249,255,0.94))] shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl tracking-tight text-slate-950">Bring new context into the workspace</CardTitle>
          </CardHeader>
          <CardContent className="max-w-2xl text-sm leading-6 text-slate-600">
            Keep ingestion clean and intentional: files for durable reference, notes for quick capture, and links for external context you want retrievable later.
          </CardContent>
        </Card>

        <section className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <Card className="rounded-[1.4rem] border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700">Upload lane</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              PDFs, markdown, and text files for long-term retrieval.
            </CardContent>
          </Card>
          <Card className="rounded-[1.4rem] border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700">Note lane</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Fast capture for decisions, follow-ups, and standup notes.
            </CardContent>
          </Card>
          <Card className="rounded-[1.4rem] border-slate-200/80 bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-700">Link lane</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Queue external URLs for extraction and embedding.
            </CardContent>
          </Card>
        </section>
      </section>

      <IngestPanel />
    </main>
  );
}
