"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      closeButton
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group border border-border bg-background text-foreground shadow-lg",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          closeButton:
            "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
        }
      }}
      {...props}
    />
  );
}
