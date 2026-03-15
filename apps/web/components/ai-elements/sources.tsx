"use client";

import type { ComponentProps } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { BookIcon, ChevronDownIcon, ExternalLinkIcon } from "lucide-react";

export type SourcesProps = ComponentProps<"div">;

export const Sources = ({ className, ...props }: SourcesProps) => (
  <Collapsible className={cn("not-prose mb-4 text-xs", className)} {...props} />
);

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number;
};

export const SourcesTrigger = ({
  className,
  count,
  children,
  ...props
}: SourcesTriggerProps) => (
  <CollapsibleTrigger
    className={cn(
      "group inline-flex items-center gap-3 rounded-2xl border border-border/80 bg-muted/55 px-3 py-2 text-left text-foreground transition-colors hover:bg-muted/80",
      className
    )}
    {...props}
  >
    {children ?? (
      <>
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm">
          <BookIcon className="h-3.5 w-3.5" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Grounding
          </span>
          <span className="font-medium">
            Used {count} source{count === 1 ? "" : "s"}
          </span>
        </span>
        <span className="ml-auto inline-flex items-center rounded-full bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
          {count}
        </span>
        <ChevronDownIcon className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </>
    )}
  </CollapsibleTrigger>
);

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent>;

export const SourcesContent = ({
  className,
  ...props
}: SourcesContentProps) => (
  <CollapsibleContent
    className={cn(
      "mt-3 grid grid-cols-2 max-w-full gap-2",
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

export type SourceProps = Omit<ComponentProps<"a">, "href"> & {
  href?: string | null;
};

export const Source = ({
  href,
  title,
  children: childContent,
  className,
  ...props
}: SourceProps) => {
  const sharedClassName = cn(
    "group flex items-start gap-3 rounded-2xl border border-border/80 bg-card/92 px-3 py-3 text-left text-foreground shadow-sm transition-all",
    href ? "hover:border-border hover:bg-card" : "cursor-default opacity-85",
    className
  );

  const fallbackContent = (
    <>
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <BookIcon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
      </span>
      {href ? (
        <ExternalLinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      ) : null}
    </>
  );

  if (!href) {
    return (
      <div className={sharedClassName} {...(props as ComponentProps<"div">)}>
        {childContent ?? fallbackContent}
      </div>
    );
  }

  return (
    <a
      className={sharedClassName}
      href={href}
      rel="noreferrer noopener"
      target="_blank"
      {...props}
    >
      {childContent ?? fallbackContent}
    </a>
  );
};
