import { BEAD_STATUSES, BEAD_TYPES, type Bead, type BeadStatus, type BeadType } from "./schema";
import type { View } from "@/components/app-context";

/**
 * Standalone local port of Parlay's command-manifest pattern
 * (~/code/parlay/docs/COMMAND_DESIGN_CONTRACT.md), scoped to this app's own
 * actions. No runtime dependency on Parlay: no network calls, no
 * `@parlay/input` import. A closed set of exact phrases drives navigation and
 * filtering — deliberately not fuzzy free-text search.
 */

export type Verb =
  | "setStatusFilter"
  | "setTypeFilter"
  | "setPriorityFilter"
  | "clearFilters"
  | "switchView"
  | "openBead"
  | "lookupBead"
  | "clear";

export interface Command {
  id: string;
  phrases: string[];
  mode: "whole" | "trailing";
  priority: number;
  verb: Verb;
  /** Static args merged under any captures of the same key (captures win). */
  args?: Record<string, string>;
}

export type CommandResult =
  | { verb: "setStatusFilter"; status: BeadStatus }
  | { verb: "setTypeFilter"; type: BeadType }
  | { verb: "setPriorityFilter"; priority: number }
  | { verb: "clearFilters" }
  | { verb: "switchView"; view: View }
  | { verb: "openBead"; id: string }
  | { verb: "lookupBead"; id: string }
  | { verb: "clear" };

export interface CommandContext {
  index: Map<string, Bead>;
}

/**
 * The manifest: a small, exact, documented command language. Multiple
 * phrasings per command share one verb; a `{slot}` compiles to a named
 * capture. Lower `priority` is tried first — this lets a generic template
 * like "show {status}" win for "show open" while still falling through to
 * "show {type}" / "show {priority}" for "show bugs" / "show critical" when
 * the earlier capture doesn't validate against its own vocabulary.
 */
export const MANIFEST: Command[] = [
  {
    id: "clear-filters",
    phrases: ["clear filters", "reset filters", "show everything", "show all"],
    mode: "whole",
    priority: 5,
    verb: "clearFilters",
  },
  {
    id: "set-status-filter",
    phrases: ["show {status}", "show only {status}", "filter status {status}"],
    mode: "whole",
    priority: 10,
    verb: "setStatusFilter",
  },
  {
    id: "set-type-filter",
    phrases: ["show {type}", "show only {type}", "filter type {type}"],
    mode: "whole",
    priority: 20,
    verb: "setTypeFilter",
  },
  {
    id: "set-priority-filter",
    phrases: [
      "filter priority {priority}",
      "show priority {priority}",
      "show only {priority}",
      "show {priority} priority",
      "show {priority}",
    ],
    mode: "whole",
    priority: 30,
    verb: "setPriorityFilter",
  },
  {
    id: "switch-view",
    phrases: ["go to {view}", "switch to {view}", "show {view} view", "open {view} view"],
    mode: "whole",
    priority: 40,
    verb: "switchView",
  },
  {
    id: "open-bead",
    phrases: ["open {id}", "open bead {id}", "go to bead {id}", "jump to {id}"],
    mode: "whole",
    priority: 50,
    verb: "openBead",
  },
  {
    // A BARE bead reference typed on its own — "task-jodb", "brain-av6h",
    // "review-3c71.2" — with no "open " prefix. This is deliberately the
    // lowest-priority match before "clear": a `{id}` slot structurally matches
    // ANY single input, so every real command above must get first refusal.
    // resolveVerb gates it on the bead-id SHAPE (see isBeadIdShape), so plain
    // words ("board", "never mind") fall through to their own commands or the
    // no-match hint rather than being treated as ids.
    id: "bare-bead",
    phrases: ["{id}"],
    mode: "whole",
    priority: 55,
    verb: "openBead",
  },
  {
    id: "clear",
    phrases: ["clear", "never mind", "nevermind", "cancel"],
    mode: "whole",
    priority: 60,
    verb: "clear",
  },
];

/** Shown when nothing in the manifest matches — mirrors Parlay's showHint verb. */
export const NO_MATCH_HINT =
  'No matching command — try "show open", "go to board", "open <id>", or "clear filters".';

const VIEW_ALIASES: Record<string, View> = {
  board: "board",
  list: "list",
  epics: "epics",
  epic: "epics",
  graph: "graph",
  insights: "insights",
  activity: "activity",
  "needs you": "needsyou",
  needsyou: "needsyou",
  achievements: "achievements",
  publish: "publish",
  settings: "settings",
};

const PRIORITY_ALIASES: Record<string, number> = {
  p0: 0,
  p1: 1,
  p2: 2,
  p3: 3,
  p4: 4,
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  backlog: 4,
};

/** Irregular plurals the generic "strip trailing s" fallback below can't derive. */
const TYPE_PLURAL_ALIASES: Record<string, BeadType> = { stories: "story" };

interface CompiledCommand extends Command {
  compiled: RegExp[];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Compiles a "{slot}"-templated phrase into a named-capture regex. */
function compilePhrase(phrase: string, mode: Command["mode"]): RegExp {
  let pattern = "";
  let lastIndex = 0;
  const slotRe = /\{(\w+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = slotRe.exec(phrase))) {
    pattern += escapeRegex(phrase.slice(lastIndex, m.index));
    pattern += `(?<${m[1]}>.+?)`;
    lastIndex = slotRe.lastIndex;
  }
  pattern += escapeRegex(phrase.slice(lastIndex));
  const anchored = mode === "whole" ? `^${pattern}$` : `${pattern}$`;
  return new RegExp(anchored, "i");
}

const COMPILED: CompiledCommand[] = [...MANIFEST]
  .sort((a, b) => a.priority - b.priority)
  .map((cmd) => ({ ...cmd, compiled: cmd.phrases.map((p) => compilePhrase(p, cmd.mode)) }));

function normalize(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/**
 * Trimmed named captures for the first phrase of `cmd` that structurally
 * matches AND resolves to a valid arg. Tries every phrase of `cmd` before
 * giving up — a broader phrase (e.g. "show {status}") can structurally match
 * text meant for a more specific one (e.g. "show only {status}") but fail to
 * resolve, and the more specific phrase must still get its turn before this
 * command is abandoned for the next-priority one.
 */
function matchCommand(
  cmd: CompiledCommand,
  normalized: string,
  ctx: CommandContext,
): CommandResult | null {
  for (const regex of cmd.compiled) {
    const m = regex.exec(normalized);
    if (!m) continue;
    const captures: Record<string, string> = {};
    for (const [key, value] of Object.entries(m.groups ?? {})) captures[key] = value.trim();
    const resolved = resolveVerb(cmd.verb, { ...cmd.args, ...captures }, ctx);
    if (resolved) return resolved;
  }
  return null;
}

function resolveStatus(raw: string): BeadStatus | null {
  const norm = raw.toLowerCase().replace(/\s+/g, "_");
  return (BEAD_STATUSES as readonly string[]).includes(norm) ? (norm as BeadStatus) : null;
}

function resolveType(raw: string): BeadType | null {
  const norm = raw.toLowerCase();
  if ((BEAD_TYPES as readonly string[]).includes(norm)) return norm as BeadType;
  if (TYPE_PLURAL_ALIASES[norm]) return TYPE_PLURAL_ALIASES[norm];
  if (norm.endsWith("s")) {
    const singular = norm.slice(0, -1);
    if ((BEAD_TYPES as readonly string[]).includes(singular)) return singular as BeadType;
  }
  return null;
}

function resolvePriority(raw: string): number | null {
  const norm = raw.toLowerCase();
  return norm in PRIORITY_ALIASES ? PRIORITY_ALIASES[norm] : null;
}

function resolveView(raw: string): View | null {
  return VIEW_ALIASES[raw.toLowerCase()] ?? null;
}

function resolveBeadId(raw: string, index: Map<string, Bead>): string | null {
  const norm = raw.toLowerCase();
  for (const id of index.keys()) if (id.toLowerCase() === norm) return id;
  return null;
}

/**
 * A bare beads id: `<store>-<suffix>`, single token, no spaces. Store is a
 * federation prefix (`task`, `brain`, `review`, and hyphenated ones like
 * `nightshift-tasks`); suffix is the short beads id (`jodb`, `av6h`, `449q`),
 * optionally with a `.N` sub-issue segment (`3c71.2`). This is a SHAPE gate,
 * not a store allowlist — a well-formed shape that names no real bead resolves
 * to the clean not-found state, so we don't hard-code the store list here.
 */
const BEAD_ID_SHAPE = /^[a-z][a-z0-9_]*(?:-[a-z0-9]+)+(?:\.[0-9]+)?$/i;

export function isBeadIdShape(raw: string): boolean {
  return BEAD_ID_SHAPE.test(raw.trim());
}

/**
 * Resolve a bead reference to an action. If the id is already in the loaded
 * index, open it directly (canonical-cased). Otherwise, if it merely LOOKS like
 * a bead id, defer to an async server lookup (`lookupBead`) — the common
 * cross-store case, since the client index only holds the current project's
 * beads. Anything that isn't a bead-id shape returns null so the caller can
 * fall through to the next command / the no-match hint.
 */
function resolveBeadRef(raw: string, index: Map<string, Bead>): CommandResult | null {
  const canonical = resolveBeadId(raw, index);
  if (canonical) return { verb: "openBead", id: canonical };
  const norm = raw.trim().toLowerCase();
  if (isBeadIdShape(norm)) return { verb: "lookupBead", id: norm };
  return null;
}

function resolveVerb(
  verb: Verb,
  args: Record<string, string>,
  ctx: CommandContext,
): CommandResult | null {
  switch (verb) {
    case "setStatusFilter": {
      const status = resolveStatus(args.status ?? "");
      return status ? { verb, status } : null;
    }
    case "setTypeFilter": {
      const type = resolveType(args.type ?? "");
      return type ? { verb, type } : null;
    }
    case "setPriorityFilter": {
      const priority = resolvePriority(args.priority ?? "");
      return priority != null ? { verb, priority } : null;
    }
    case "clearFilters":
      return { verb };
    case "switchView": {
      const view = resolveView(args.view ?? "");
      return view ? { verb, view } : null;
    }
    case "openBead":
    case "lookupBead":
      // Both the "open {id}" phrasings and the bare-id command route here; the
      // resulting verb (openBead vs lookupBead) is decided by whether the id is
      // already loaded, not by which phrase matched.
      return resolveBeadRef(args.id ?? "", ctx.index);
    case "clear":
      return { verb };
  }
}

/**
 * Resolves free-typed (or dictated) text against the manifest, lowest
 * `priority` first. The first command that both structurally matches AND
 * resolves its arg against a real vocabulary wins; an unresolved arg (e.g.
 * "show frobnicate") falls through to the next command rather than matching.
 * Returns null when nothing matches — callers show `NO_MATCH_HINT`.
 */
export function resolveCommandInput(input: string, ctx: CommandContext): CommandResult | null {
  const normalized = normalize(input);
  if (!normalized) return null;
  for (const cmd of COMPILED) {
    const resolved = matchCommand(cmd, normalized, ctx);
    if (resolved) return resolved;
  }
  return null;
}
