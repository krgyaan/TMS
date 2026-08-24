import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useCheckProjectName } from "@/hooks/api/useWoBasicDetails";

interface ProjectNameWarningAlertProps {
    projectName: string;
    teamId?: number | null;
    onSuffixChange: (suggestion: string) => void;
    enabled?: boolean;
}

export function ProjectNameWarningAlert({
    projectName,
    teamId,
    onSuffixChange,
    enabled = true,
}: ProjectNameWarningAlertProps) {
    const { data, isLoading } = useCheckProjectName(projectName, teamId ?? undefined);

    const exists = data?.exists ?? false;
    const suggestion = data?.suggestion ?? null;
    const count = data?.count ?? 0;

    useEffect(() => {
        if (exists && suggestion) {
            onSuffixChange(suggestion);
        }
    }, [exists, suggestion, onSuffixChange]);

    if (!enabled || isLoading || !exists || !suggestion) {
        return null;
    }

    return (
        <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex">
                A project with name "<b>{projectName}</b>" already exists ({count} found). It will become: <b>{suggestion}</b>
            </AlertDescription>
        </Alert>
    );
}
