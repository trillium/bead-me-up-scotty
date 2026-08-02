"use client";
import * as React from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface InstallPromptContextValue {
  canInstall: boolean;
  promptInstall: () => Promise<void>;
}

const InstallPromptContext = React.createContext<InstallPromptContextValue>({
  canInstall: false,
  promptInstall: async () => {},
});

/**
 * Owns the beforeinstallprompt/appinstalled listeners at the app root. The
 * event fires once, early in the page lifetime — often before a user has
 * navigated to Settings — so the listener must be mounted for the whole
 * page lifetime (here) rather than only while the Settings UI that
 * surfaces it is on screen, or the event is dropped and never recoverable.
 */
export function InstallPromptProvider({ children }: { children: React.ReactNode }) {
  const [deferredEvent, setDeferredEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(
    () => typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches,
  );

  React.useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = (e: MediaQueryListEvent) => setInstalled(e.matches);
    mq.addEventListener("change", onDisplayModeChange);

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredEvent(null);
    };
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      mq.removeEventListener("change", onDisplayModeChange);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = React.useCallback(async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    const choice = await deferredEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferredEvent(null);
  }, [deferredEvent]);

  const value = React.useMemo(
    () => ({ canInstall: !installed && !!deferredEvent, promptInstall }),
    [installed, deferredEvent, promptInstall],
  );

  return <InstallPromptContext.Provider value={value}>{children}</InstallPromptContext.Provider>;
}

export function useInstallPrompt() {
  return React.useContext(InstallPromptContext);
}
