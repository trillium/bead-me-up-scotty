"use client";
import * as React from "react";

const KEY = "bmus.sidebar.collapsed";
const EVT = "bmus:sidebar-collapsed";

/**
 * Remembers whether the persistent desktop sidebar rail (bead beadui-sidebar-collapse)
 * is collapsed to an icon-only strip. Mirrors useLastView: useSyncExternalStore keeps
 * server/first-client render both "expanded" (matching the SSR markup), then syncs to
 * the stored value — no setState-in-effect and no hydration mismatch.
 */
export function useSidebarCollapsed(): [boolean, (v: boolean) => void] {
  const subscribe = React.useCallback((cb: () => void) => {
    window.addEventListener(EVT, cb);
    window.addEventListener("storage", cb);
    return () => {
      window.removeEventListener(EVT, cb);
      window.removeEventListener("storage", cb);
    };
  }, []);
  const getSnapshot = React.useCallback(() => localStorage.getItem(KEY) === "1", []);
  const collapsed = React.useSyncExternalStore(subscribe, getSnapshot, () => false);
  const setCollapsed = React.useCallback((v: boolean) => {
    localStorage.setItem(KEY, v ? "1" : "0");
    window.dispatchEvent(new Event(EVT)); // same-tab notify (storage event is cross-tab only)
  }, []);
  return [collapsed, setCollapsed];
}
