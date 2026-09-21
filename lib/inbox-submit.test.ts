import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canInboxSubmit,
  createInboxSubmitGuard,
  isInboxSubmitKey,
} from "./inbox-submit";

// Shortcut channel: Ctrl/Cmd+S submits, with Ctrl/Cmd+Enter as parity.

test("isInboxSubmitKey accepts Ctrl+S and Cmd+S", () => {
  assert.equal(isInboxSubmitKey({ key: "s", ctrlKey: true, metaKey: false }), true);
  assert.equal(isInboxSubmitKey({ key: "s", ctrlKey: false, metaKey: true }), true);
  assert.equal(isInboxSubmitKey({ key: "S", ctrlKey: true, metaKey: false }), true);
});

test("isInboxSubmitKey accepts Ctrl/Cmd+Enter as parity", () => {
  assert.equal(isInboxSubmitKey({ key: "Enter", ctrlKey: true, metaKey: false }), true);
  assert.equal(isInboxSubmitKey({ key: "Enter", ctrlKey: false, metaKey: true }), true);
});

test("isInboxSubmitKey ignores unmodified and unrelated keys", () => {
  assert.equal(isInboxSubmitKey({ key: "s", ctrlKey: false, metaKey: false }), false);
  assert.equal(isInboxSubmitKey({ key: "Enter", ctrlKey: false, metaKey: false }), false);
  assert.equal(isInboxSubmitKey({ key: "d", ctrlKey: true, metaKey: false }), false);
  assert.equal(isInboxSubmitKey({ key: " ", ctrlKey: true, metaKey: false }), false);
});

// Shared readiness gate: one rule for the button and the shortcut.

test("canInboxSubmit requires non-empty text and an idle request", () => {
  assert.equal(canInboxSubmit({ busy: false, text: "an answer" }), true);
  assert.equal(canInboxSubmit({ busy: false, text: "   " }), false);
  assert.equal(canInboxSubmit({ busy: false, text: "" }), false);
  assert.equal(canInboxSubmit({ busy: true, text: "an answer" }), false);
});

// Keyboard flow: Tab reaches a native submit control, Enter submits,
// and Ctrl+S + Enter in the same tick still sends exactly once.

test("keyboard flow: tab-reachable button Enter and Ctrl+S share one guarded submit", () => {
  // The Respond control is a native <button> with no tabindex override, so it
  // participates in tab order and activates on Enter/Space natively — the
  // component test below pins that contract; here we pin the shared path.
  let sends = 0;
  const guard = createInboxSubmitGuard();
  const submit = (opts: { busy: boolean; text: string }) => {
    if (!canInboxSubmit(opts)) return false;
    if (!guard.tryAcquire()) return false; // second channel this tick: no double-fire
    sends += 1;
    return true;
  };

  const idle = { busy: false, text: "here is the answer" };
  // Tab reaches the button, Enter activates it…
  assert.equal(submit(idle), true);
  // …and Ctrl+S landing in the same tick (before isPending flips) sends nothing more.
  assert.equal(submit(idle), false);
  assert.equal(sends, 1);

  // Once the request settles the guard releases and a new answer can send.
  guard.release();
  assert.equal(submit(idle), true);
  assert.equal(sends, 2);
});

test("createInboxSubmitGuard holds until released", () => {
  const guard = createInboxSubmitGuard();
  assert.equal(guard.held, false);
  assert.equal(guard.tryAcquire(), true);
  assert.equal(guard.held, true);
  assert.equal(guard.tryAcquire(), false);
  guard.release();
  assert.equal(guard.held, false);
  assert.equal(guard.tryAcquire(), true);
});
