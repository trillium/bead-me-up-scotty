"use client";
import * as React from "react";
import { useApp } from "@/components/app-context";
import { emptyFilters } from "@/lib/filters";
import { resolveCommandInput, NO_MATCH_HINT } from "@/lib/command-engine";
import { api } from "@/lib/api-client";

/**
 * Persistent bottom command bar (beadui-voicebar): a plain text input so
 * iOS's native keyboard dictation drives navigation/filtering for free — no
 * Web Speech API, no custom mic button (unsupported in Safari/iOS anyway).
 * Submitted text is matched against the closed command manifest in
 * lib/command-engine.ts; a non-match shows an inline hint and changes nothing.
 */
export function CommandBar() {
  const { filters, setFilters, setView, index, openDetail, openExternal, projectId } = useApp();
  const [text, setText] = React.useState("");
  const [hint, setHint] = React.useState<string | null>(null);
  // Guards a stale lookup from surfacing after a newer submit — only the most
  // recent lookup's result is allowed to open a bead or set the hint.
  const lookupSeq = React.useRef(0);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    const result = resolveCommandInput(trimmed, { index });
    if (!result) {
      setHint(NO_MATCH_HINT);
      return;
    }

    switch (result.verb) {
      case "setStatusFilter":
        setFilters({ ...filters, status: [result.status] });
        break;
      case "setTypeFilter":
        setFilters({ ...filters, type: [result.type] });
        break;
      case "setPriorityFilter":
        setFilters({ ...filters, priority: [result.priority] });
        break;
      case "clearFilters":
        setFilters({ ...emptyFilters, search: filters.search });
        break;
      case "switchView":
        setView(result.view);
        break;
      case "openBead":
        openDetail(result.id);
        break;
      case "lookupBead":
        // A bare id that isn't in the loaded index — resolve it server-side
        // (the beads binary reaches any federated store) and surface it. The
        // input stays put with a "looking up" hint until the fetch resolves.
        runLookup(result.id);
        return;
      case "clear":
        break;
    }
    setHint(null);
    setText("");
  };

  const runLookup = (id: string) => {
    const seq = ++lookupSeq.current;
    setHint(`Looking up ${id}…`);
    api
      .get(projectId, id)
      .then((bead) => {
        if (seq !== lookupSeq.current) return; // superseded by a newer submit
        openExternal(bead);
        setHint(null);
        setText("");
      })
      .catch(() => {
        if (seq !== lookupSeq.current) return;
        setHint(`No bead ${id}`);
      });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[var(--surface)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {hint && (
        <div className="absolute bottom-full left-0 right-0 border-t border-border bg-[var(--surface-2)] px-[14px] py-[6px] text-[12px] text-[var(--text-3)]">
          {hint}
        </div>
      )}
      <div className="flex items-center gap-[8px] px-[14px] py-[8px]">
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (hint) setHint(null);
          }}
          placeholder='Try "show open", "go to board", "task-jodb"…'
          aria-label="Command bar"
          className="h-10 flex-1 rounded-[9px] border border-border bg-[var(--surface-2)] px-[12px] text-[14px] text-[var(--text)] outline-none focus:border-[var(--brand)]"
        />
      </div>
    </form>
  );
}
