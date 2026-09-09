import { useEffect, useState } from "react";

const getIsStandalone = () =>
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true);

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
