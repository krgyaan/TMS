import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALLED_FLAG_KEY = "tms_pwa_installed";

const getIsStandalone = () =>
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true);

const getIsIOS = () =>
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

const getStoredInstalledFlag = () => {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(INSTALLED_FLAG_KEY) === "1";
};

const markInstalled = () => {
    try {
        localStorage.setItem(INSTALLED_FLAG_KEY, "1");
    } catch {
        return;
    }
};

const clearInstalledFlag = () => {
    try {
        localStorage.removeItem(INSTALLED_FLAG_KEY);
    } catch {
        return;
    }
};

const getInstalledRelatedApp = async (): Promise<boolean> => {
    const nav = navigator as Navigator & {
        getInstalledRelatedApps?: () => Promise<Array<{ platform: string; id?: string; url?: string }>>;
    };
    if (typeof nav.getInstalledRelatedApps !== "function") return false;
    try {
        const apps = await nav.getInstalledRelatedApps();
        return Array.isArray(apps) && apps.length > 0;
    } catch {
        return false;
    }
};

export function useInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isStandalone, setIsStandalone] = useState(getIsStandalone);
    const [relatedAppInstalled, setRelatedAppInstalled] = useState(false);
    const [relatedAppCheckDone, setRelatedAppCheckDone] = useState(false);
    const [flagInstalled, setFlagInstalled] = useState(getStoredInstalledFlag);
    const isIOS = getIsIOS();

    // Browsers with getInstalledRelatedApps (Chrome/Edge): the browser's own
    // record is authoritative — it becomes false after uninstall, so the app
    // can re-show the install button. Until the async check resolves, fall
    // back to the flag to avoid a flash for installed users. Browsers without
    // the API (iOS Safari, Firefox) keep using the flag alone.
    const isInstalled = isStandalone || (relatedAppCheckDone ? relatedAppInstalled : flagInstalled);

    useEffect(() => {
        let cancelled = false;
        getInstalledRelatedApp().then(installed => {
            if (cancelled) return;
            setRelatedAppInstalled(installed);
            setRelatedAppCheckDone(true);
            if (!installed && getStoredInstalledFlag()) {
                clearInstalledFlag();
                setFlagInstalled(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const onBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        const onInstalled = () => {
            markInstalled();
            setFlagInstalled(true);
            setDeferredPrompt(null);
            setIsStandalone(true);
        };

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
        if (outcome === "accepted") {
            markInstalled();
            setFlagInstalled(true);
        }
        return outcome;
    }, [deferredPrompt]);

    return {
        canInstall: deferredPrompt !== null,
        isStandalone,
        isInstalled,
        isIOS,
        promptInstall,
    };
}
