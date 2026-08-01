"use client";
import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Icon } from "@/components/icons";
import type { Bead } from "@/lib/schema";
import type { BoardColumn } from "@/lib/board-columns";

/**
 * Bottom sheet listing valid status transitions for one bead — the touch
 * replacement for drag-and-drop (dnd-kit's pointer sensor never fires on
 * touch input, bead beadui-mobile). Reuses the same BoardColumn set the
 * desktop board drags between, so mobile and desktop always agree on which
 * transitions are valid.
 */
export function StatusSheet({
  bead,
  columns,
  onOpenChange,
  onSelect,
}: {
  bead: Bead | null;
  columns: BoardColumn[];
  onOpenChange: (open: boolean) => void;
  onSelect: (status: string) => void;
}) {
  const options = columns.filter(
    (c): c is BoardColumn & { status: string } =>
      c.droppable && !!c.status && c.status !== bead?.status,
  );

  return (
    <Sheet open={!!bead} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[18px] border-border bg-[var(--surface)] p-[14px]"
        style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
      >
        <SheetHeader className="gap-[2px] p-0 pb-[10px]">
          <SheetTitle className="text-[14px] font-[650] text-[var(--text)]">
            {bead ? `Move ${bead.id}` : "Change status"}
          </SheetTitle>
          <SheetDescription className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-[var(--text-3)]">
            {bead?.title}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-[6px]">
          {options.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.status)}
              className="flex h-11 flex-shrink-0 items-center gap-[10px] rounded-[10px] border border-border bg-[var(--surface-2)] px-[14px] text-left text-[13.5px] font-[550] text-[var(--text)] active:bg-[var(--surface-3)]"
            >
              <span
                className="h-[9px] w-[9px] flex-shrink-0 rounded-[3px]"
                style={{ background: c.color }}
              />
              <span className="flex-1">{c.name}</span>
              <Icon name="chevron" size={14} className="-rotate-90 flex-shrink-0 text-[var(--text-3)]" />
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
