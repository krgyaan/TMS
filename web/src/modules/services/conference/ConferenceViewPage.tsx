import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConferenceView } from "./components/ConferenceView";
import { useConference } from "@/hooks/api/useConference";
import { paths } from "@/app/routes/paths";

export default function ConferenceViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const conferenceId = Number(id);

    const { data: conference, isLoading } = useConference(conferenceId);

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (!conference) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => navigate(paths.services.conference)} className="-ml-2">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Conference Reports
                </Button>
                <p className="text-sm text-muted-foreground">Conference call report not found.</p>
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
            <ConferenceView conference={conference} />
        </div>
    );
}