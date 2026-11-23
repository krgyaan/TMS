import { useEffect, useState } from "react";

const FIELD_MODE_STORAGE_KEY = "tms_force_field_mode";

const getIsStandalone = () => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get("pwa") === "1" || params.get("field") === "1") {
        sessionStorage.setItem(FIELD_MODE_STORAGE_KEY, "1");
        return true;
    }
    if (params.get("pwa") === "0" || params.get("field") === "0") {
        sessionStorage.removeItem(FIELD_MODE_STORAGE_KEY);
        return false;
    }
    if (sessionStorage.getItem(FIELD_MODE_STORAGE_KEY) === "1") {
        return true;
    }
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
};

/**
 * True when the app runs inside an installed standalone window
 * (the field app) — on any device. False in regular browser tabs,
 * which always get the full desktop experience.
 */
export function useFieldMode(): boolean {
    const [isFieldMode, setIsFieldMode] = useState(getIsStandalone);

    useEffect(() => {
        const mq = window.matchMedia("(display-mode: standalone)");
        const onChange = (e: MediaQueryListEvent) => setIsFieldMode(e.matches);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    return isFieldMode;
}
