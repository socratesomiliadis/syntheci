import type { Metadata } from "next";

import { Geist } from "next/font/google";
import "katex/dist/katex.min.css";
import "streamdown/styles.css";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Syntheci",
  description: "AI knowledge base and second-brain MVP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={cn("font-sans", geist.variable)}
    >
      <body className="min-h-svh bg-background text-foreground antialiased">
        <TooltipProvider>
          {children}
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
