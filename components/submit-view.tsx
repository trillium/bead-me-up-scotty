"use client";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/icons";
import { useApp } from "@/components/app-context";
import { api } from "@/lib/api-client";
import { beadsKey } from "@/hooks/use-beads";
import type { Bead } from "@/lib/schema";
import {
  buildSubmitInput,
  submitErrorMessage,
  validateSubmitTitle,
} from "@/lib/submit";

const inputClass =
  "h-[38px] rounded-[9px] border border-border bg-[var(--surface-2)] px-3 text-[13.5px] text-[var(--text)] outline-none focus:border-[var(--brand)]";
const labelClass = "text-[12px] font-[550] text-[var(--text-2)]";

/**
 * Submit tab: a full-page form for creating one bead in the store the UI is
 * currently viewing. Same creation path as the create modal (`api.create` →
 * POST /api/p/:id/beads → `bd create --json`) — no new backend, just a new
 * surface. Title is required (inline error); labels/description are optional.
 * While the request is in flight the button is disabled; success shows a
 * receipt with the canonical id linked to its detail view; failure shows the
 * error inline with the form state preserved.
 */
export function SubmitView() {
  const { projectId, meta, openDetail } = useApp();
  const qc = useQueryClient();
  const [title, setTitle] = React.useState("");
  const [labels, setLabels] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [titleError, setTitleError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [receipt, setReceipt] = React.useState<Bead | null>(null);

  const create = useMutation({
    mutationFn: () => api.create(projectId, buildSubmitInput(title, labels, description)),
    onSuccess: (bead) => {
      qc.invalidateQueries({ queryKey: beadsKey(projectId) });
      setSubmitError(null);
      setReceipt(bead);
    },
    onError: (err) => setSubmitError(submitErrorMessage(err)),
  });

  function submit() {
    if (create.isPending) return;
    const err = validateSubmitTitle(title);
    setTitleError(err);
    if (err) return;
    setSubmitError(null);
    create.mutate();
  }

  function reset() {
    setTitle("");
    setLabels("");
    setDescription("");
    setTitleError(null);
    setSubmitError(null);
    setReceipt(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex-shrink-0 border-b border-border bg-[var(--surface)] p-[14px_22px]">
        <h1 className="m-0 text-base font-[650] tracking-[-.01em]">Submit</h1>
        <span className="text-[11.5px] text-[var(--text-3)]">
          Create a bead in <span className="font-mono">{projectId}</span>
          {meta?.kind ? ` · ${meta.kind} store` : ""}
        </span>
      </header>

      <div className="bd-scroll min-h-0 flex-1 overflow-y-auto p-[24px_22px]">
        <div className="mx-auto flex max-w-[640px] flex-col gap-[18px]">
          {receipt ? (
            <section className="flex flex-col gap-[12px] rounded-[13px] border border-border bg-[var(--surface)] p-[18px_20px]">
              <div className="flex items-center gap-[9px] text-[13.5px] font-semibold">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-[7px] text-white"
                  style={{ background: "var(--brand)" }}
                >
                  <Icon name="check" size={13} />
                </span>
                Bead created
              </div>
              <button
                onClick={() => openDetail(receipt.id)}
                title={`Open ${receipt.id}`}
                className="break-all rounded-[9px] border border-border bg-[var(--surface-2)] p-[9px_11px] text-left font-mono text-[12.5px] text-[var(--brand)] hover:bg-[var(--surface-3)]"
              >
                {receipt.id}
              </button>
              <div className="truncate text-[13px] text-[var(--text-2)]">{receipt.title}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => openDetail(receipt.id)}
                  className="flex h-9 items-center gap-[6px] rounded-[9px] px-3 text-[12.5px] font-semibold text-white"
                  style={{ background: "var(--brand)" }}
                >
                  <Icon name="board" size={14} /> Open {receipt.id}
                </button>
                <button
                  onClick={reset}
                  className="flex h-9 items-center gap-[6px] rounded-[9px] border border-border bg-[var(--surface-2)] px-3 text-[12.5px] font-[550] hover:bg-[var(--surface-3)]"
                >
                  <Icon name="plus" size={14} /> Create another
                </button>
              </div>
            </section>
          ) : (
            <section className="flex flex-col gap-[14px] rounded-[13px] border border-border bg-[var(--surface)] p-[18px_20px]">
              <label className="flex flex-col gap-[6px]">
                <span className={labelClass}>Title</span>
                <input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError) setTitleError(validateSubmitTitle(e.target.value));
                  }}
                  placeholder="What needs doing?"
                  aria-invalid={titleError ? true : undefined}
                  className={inputClass}
                />
                {titleError && (
                  <span role="alert" className="text-[12px] text-destructive">
                    {titleError}
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-[6px]">
                <span className={labelClass}>
                  Labels <span className="font-normal text-[var(--text-3)]">· comma separated, optional</span>
                </span>
                <input
                  value={labels}
                  onChange={(e) => setLabels(e.target.value)}
                  placeholder="ui, dnd, m3"
                  className={`${inputClass} font-mono`}
                />
              </label>

              <label className="flex flex-col gap-[6px]">
                <span className={labelClass}>
                  Description <span className="font-normal text-[var(--text-3)]">· optional</span>
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Optional details, acceptance criteria…"
                  className={`${inputClass} h-auto w-full resize-y py-[10px] leading-[1.5]`}
                />
              </label>

              {submitError && (
                <span role="alert" className="text-[12.5px] text-destructive">
                  {submitError}
                </span>
              )}

              <div className="flex justify-end">
                <button
                  onClick={submit}
                  disabled={create.isPending}
                  className="flex h-[38px] items-center gap-[7px] rounded-[9px] px-4 text-[13px] font-semibold text-white disabled:opacity-50"
                  style={{ background: "var(--brand)", boxShadow: "0 2px 8px -2px var(--brand)" }}
                >
                  <Icon name="check" size={15} />
                  {create.isPending ? "Submitting…" : "Submit"}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
