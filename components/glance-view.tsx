"use client";
import * as React from "react";
import { Icon, typeIconName } from "@/components/icons";
import { useApp } from "@/components/app-context";
import { PriorityChip, OriginBadge } from "@/components/board/bead-card";
import { CopyableId } from "@/components/copyable-id";
import { FilterBar } from "@/components/filter-bar";
import { matchesFilters, labelOptionsFrom } from "@/lib/filters";
import { beadOrigin, originTitle } from "@/lib/attribution";
import { type Bead } from "@/lib/schema";
import {
  catColor,
  statusLabel,
  typeColor,
  avatarColor,
  initials,
  isBlocked,
  parentOf,
  childrenCountMap,
  epicProgress,
  relTime,
  fmtDateTime,
} from "@/lib/beads-view";

export function GlanceView() {
  const {
    beads,
    index,
    humanAllowlist,
    openDetail,
    openCreate,
    openEpic,
    loading,
    filters,
    setFilters,
  } = useApp();

  const [showArchived, setShowArchived] = React.useState(false);
  const labelOptions = React.useMemo(() => labelOptionsFrom(beads), [beads]);
  const childCounts = React.useMemo(() => childrenCountMap(beads), [beads]);
  const childProgress = React.useMemo(() => {
    const m = new Map<string, { closed: number; total: number; pct: number }>();
    for (const id of childCounts.keys()) m.set(id, epicProgress(id, beads));
    return m;
  }, [childCounts, beads]);

  const rows = React.useMemo(() => {
    return beads
      .filter((b) => {
        if (b.issue_type === "epic") return false;
        if (!showArchived && (b.labels ?? []).includes("archived")) return false;
        return matchesFilters(b, filters, humanAllowlist);
      })
      .sort((a, b) => {
        return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
      });
  }, [beads, filters, showArchived, humanAllowlist]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-border bg-[var(--surface)] p-[14px_22px]">
        <div className="mr-1 flex flex-col gap-px">
          <h1 className="m-0 text-base font-[650] tracking-[-.01em]">Glance</h1>
          <span className="text-[11.5px] text-[var(--text-3)]">
            {rows.length} beads · sorted by newest activity
          </span>
        </div>

        <FilterBar
          filters={filters}
          onChange={setFilters}
          labelOptions={labelOptions}
          showArchived={showArchived}
          onShowArchived={setShowArchived}
        />

        <button
          onClick={() => openCreate()}
          className="flex h-9 flex-shrink-0 items-center gap-[6px] rounded-[9px] px-[14px] text-[13px] font-[550] text-white"
          style={{ background: "var(--brand)", boxShadow: "0 2px 8px -2px var(--brand)" }}
        >
          <Icon name="plus" size={15} />
          <span>New</span>
        </button>
      </header>

      <div className="bd-scroll min-h-0 flex-1 overflow-y-auto p-[12px_22px]">
        {loading && beads.length === 0 ? (
          <div className="text-[13px] text-[var(--text-3)]">Loading beads…</div>
        ) : rows.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-[13px] text-[var(--text-3)]">
            No beads match.
          </div>
        ) : (
          <div className="flex flex-col gap-[6px]">
            {rows.map((b) => (
              <Row
                key={b.id}
                bead={b}
                blocked={isBlocked(b, index)}
                onOpen={() => openDetail(b.id)}
                parent={parentOf(b, index)}
                onOpenParent={openEpic}
                onOpenDetail={openDetail}
                progress={childProgress.get(b.id)}
                humanAllowlist={humanAllowlist}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  bead,
  blocked,
  onOpen,
  parent,
  onOpenParent,
  onOpenDetail,
  progress,
  humanAllowlist,
}: {
  bead: Bead;
  blocked: boolean;
  onOpen: () => void;
  parent: Bead | null;
  onOpenParent: (id: string) => void;
  onOpenDetail: (id: string) => void;
  progress: { closed: number; total: number; pct: number } | undefined;
  humanAllowlist: string[];
}) {
  const origin = beadOrigin(bead, humanAllowlist);
  const labels = (bead.labels ?? []).filter((l) => !l.includes(":") && l !== "archived");

  const openFromKeyboard = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={openFromKeyboard}
      className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] border border-border bg-[var(--surface)] px-[13px] py-[9px] text-left transition-[border-color,box-shadow] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
    >
      <span
        className="h-[9px] w-[9px] flex-shrink-0 rounded-full"
        style={{ background: blocked ? "#ef4444" : catColor(bead.status) }}
        title={blocked ? "Blocked" : statusLabel(bead.status)}
      />
      <Icon
        name={typeIconName(bead.issue_type)}
        size={15}
        className="flex-shrink-0"
        style={{ color: typeColor(bead.issue_type) }}
      />
      <CopyableId
        id={bead.id}
        className="w-[150px] flex-shrink-0 truncate font-mono text-[11.5px] text-[var(--text-3)]"
      />
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-[550] text-[var(--text)]">
        {bead.title}
      </span>
      {labels.map((l) => (
        <span
          key={l}
          className="hidden flex-shrink-0 rounded-md border border-border bg-[var(--surface-2)] px-[6px] py-px font-mono text-[10.5px] text-[var(--text-3)] lg:inline"
        >
          {l}
        </span>
      ))}
      {progress && progress.total > 0 && (
        <span
          title={`${progress.closed}/${progress.total} subtasks done`}
          className="hidden flex-shrink-0 items-center gap-[4px] rounded-md border border-border bg-[var(--surface-2)] px-[6px] py-px font-mono text-[10.5px] lg:flex"
        >
          <Icon name="list" size={10} className="flex-shrink-0" />
          {progress.closed}/{progress.total}
        </span>
      )}
      {parent && (
        <button
          title={`Epic: ${parent.title}`}
          onClick={(e) => {
            e.stopPropagation();
            if (parent.issue_type === "epic") onOpenParent(parent.id);
            else onOpenDetail(parent.id);
          }}
          className="hidden max-w-[120px] flex-shrink-0 items-center gap-[6px] truncate rounded-md border border-border bg-[var(--surface-2)] px-[6px] py-[1.5px] text-left hover:border-[var(--brand)] hover:text-[var(--brand)] lg:flex"
        >
          <Icon
            name={typeIconName(parent.issue_type)}
            size={10}
            className="flex-shrink-0 opacity-60"
          />
          <span className="truncate font-mono text-[10.5px] font-medium text-[var(--text-2)]">
            {parent.id}
          </span>
        </button>
      )}
      <div className="hidden w-[90px] flex-shrink-0 items-center gap-1.5 md:flex">
        {bead.assignee && (
          <div
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm ring-1 ring-white/10"
            style={{ background: avatarColor(bead.assignee) }}
            title={`Assigned to ${bead.assignee}`}
          >
            {initials(bead.assignee)}
          </div>
        )}
        <OriginBadge origin={origin} title={originTitle(bead.created_by, origin)} />
      </div>
      <div className="hidden w-[60px] flex-shrink-0 justify-end sm:flex">
        <PriorityChip p={bead.priority} />
      </div>
      <div
        className="w-[50px] flex-shrink-0 text-right text-[11px] font-[550] text-[var(--text-3)]"
        title={fmtDateTime(bead.updated_at)}
      >
        {relTime(bead.updated_at)}
      </div>
    </div>
  );
}
