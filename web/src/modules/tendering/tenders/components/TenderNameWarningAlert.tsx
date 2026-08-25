import { useEffect, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useCheckTenderName, useCheckTenderNo } from "@/hooks/api/useTenders";

interface TenderNameWarningAlertProps {
    tenderName?: string;
    tenderNo?: string;
    organization?: number | null;
    item?: number | null;
    onSuffixDetected?: (suggestion: string) => void;
    enabled?: boolean;
}

export function TenderNameWarningAlert({
    tenderName,
    tenderNo,
    organization,
    item,
    onSuffixDetected,
    enabled = true,
}: TenderNameWarningAlertProps) {
    const orgVal = organization ?? undefined;
    const itemVal = item ?? undefined;

    const { data: nameData, isLoading: nameLoading } = useCheckTenderName(
        tenderName ?? "",
        orgVal,
        itemVal,
    );

    const { data: noData, isLoading: noLoading } = useCheckTenderNo(
        tenderNo ?? "",
        orgVal,
        itemVal,
    );

    const nameExists = nameData?.exists ?? false;
    const nameSuggestion = nameData?.suggestion ?? null;
    const nameCount = nameData?.count ?? 0;

    const noExists = noData?.exists ?? false;
    const noCount = noData?.count ?? 0;
    const existingTenders = noData?.existingTenders ?? [];

    const lastAppliedRef = useRef<string | null>(null);

    useEffect(() => {
        if (nameExists && nameSuggestion && !nameLoading && onSuffixDetected && nameSuggestion !== lastAppliedRef.current) {
            lastAppliedRef.current = nameSuggestion;
            onSuffixDetected(nameSuggestion);
        }
    }, [nameExists, nameSuggestion, nameLoading, onSuffixDetected]);

    if (!enabled || nameLoading || noLoading) {
        return null;
    }

    if (!nameExists && !noExists) {
        return null;
    }

    return (
        <div className="space-y-2">
            {nameExists && nameSuggestion && (
                <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Duplicate tender name found ({nameCount} existing). Auto-updated to: <strong>{nameSuggestion}</strong>
                    </AlertDescription>
                </Alert>
            )}
            {noExists && (
                <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Duplicate Tender No found ({noCount} existing).
                        {existingTenders.length > 0 && (
                            <span>
                                {" "}Existing: <strong>{existingTenders[0].tenderName}</strong>
                                {" "}by <strong>{existingTenders[0].teamMemberName}</strong>
                            </span>
                        )}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
