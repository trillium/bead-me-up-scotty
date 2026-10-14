/**
 * Labels to add and remove so `current` becomes `next`.
 * Callers pass each name as its own `bd update --add-label` / `--remove-label`
 * flag (`bd tag` / `bd label add`), never as one comma-joined `--set-labels`
 * value — that flag is repeatable and does not split on commas.
 */
export function diffLabels(
  current: readonly string[],
  next: readonly string[],
): { add: string[]; remove: string[] } {
  const cur = new Set(current);
  const nxt = new Set(next);
  return {
    add: next.filter((l) => !cur.has(l)),
    remove: current.filter((l) => !nxt.has(l)),
  };
}
