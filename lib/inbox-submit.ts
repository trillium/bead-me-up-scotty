/**
 * Shared submit contract behind the "Needs You" inbox compose surface
 * (`NeedsYouCard` in `components/needs-you-view.tsx`), kept here so the
 * repo's DOM-free `node --test` setup (`lib/*.test.ts`) can cover the
 * keyboard-flow contract without a browser:
 *
 * - ONE submit path: the Respond button (native `<button>`, tab-focusable,
 *   Enter/Space per native semantics) and the Ctrl/Cmd+S (+ Ctrl/Cmd+Enter
 *   parity) shortcut both funnel through the same readiness gate + guard.
 * - No duplicate sends: the single-flight guard is acquired synchronously on
 *   submit, so Ctrl+S and Enter landing in the same tick still send once.
 */

export interface InboxKeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
}

/**
 * True when a keydown on the inbox compose textarea should submit — the same
 * submit the Respond button performs. Ctrl/Cmd+S is the advertised channel;
 * Ctrl/Cmd+Enter is accepted as parity (mirrors the create modal and the
 * drawer close-reason composer).
 */
export function isInboxSubmitKey(e: InboxKeyEvent): boolean {
  if (!e.ctrlKey && !e.metaKey) return false;
  return e.key === "s" || e.key === "S" || e.key === "Enter";
}

/** Shared readiness gate: non-empty text and no request in flight. */
export function canInboxSubmit(opts: { busy: boolean; text: string }): boolean {
  if (opts.busy) return false;
  return opts.text.trim().length > 0;
}

/**
 * Synchronous single-flight guard for the shared submit path. `tryAcquire`
 * returns true exactly once until `release` — the mutation's `onSettled`
 * releases it — so a Ctrl+S + Enter double-tap (or key auto-repeat) before
 * React flips `isPending` still sends a single request.
 */
export function createInboxSubmitGuard(): {
  tryAcquire: () => boolean;
  release: () => void;
  readonly held: boolean;
} {
  let held = false;
  return {
    tryAcquire() {
      if (held) return false;
      held = true;
      return true;
    },
    release() {
      held = false;
    },
    get held() {
      return held;
    },
  };
}
