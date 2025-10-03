import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, OctagonX, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FeedbackTone = "success" | "error" | "warning" | "info";

type FeedbackMessageProps = {
    tone?: FeedbackTone;
    title?: ReactNode;
    description?: ReactNode;
    children?: ReactNode;
    className?: string;
    onDismiss?: () => void;
    dismissLabel?: string;
    actions?: ReactNode;
    floating?: boolean;
    autoCloseMs?: number | null;
};

type ToneConfig = {
    icon: React.ComponentType<{ className?: string }>;
    alertClass: string;
    titleClass: string;
    descriptionClass: string;
    iconClass: string;
};

const toneConfig: Record<FeedbackTone, ToneConfig> = {
    success: {
        icon: CheckCircle2,
        alertClass:
            "border-emerald-200 bg-emerald-100/90 text-emerald-900 [&>svg]:text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-100 dark:[&>svg]:text-emerald-300",
        titleClass: "text-emerald-950 dark:text-emerald-100",
        descriptionClass: "text-emerald-800 dark:text-emerald-200",
        iconClass: "text-emerald-600 dark:text-emerald-300",
    },
    error: {
        icon: OctagonX,
        alertClass:
            "border-red-200 bg-red-100/90 text-red-900 [&>svg]:text-red-600 dark:border-red-800 dark:bg-red-950/70 dark:text-red-100 dark:[&>svg]:text-red-300",
        titleClass: "text-red-950 dark:text-red-100",
        descriptionClass: "text-red-800 dark:text-red-200",
        iconClass: "text-red-600 dark:text-red-300",
    },
    warning: {
        icon: AlertTriangle,
        alertClass:
            "border-amber-200 bg-amber-100/90 text-amber-900 [&>svg]:text-amber-500 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-100 dark:[&>svg]:text-amber-300",
        titleClass: "text-amber-950 dark:text-amber-100",
        descriptionClass: "text-amber-800 dark:text-amber-200",
        iconClass: "text-amber-500 dark:text-amber-300",
    },
    info: {
        icon: Info,
        alertClass:
            "border-sky-200 bg-sky-100/90 text-sky-900 [&>svg]:text-sky-600 dark:border-sky-800 dark:bg-sky-950/70 dark:text-sky-100 dark:[&>svg]:text-sky-300",
        titleClass: "text-sky-950 dark:text-sky-100",
        descriptionClass: "text-sky-800 dark:text-sky-200",
        iconClass: "text-sky-600 dark:text-sky-300",
    },
};

const toneVariant: Record<FeedbackTone, "default" | "destructive"> = {
    success: "default",
    error: "destructive",
    warning: "default",
    info: "default",
};

export function FeedbackMessage({
    tone = "info",
    title,
    description,
    children,
    className,
    onDismiss,
    dismissLabel = "Dismiss",
    actions,
    floating = true,
    autoCloseMs,
}: FeedbackMessageProps) {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(true);

    const autoCloseDuration = autoCloseMs === undefined ? (floating ? 4000 : null) : autoCloseMs;

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (!visible) return;
        if (autoCloseDuration == null) return;
        const timer = window.setTimeout(() => {
            setVisible(false);
            onDismiss?.();
        }, autoCloseDuration);
        return () => window.clearTimeout(timer);
    }, [visible, autoCloseDuration, onDismiss]);

    const handleDismiss = () => {
        if (!visible) return;
        setVisible(false);
        onDismiss?.();
    };

    if (!visible) {
        return null;
    }

    const config = toneConfig[tone];
    const Icon = config.icon;
    const variant = toneVariant[tone];

    const content = (
        <Alert
            variant={variant}
            className={cn(
                "relative grid gap-y-1 pr-4 shadow-lg shadow-black/5 backdrop-blur",
                "pr-12",
                config.alertClass,
                className
            )}
        >
            <Icon aria-hidden className={cn("mt-0.5 size-5", config.iconClass)} />
            {title ? (
                <AlertTitle className={cn("text-base font-semibold", config.titleClass)}>{title}</AlertTitle>
            ) : null}
            {description || children ? (
                <AlertDescription className={cn("text-sm", config.descriptionClass)}>
                    {description}
                    {children}
                </AlertDescription>
            ) : null}
            {actions ? <div className="col-start-2 flex flex-wrap gap-2 text-sm">{actions}</div> : null}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="absolute right-2 top-2 size-7 text-muted-foreground hover:text-foreground"
            >
                <X className="size-4" aria-hidden />
                <span className="sr-only">{dismissLabel}</span>
            </Button>
        </Alert>
    );

    if (!floating) {
        return content;
    }

    if (!mounted || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-6 z-[1100] flex justify-center px-4">
            <div className="pointer-events-auto w-full max-w-xl">{content}</div>
        </div>,
        document.body
    );
}

export type { FeedbackTone, FeedbackMessageProps };
