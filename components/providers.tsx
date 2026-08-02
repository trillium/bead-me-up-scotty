"use client";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { RegisterServiceWorker } from "@/components/register-sw";
import { PostHogProvider } from "@/components/posthog-provider";
import { InstallPromptProvider } from "@/components/install-prompt-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: true, staleTime: 2000 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <RegisterServiceWorker />
        <InstallPromptProvider>
          <PostHogProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </PostHogProvider>
        </InstallPromptProvider>
        <Toaster position="bottom-center" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
