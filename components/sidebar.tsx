"use client";
import * as React from "react";
import { Icon } from "@/components/icons";
import { useTheme } from "@/components/theme-provider";
import { useApp, type View } from "@/components/app-context";
import { ProjectSwitcher } from "@/components/project-switcher";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { initials, avatarColor, needsHuman, readyHumanGate } from "@/lib/beads-view";
import { useGamification } from "@/hooks/use-beads";
// GITHUB_REPO is shared with the build badge (where bug/feature issues are filed).
import { GITHUB_REPO } from "@/lib/build-info";
import { BuildBadge } from "@/components/build-badge";
import { UpdateIndicator } from "@/components/update-indicator";
import { cn } from "@/lib/utils";

function githubIssueUrl(kind: "bug" | "feature"): string {
  const isBug = kind === "bug";
  const params = new URLSearchParams({
    title: isBug ? "[Bug] " : "[Feature] ",
    labels: isBug ? "bug" : "enhancement",
    body: isBug
      ? "## Steps to reproduce\n\n1. \n2. \n\n## Expected\n\n## Actual\n\n---\n_Filed from Bead Me Up, Scotty_"
      : "## Problem\n\n## Proposed solution\n\n---\n_Filed from Bead Me Up, Scotty_",
  });
  return `https://github.com/${GITHUB_REPO}/issues/new?${params.toString()}`;
}

function openIssue(kind: "bug" | "feature") {
  window.open(githubIssueUrl(kind), "_blank", "noopener,noreferrer");
}

const NAV: { key: View; label: string; icon: string }[] = [
  { key: "board", label: "Board", icon: "board" },
  { key: "list", label: "List", icon: "list" },
  { key: "epics", label: "Epics", icon: "target" },
  { key: "graph", label: "Graph", icon: "graph" },
  { key: "insights", label: "Insights", icon: "milestone" },
  { key: "activity", label: "Activity", icon: "comment" },
  { key: "needsyou", label: "Needs You", icon: "user" },
  { key: "achievements", label: "Achievements", icon: "feature" },
  { key: "publish", label: "Publish", icon: "rocket" },
  { key: "settings", label: "Settings", icon: "settings" },
];

export function Sidebar({
  view,
  onView,
  kind,
  projectId,
  live,
  className,
  collapsed = false,
  onToggleCollapsed,
  onOpenShortcuts,
}: {
  view: View;
  onView: (v: View) => void;
  kind?: "bd" | "demo";
  projectId: string;
  live?: boolean;
  /** Lets callers control visibility per breakpoint (persistent desktop rail
   * vs. always-visible copy inside the mobile nav sheet, bead beadui-mobile). */
  className?: string;
  /** Icon-only rail (bead beadui-sidebar-collapse). Only the persistent desktop
   * rail supports this — the mobile sheet copy never passes these props. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Opens the keyboard-shortcuts overlay (bead beadui-shortcuts-help). Omit to hide the entry point. */
  onOpenShortcuts?: () => void;
}) {
  const { mode, toggle } = useTheme();
  const { meta, beads, index } = useApp();
  const actor = meta?.humanActor ?? "you";
  const epicCount = beads.filter((b) => b.issue_type === "epic").length;
  // "Needs You" = agent-flagged beads (bd human) + ready human-approval gates.
  const needsYouCount =
    beads.filter(needsHuman).length + beads.filter((b) => readyHumanGate(b, index)).length;
  const game = useGamification(projectId, !!meta?.gamification);

  return (
    <aside
      className={cn(
        "flex flex-shrink-0 flex-col overflow-hidden border-r border-border bg-[var(--surface)] transition-[width,padding] duration-200",
        collapsed ? "w-[60px] p-[18px_8px]" : "w-[228px] p-[18px_14px]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-[10px] px-2 pb-[18px] pt-1",
          collapsed && "flex-col gap-2 px-0",
        )}
      >
        <div
          className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[9px] text-white"
          style={{ background: "var(--brand)", boxShadow: "0 2px 8px -2px var(--brand)" }}
        >
          <Icon name="logo" size={17} />
        </div>
        {!collapsed && (
          <div className="flex-1 text-sm font-[650] leading-[1.15] tracking-[-.01em]">
            Bead Me Up Scotty
          </div>
        )}
        {onToggleCollapsed && (
          <button
            onClick={onToggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            <Icon
              name="chevron"
              size={13}
              className={collapsed ? "-rotate-90" : "rotate-90"}
            />
          </button>
        )}
      </div>

      {!collapsed && <ProjectSwitcher projectId={projectId} kind={kind} live={live} />}

      <nav className={cn("flex flex-col gap-[2px]", collapsed && "items-center")}>
        {NAV.filter((n) => n.key !== "achievements" || meta?.gamification).map((n) => {
          const active = view === n.key;
          const button = (
            <button
              onClick={() => onView(n.key)}
              aria-label={n.label}
              className={cn(
                "flex items-center gap-[10px] rounded-[9px] text-left text-[13.5px] transition-colors",
                collapsed ? "h-9 w-9 justify-center" : "w-full px-[10px] py-2",
                active
                  ? "bg-[var(--brand-weak)] font-semibold text-[var(--brand)]"
                  : "font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
              )}
            >
              <Icon name={n.icon} size={17} className="flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{n.label}</span>
                  {n.key === "epics" && epicCount > 0 && (
                    <span className="font-mono text-[11px] text-[var(--text-3)]">{epicCount}</span>
                  )}
                  {n.key === "needsyou" && needsYouCount > 0 && (
                    <span
                      className="min-w-[18px] rounded-full px-[6px] py-px text-center text-[11px] font-semibold text-white"
                      style={{ background: "var(--brand)" }}
                    >
                      {needsYouCount}
                    </span>
                  )}
                </>
              )}
            </button>
          );
          if (!collapsed) return <React.Fragment key={n.key}>{button}</React.Fragment>;
          return (
            <Tooltip key={n.key}>
              <TooltipTrigger render={button} />
              <TooltipContent side="right">{n.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className={cn("mt-auto flex flex-col gap-[10px]", collapsed && "items-center")}>
        {!collapsed && meta?.gamification && game.data && (
          <div className="rounded-[10px] border border-border bg-[var(--surface)] px-[11px] py-[9px]">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="font-[650]">Level {game.data.you.level}</span>
              <span className="font-mono text-[var(--text-3)]">{game.data.you.xp} XP</span>
            </div>
            <div className="mt-[6px] h-[6px] overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${Math.round(game.data.you.progress * 100)}%`,
                  background: "var(--brand)",
                }}
              />
            </div>
            <div className="mt-[4px] text-[10.5px] text-[var(--text-3)]">
              {game.data.you.closed} closed ·{" "}
              {Math.max(0, game.data.you.span - game.data.you.intoLevel)} XP to L
              {game.data.you.level + 1}
            </div>
          </div>
        )}
        <DropdownMenu>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-border bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus:outline-none" />
                }
              >
                <Icon name="bug" size={16} className="flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="right">Report / request</TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenuTrigger className="flex w-full items-center gap-[10px] rounded-[9px] border border-border bg-[var(--surface)] px-[10px] py-2 text-left text-[12.5px] font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus:outline-none">
              <Icon name="bug" size={16} className="flex-shrink-0" />
              <span className="flex-1">Report / request</span>
              <Icon name="chevron" size={14} className="flex-shrink-0 text-[var(--text-3)]" />
            </DropdownMenuTrigger>
          )}
          <DropdownMenuContent className="w-[200px]">
            <DropdownMenuLabel>Open a GitHub issue</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => openIssue("bug")}>
              <Icon name="bug" size={14} style={{ color: "#ef4444" }} />
              <span>Report a bug</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openIssue("feature")}>
              <Icon name="feature" size={14} style={{ color: "var(--brand)" }} />
              <span>Request a feature</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {collapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                    style={{ background: avatarColor(actor) }}
                  />
                }
              >
                {initials(actor)}
              </TooltipTrigger>
              <TooltipContent side="right">{actor} · human actor</TooltipContent>
            </Tooltip>
            {onOpenShortcuts && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={onOpenShortcuts}
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-border bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                    />
                  }
                >
                  <Icon name="help" size={15} />
                </TooltipTrigger>
                <TooltipContent side="right">Keyboard shortcuts</TooltipContent>
              </Tooltip>
            )}
            <button
              onClick={toggle}
              title="Toggle theme"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-border bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              <Icon name={mode === "dark" ? "sun" : "moon"} size={15} />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-1">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                style={{ background: avatarColor(actor) }}
              >
                {initials(actor)}
              </div>
              <div className="flex-1 leading-[1.15]">
                <div className="text-[12.5px] font-[550]">{actor}</div>
                <div className="text-[11px] text-[var(--text-3)]">human actor</div>
              </div>
              {onOpenShortcuts && (
                <button
                  onClick={onOpenShortcuts}
                  title="Keyboard shortcuts"
                  aria-label="Keyboard shortcuts"
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-border bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                >
                  <Icon name="help" size={15} />
                </button>
              )}
              <button
                onClick={toggle}
                title="Toggle theme"
                className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-border bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              >
                <Icon name={mode === "dark" ? "sun" : "moon"} size={15} />
              </button>
            </div>

            <UpdateIndicator />
            <BuildBadge />
          </>
        )}
      </div>
    </aside>
  );
}
