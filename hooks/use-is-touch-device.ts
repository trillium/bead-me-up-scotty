"use client";
import * as React from "react";

const QUERY = "(hover: none) and (pointer: coarse)";

/**
 * True when the primary input has no hover and a coarse pointer (touch).
 * Defaults to false until mounted so SSR/first-paint markup matches the
 * client, then syncs — used to skip autoFocus on touch devices, where
 * popping the keyboard immediately shoves the layout before the user has
 * looked at the screen.
 */
export function useIsTouchDevice(): boolean {
  const subscribe = React.useCallback((cb: () => void) => {
    const mql = window.matchMedia(QUERY);
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
  }, []);
  const getSnapshot = React.useCallback(() => window.matchMedia(QUERY).matches, []);
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}
