"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"

import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

const Combobox = ComboboxPrimitive.Root

function ComboboxInputGroup({
  className,
  ...props
}: ComboboxPrimitive.InputGroup.Props) {
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-input-group"
      className={cn("flex", className)}
      {...props}
    />
  )
}

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      className={cn(
        "h-9 w-full cursor-text rounded-[9px] border border-border bg-[var(--surface-2)] px-[9px] text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-3)]",
        className
      )}
      {...props}
    />
  )
}

function ComboboxContent({
  className,
  children,
  sideOffset = 4,
  align = "start",
  ...props
}: Omit<ComboboxPrimitive.Popup.Props, "children"> &
  Pick<ComboboxPrimitive.Positioner.Props, "align" | "sideOffset"> &
  Pick<ComboboxPrimitive.List.Props, "children">) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        sideOffset={sideOffset}
        align={align}
        className="isolate z-50 outline-none"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "max-h-64 w-(--anchor-width) overflow-y-auto rounded-[9px] border border-border bg-[var(--surface)] p-1 text-[13px] text-[var(--text)] shadow-[var(--shadow-lg)]",
            className
          )}
          {...props}
        >
          <ComboboxPrimitive.Empty className="px-2 py-[7px] text-[12.5px] text-[var(--text-3)]">
            No matches.
          </ComboboxPrimitive.Empty>
          <ComboboxPrimitive.List>{children}</ComboboxPrimitive.List>
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "flex cursor-pointer items-center gap-[7px] rounded-[7px] px-2 py-[7px] text-[13px] outline-none data-[highlighted]:bg-[var(--surface-2)]",
        className
      )}
      {...props}
    >
      <span className="flex h-[14px] w-[14px] flex-shrink-0 items-center justify-center">
        <ComboboxPrimitive.ItemIndicator>
          <CheckIcon className="h-[13px] w-[13px]" />
        </ComboboxPrimitive.ItemIndicator>
      </span>
      <span className="flex-1 truncate">{children}</span>
    </ComboboxPrimitive.Item>
  )
}

export { Combobox, ComboboxInputGroup, ComboboxInput, ComboboxContent, ComboboxItem }
