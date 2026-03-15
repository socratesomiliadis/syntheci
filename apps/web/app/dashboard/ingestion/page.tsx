import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IngestPanel } from "@/components/dashboard/ingest-panel";

export const dynamic = "force-dynamic";

export default function IngestionPage() {
  return (
    <main className="space-y-6 px-4 py-5 md:px-6 md:py-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="rounded-[1.75rem] border-border/80 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl tracking-tight text-foreground">Bring new context into the workspace</CardTitle>
          </CardHeader>
          <CardContent className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Keep ingestion clean and intentional: files for durable reference, notes for quick capture, and links for external context you want retrievable later.
          </CardContent>
        </Card>

        <section className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <Card className="rounded-[1.4rem] border-border/80 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground">Upload lane</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              PDFs, markdown, and text files for long-term retrieval.
            </CardContent>
          </Card>
          <Card className="rounded-[1.4rem] border-border/80 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground">Note lane</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Fast capture for decisions, follow-ups, and standup notes.
            </CardContent>
          </Card>
          <Card className="rounded-[1.4rem] border-border/80 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground">Link lane</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Queue external URLs for extraction and embedding.
            </CardContent>
          </Card>
        </section>
      </section>

      <IngestPanel />
    </main>
  );
}
