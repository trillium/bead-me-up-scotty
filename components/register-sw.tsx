"use client";
import * as React from "react";

// Registers public/sw.js so Chrome treats the app as installable. Skipped in
// dev so a stale cached bundle can't fight npm run dev's hot reload.
export function RegisterServiceWorker() {
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js");
  }, []);
  return null;
}
