import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main className="space-y-6 px-4 py-5 md:px-6 md:py-6">
      <section className="rounded-[1.75rem] border border-border/80 bg-card/75 p-6 shadow-sm">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-10 w-80 max-w-full" />
        <Skeleton className="mt-3 h-4 w-[32rem] max-w-full" />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[1.4rem] border border-border/80 bg-card/70 p-5 shadow-sm"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-20" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.6rem] border border-border/80 bg-card/70 p-5 shadow-sm">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-5 h-44 w-full" />
        </div>
        <div className="rounded-[1.6rem] border border-border/80 bg-card/70 p-5 shadow-sm">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-5 h-44 w-full" />
        </div>
      </section>
    </main>
  );
}
