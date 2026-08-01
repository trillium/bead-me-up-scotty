"use client";
import * as React from "react";
import { Icon, typeIconName } from "@/components/icons";
import { useApp } from "@/components/app-context";
import { CopyableId } from "@/components/copyable-id";
import { beadOrigin, originTitle } from "@/lib/attribution";
import { PriorityChip, OriginBadge } from "./bead-card";
import { StatusSheet } from "./status-sheet";
import { cn } from "@/lib/utils";
import type { Bead } from "@/lib/schema";
import type { BoardColumn } from "@/lib/board-columns";
import {
  catColor,
  statusLabel,
  typeColor,
  typeLabel,
  avatarColor,
  initials,
  isBlocked,
  parentOf,
  checklistProgress,
} from "@/lib/beads-view";

/**
 * Mobile replacement for the 5-column kanban (bead beadui-mobile): one status
 * at a time, chosen via a horizontally-scrolling chip strip (a *control*,
 * which NN/g and Material both treat as an acceptable exception to "never
 * scroll content sideways" — the list of beads below it never scrolls
 * horizontally). Status changes happen via a tap-to-open bottom sheet
 * (StatusSheet) since dnd-kit's PointerSensor drag doesn't work on touch.
 */
export function MobileBoard({
  columns,
  childCounts,
  doneWindow,
  onDoneWindowChange,
  onSetStatus,
}: {
  columns: { col: BoardColumn; cards: Bead[] }[];
  childCounts: Map<string, number>;
  doneWindow: number | null;
  onDoneWindowChange: (v: number | null) => void;
  onSetStatus: (id: string, status: string) => void;
}) {
  const [selected, setSelected] = React.useState<string | null>(null);
  // Default to Ready (the actionable column) so the first paint needs zero
  // interaction; fall back to whatever's first shown if Ready is filtered out.
  const activeId =
    selected && columns.some((c) => c.col.id === selected)
      ? selected
      : (columns.find((c) => c.col.id === "ready")?.col.id ?? columns[0]?.col.id ?? null);
  const active = columns.find((c) => c.col.id === activeId);

  const [statusBead, setStatusBead] = React.useState<Bead | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="bd-scroll flex flex-shrink-0 items-center gap-[8px] overflow-x-auto overflow-y-hidden pb-[10px]">
        {columns.map(({ col, cards }) => {
          const isActive = col.id === activeId;
          return (
            <button
              key={col.id}
              onClick={() => setSelected(col.id)}
              aria-pressed={isActive}
              className={cn(
                "flex h-11 flex-shrink-0 items-center gap-[7px] rounded-full border px-[14px] text-[12.5px] font-[600] transition-colors",
                isActive
                  ? "border-transparent text-white"
                  : "border-border bg-[var(--surface-2)] text-[var(--text-2)]",
              )}
              style={isActive ? { background: col.color } : undefined}
            >
              <span
                className="h-[7px] w-[7px] flex-shrink-0 rounded-full"
                style={{ background: isActive ? "rgba(255,255,255,.9)" : col.color }}
              />
              <span>{col.name}</span>
              <span
                className="rounded-full px-[6px] py-px font-mono text-[10.5px]"
                style={{
                  background: isActive ? "rgba(255,255,255,.22)" : "var(--surface-3)",
                  color: isActive ? "#fff" : "var(--text-3)",
                }}
              >
                {cards.length}
              </span>
            </button>
          );
        })}
      </div>

      {active?.col.id === "done" && (
        <div className="flex flex-shrink-0 justify-end pb-[10px]">
          <select
            value={doneWindow ?? ""}
            onChange={(e) =>
              onDoneWindowChange(e.target.value === "" ? null : Number(e.target.value))
            }
            title="Show only beads closed within this window"
            className="h-9 cursor-pointer rounded-[7px] border border-border bg-[var(--surface-2)] px-[9px] text-[12px] text-[var(--text-2)] outline-none"
          >
            <option value="">All time</option>
            <option value="7">Last 7 days</option>
            <option value="28">Last 4 weeks</option>
            <option value="90">Last 3 months</option>
            <option value="365">Last 12 months</option>
          </select>
        </div>
      )}

      <div className="bd-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {!active || active.cards.length === 0 ? (
          <div className="rounded-[11px] border-[1.5px] border-dashed border-border p-[26px_14px] text-center text-[12.5px] text-[var(--text-3)]">
            No beads in {active?.col.name ?? "this status"}
          </div>
        ) : (
          <div className="flex flex-col gap-[10px] pb-[14px]">
            {active.cards.map((b) => (
              <MobileBeadRow
                key={b.id}
                bead={b}
                childCount={childCounts.get(b.id) ?? 0}
                onChangeStatus={() => setStatusBead(b)}
              />
            ))}
          </div>
        )}
      </div>

      <StatusSheet
        bead={statusBead}
        columns={columns.map((c) => c.col)}
        onOpenChange={(open) => !open && setStatusBead(null)}
        onSelect={(status) => {
          if (statusBead) onSetStatus(statusBead.id, status);
          setStatusBead(null);
        }}
      />
    </div>
  );
}

function MobileBeadRow({
  bead,
  childCount,
  onChangeStatus,
}: {
  bead: Bead;
  childCount: number;
  onChangeStatus: () => void;
}) {
  const { index, humanAllowlist, openDetail } = useApp();
  const o = beadOrigin(bead, humanAllowlist);
  const parent = parentOf(bead, index);
  const blocked = isBlocked(bead, index);
  const visLabels = (bead.labels ?? []).filter((l) => l !== "archived").slice(0, 2);
  const depCount = (bead.dependencies ?? []).filter((d) => d.type !== "parent-child").length;
  const commentCount = (bead.comments ?? []).length;
  const checklist = checklistProgress(bead.description);

  return (
    <article
      onClick={() => openDetail(bead.id)}
      style={{ boxShadow: "var(--shadow)" }}
      className="flex cursor-pointer flex-col gap-[9px] rounded-[11px] border border-border bg-[var(--surface)] p-[12px_13px]"
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 flex-shrink-0 rounded-full"
          style={{ background: catColor(bead.status) }}
          title={statusLabel(bead.status)}
        />
        <CopyableId
          id={bead.id}
          className="font-mono text-[11.5px] tracking-[-.01em] text-[var(--text-3)]"
        />
        <span className="flex-1" />
        <PriorityChip p={bead.priority} />
        <OriginBadge origin={o} title={originTitle(bead.created_by, o)} />
      </div>

      <div className="text-[13.5px] font-[550] leading-[1.35] tracking-[-.006em] text-[var(--text)] [text-wrap:pretty]">
        {bead.title}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-[5px] text-[11.5px] text-[var(--text-2)]">
          <Icon
            name={typeIconName(bead.issue_type)}
            size={13}
            style={{ color: typeColor(bead.issue_type) }}
          />
          <span>{typeLabel(bead.issue_type)}</span>
        </span>
        {visLabels.map((l) => (
          <span
            key={l}
            className="rounded-md border border-border bg-[var(--surface-2)] px-[6px] py-px font-mono text-[10.5px] text-[var(--text-3)]"
          >
            {l}
          </span>
        ))}
      </div>

      <div className="mt-px flex items-center gap-[10px] border-t border-border pt-[9px]">
        <span className="inline-flex min-w-0 items-center gap-[6px]">
          <span
            className="flex h-[19px] w-[19px] flex-shrink-0 items-center justify-center rounded-full text-[9.5px] font-semibold text-white"
            style={{ background: avatarColor(bead.assignee ?? "") }}
          >
            {initials(bead.assignee ?? "")}
          </span>
          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11.5px] text-[var(--text-2)]">
            {bead.assignee || "Unassigned"}
          </span>
        </span>
        <span className="flex-1" />
        {depCount > 0 && (
          <span
            title="dependencies"
            className="inline-flex items-center gap-[3px] font-mono text-[11px]"
            style={{ color: blocked ? "#ef4444" : "var(--text-3)" }}
          >
            <Icon name="link" size={13} />
            {depCount}
          </span>
        )}
        {commentCount > 0 && (
          <span
            title="comments"
            className="inline-flex items-center gap-[3px] font-mono text-[11px] text-[var(--text-3)]"
          >
            <Icon name="comment" size={13} />
            {commentCount}
          </span>
        )}
        {checklist.total > 0 && (
          <span
            title="checklist progress"
            className="inline-flex items-center gap-[3px] font-mono text-[11px]"
            style={{ color: checklist.done === checklist.total ? "#16a34a" : "var(--text-3)" }}
          >
            <Icon name="check" size={13} />
            {checklist.done}/{checklist.total}
          </span>
        )}
        {parent && (
          <span
            title={`${parent.id} · ${parent.title}`}
            className={
              parent.issue_type === "epic"
                ? "inline-flex max-w-[96px] items-center gap-1 rounded-md bg-[var(--brand-weak)] px-[6px] py-px text-[10.5px] font-[550] text-[var(--brand)]"
                : "inline-flex max-w-[96px] items-center gap-1 rounded-md border border-border bg-[var(--surface-2)] px-[6px] py-px text-[10.5px] font-[550] text-[var(--text-3)]"
            }
          >
            <Icon
              name={parent.issue_type === "epic" ? "target" : typeIconName(parent.issue_type)}
              size={11}
              className="flex-shrink-0"
            />
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {parent.title.replace(/\s*\([^)]*\)\s*/, "")}
            </span>
          </span>
        )}
        {childCount > 0 && (
          <span
            title={`${childCount} subtask${childCount === 1 ? "" : "s"}`}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-[var(--surface-2)] px-[6px] py-px text-[10.5px] font-[550] text-[var(--text-3)]"
          >
            <Icon name="list" size={11} className="flex-shrink-0" />
            {childCount}
          </span>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onChangeStatus();
        }}
        className="flex h-11 flex-shrink-0 items-center gap-[8px] rounded-[9px] border border-border bg-[var(--surface-2)] px-[12px] text-left text-[12.5px] font-[550] text-[var(--text-2)] active:bg-[var(--surface-3)]"
      >
        <span
          className="h-[7px] w-[7px] flex-shrink-0 rounded-full"
          style={{ background: catColor(bead.status) }}
        />
        <span className="flex-1">Status: {statusLabel(bead.status)}</span>
        <Icon name="chevron" size={13} className="flex-shrink-0 text-[var(--text-3)]" />
      </button>
    </article>
  );
}
