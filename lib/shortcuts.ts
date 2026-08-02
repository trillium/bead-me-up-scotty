/** Keyboard shortcuts registered in the app-shell keydown handler (components/app-shell.tsx). */
export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "K"], label: "Open the command palette" },
  { keys: ["N"], label: "Create a new bead" },
  { keys: ["/"], label: "Focus the search box" },
  { keys: ["T"], label: "Toggle light / dark theme" },
  { keys: ["?"], label: "Show this shortcuts overlay" },
  { keys: ["Esc"], label: "Close the open drawer or dialog" },
];
