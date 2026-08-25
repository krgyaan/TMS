import { useEffect, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useCheckTenderName } from "@/hooks/api/useTenders";

interface TenderNameWarningAlertProps {
    tenderName: string;
    organization?: number | null;
    item?: number | null;
    onSuffixDetected: (suggestion: string) => void;
    enabled?: boolean;
}

export function TenderNameWarningAlert({
    tenderName,
    organization,
    item,
    onSuffixDetected,
    enabled = true,
}: TenderNameWarningAlertProps) {
    const { data, isLoading } = useCheckTenderName(
        tenderName,
        organization ?? undefined,
        item ?? undefined,
    );

    const exists = data?.exists ?? false;
    const suggestion = data?.suggestion ?? null;
    const count = data?.count ?? 0;

    const lastAppliedRef = useRef<string | null>(null);

    useEffect(() => {
        if (exists && suggestion && !isLoading && suggestion !== lastAppliedRef.current) {
            lastAppliedRef.current = suggestion;
            onSuffixDetected(suggestion);
        }
    }, [exists, suggestion, isLoading, onSuffixDetected]);

    if (!enabled || isLoading || !exists || !suggestion) {
        return null;
    }

    return (
        <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
                Duplicate tender name found ({count} existing). Auto-updated to: <strong>{suggestion}</strong>
            </AlertDescription>
        </Alert>
    );
}
