"use client";
import * as React from "react";
import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

const POSTHOG_KEY =
  process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "phc_rdES87g7CTNjAqWdvCwkxDQSVCJHVpqgYsw6fKPCrA65";
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

// Runs once at module init, not inside an effect: PostHogPageView is a
// child of PostHogProvider, and React fires child effects before parent
// effects on mount, so an effect-based init here would still be racing the
// page view capture below and losing.
if (typeof window !== "undefined") {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    disable_session_recording: true,
  });
}

// Reads the route on every client-side navigation and fires the manual
// pageview PostHog's own App Router example uses in place of its default
// (history-API-based) autocapture, which the App Router's client-side
// transitions don't trigger correctly. Split out and Suspense-wrapped
// because useSearchParams() bails a static page to client rendering unless
// its nearest boundary is a Suspense fallback (Next.js requirement).
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (!pathname) return;
    let url = window.origin + pathname;
    const search = searchParams.toString();
    if (search) url += `?${search}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}
