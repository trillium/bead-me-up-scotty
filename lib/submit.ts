import type { CreateInput } from "./schema";

/**
 * Pure helpers behind the Submit tab (`components/submit-view.tsx`), kept here
 * so the repo's existing `node --test` setup (`lib/*.test.ts`) can cover the
 * form contract without a DOM: title validation, label parsing, the
 * bead-creation payload, and the failure-path message extraction.
 */

/** Split a freeform labels field into clean tags: comma-separated, trimmed. */
export function parseLabelsInput(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Inline validation for the Title field. Returns the error string to display,
 * or null when the title is acceptable.
 */
export function validateSubmitTitle(title: string): string | null {
  if (!title.trim()) return "Title is required";
  if (title.trim().length > 500) return "Title must be 500 characters or fewer";
  return null;
}

/**
 * Build the bead-creation payload for the Submit tab. Same shape the create
 * modal sends through `api.create` (POST /api/p/:id/beads → `bd create
 * --json`), minus the modal-only extras (parent/type/priority/assignee).
 */
export function buildSubmitInput(
  title: string,
  labelsRaw: string,
  description: string,
): CreateInput {
  return {
    title: title.trim(),
    issue_type: "task",
    priority: 2,
    description,
    assignee: "",
    labels: parseLabelsInput(labelsRaw),
    parent: "",
    backlog: false,
  };
}

/**
 * Failure-path message: prefer the server's message (ApiError preserves it),
 * falling back to a generic line so the form always has something inline to
 * show while its state is preserved.
 */
export function submitErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Couldn’t create the bead — try again";
}
