import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConferenceForm } from "./components/ConferenceForm";
import { useConferenceByComplaint } from "@/hooks/api/useConference";
import { paths } from "@/app/routes/paths";

export default function ConferenceCreatePage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const complaintId = searchParams.get("complaintId") ? Number(searchParams.get("complaintId")) : undefined;

    const { data: existingReport, isLoading } = useConferenceByComplaint(complaintId ?? 0);

    if (complaintId && isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 relative">
            <div className="sticky top-[-1rem] z-30 bg-background py-4 -mt-4 border-b border-border shadow-md transition-all">
                <Button variant="ghost" size="sm" onClick={() => navigate(paths.services.conference)} className="-ml-2">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Conference Reports
                </Button>
            </div>

            <div className="mb-4">
                <h1 className="text-lg font-semibold">
                    {existingReport ? "Edit Conference Call Report" : "New Conference Call Report"}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {existingReport
                        ? "Update the conference call report details for this complaint."
                        : "Create a conference call report for the selected complaint."}
                </p>
            </div>

            <ConferenceForm
                complaintId={complaintId}
                conferenceId={existingReport?.id}
            />
        </div>
    );
}