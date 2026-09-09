import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const getIsStandalone = () =>
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true);

const getIsIOS = () =>
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/**
 * Event-driven install state — no persistence. Chrome fires
 * `beforeinstallprompt` only when the site is installable AND not already
 * installed, so the event's presence itself is the installed-detector:
 * the button renders only while the event is available, disappears the
 * moment the app is installed, and returns automatically after uninstall.
 */
export function useInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const isStandalone = getIsStandalone();
    const isIOS = getIsIOS();

    useEffect(() => {
        const onBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        const onInstalled = () => setDeferredPrompt(null);

        window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
        window.addEventListener("appinstalled", onInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
            window.removeEventListener("appinstalled", onInstalled);
        };
    }, []);

    const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
        if (!deferredPrompt) return "unavailable";
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        return outcome;
    }, [deferredPrompt]);

    return {
        canInstall: deferredPrompt !== null,
        isStandalone,
        isIOS,
        promptInstall,
    };
}
