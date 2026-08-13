import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft, Inbox, PartyPopper, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ServiceFeedbackForm } from "./components/ServiceFeedbackForm";
import { useCustomers } from "@/hooks/api/useCustomer";
import { useServiceFeedbackByComplaint } from "@/hooks/api/useServiceFeedback";
import { isAuthenticated } from "@/lib/auth";
import { paths } from "@/app/routes/paths";

const BRAND_LOGO = "https://volksenergie.in/wp-content/uploads/2024/09/VE_Logo-Final-Black_BG_Artboard-1.png";

export default function ServiceFeedbackFormPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isStaff = isAuthenticated();
    const { data: complaints = [], isLoading: isLoadingComplaints } = useCustomers(undefined, isStaff);

    const queryComplaintId = Number(searchParams.get("complaintId"));
    const hasInvalidComplaintId = searchParams.has("complaintId") && (!Number.isInteger(queryComplaintId) || queryComplaintId <= 0);

    const [selectedComplaintId, setSelectedComplaintId] = useState<number | null>(
        queryComplaintId > 0 ? queryComplaintId : null,
    );
    const [submitted, setSubmitted] = useState(false);

    const { data: existingFeedback, isLoading: isLoadingFeedback } = useServiceFeedbackByComplaint(selectedComplaintId ?? 0);

    if (hasInvalidComplaintId) {
        return <ErrorCard title="Invalid link" message="This link is missing complaint information. Please contact support for a valid feedback link." />;
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* ── Brand Header ─────────────────────────────────────────── */}
            <header className="flex items-center justify-center bg-[linear-gradient(135deg,#110703,#3a322d)] px-4 py-4">
                <div className="w-full max-w-2xl flex items-center justify-between gap-4">
                    <img
                        src={BRAND_LOGO}
                        alt="Volks Energie"
                        className="h-10 sm:h-12 w-auto max-w-[70%] object-contain"
                    />
                    {isStaff && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(paths.services.feedback)}
                            className="text-white/80 hover:text-white hover:bg-white/10 shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Feedback
                        </Button>
                    )}
                </div>
            </header>

            {/* ── Main ─────────────────────────────────────────────────── */}
            <main className="flex-1 w-full mx-auto max-w-xl px-4 py-6 sm:py-10">
                <div className="mb-6 text-center">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">Customer Feedback Form</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        We value your feedback. Please take a moment to rate our services.
                    </p>
                </div>

                {submitted ? (
                    <Card className="p-10 flex flex-col items-center justify-center gap-3 text-center">
                        <PartyPopper className="h-10 w-10 text-emerald-500" />
                        <h2 className="text-lg font-semibold">Thank you!</h2>
                        <p className="text-sm text-muted-foreground">
                            Your feedback has been recorded successfully.
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {/* Complaint selector — staff only; customers use ?complaintId= in the URL */}
                        {isStaff && (
                            <Card className="p-5">
                                <div className="grid gap-2">
                                    <Label htmlFor="complaint-select">Select Complaint *</Label>
                                    <Select
                                        value={selectedComplaintId ? String(selectedComplaintId) : undefined}
                                        onValueChange={value => setSelectedComplaintId(value ? Number(value) : null)}
                                    >
                                        <SelectTrigger id="complaint-select" className="w-full">
                                            <SelectValue placeholder="Choose a complaint" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {isLoadingComplaints && <SelectItem value="loading" disabled>Loading complaints...</SelectItem>}
                                            {complaints.map(c => (
                                                <SelectItem key={c.id} value={String(c.id)}>
                                                    #{c.id} — {c.ticketNo ?? c.siteProjectName} — {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </Card>
                        )}

                        {!selectedComplaintId && (
                            <Card className="p-10 flex flex-col items-center justify-center gap-3 text-center">
                                <Inbox className="h-8 w-8 text-muted-foreground/50" />
                                <p className="text-sm text-muted-foreground">
                                    {isStaff
                                        ? "Select a complaint above to fill in the customer feedback."
                                        : "This link is missing complaint information. Please contact support for a valid feedback link."}
                                </p>
                            </Card>
                        )}

                        {selectedComplaintId && isLoadingFeedback && (
                            <div className="flex justify-center py-20">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        )}

                        {selectedComplaintId && !isLoadingFeedback && existingFeedback && (
                            <Card className="p-10 flex flex-col items-center justify-center gap-3 text-center border-amber-200 bg-amber-50/50">
                                <AlertTriangle className="h-10 w-10 text-amber-500" />
                                <h2 className="text-lg font-semibold">Feedback already submitted</h2>
                                <p className="text-sm text-muted-foreground">
                                    Feedback has already been recorded for this complaint.
                                </p>
                            </Card>
                        )}

                        {selectedComplaintId && !isLoadingFeedback && !existingFeedback && (
                            <ServiceFeedbackForm
                                complaintId={selectedComplaintId}
                                standalone
                                onSuccess={() => setSubmitted(true)}
                            />
                        )}
                    </div>
                )}
            </main>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <footer className="bg-[linear-gradient(90deg,#ff6a00,#ff9500)] text-white py-3 text-center">
                <p className="text-xs sm:text-sm">&copy; {new Date().getFullYear()} Volks Energie. All Rights Reserved.</p>
            </footer>
        </div>
    );
}

function ErrorCard({ title, message }: { title: string; message: string }) {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <header className="flex items-center justify-center bg-[linear-gradient(135deg,#110703,#3a322d)] px-4 py-4">
                <div className="w-full max-w-2xl">
                    <img src={BRAND_LOGO} alt="Volks Energie" className="h-10 sm:h-12 w-auto object-contain" />
                </div>
            </header>
            <main className="flex-1 w-full mx-auto max-w-xl px-4 py-10">
                <Card className="p-10 flex flex-col items-center justify-center gap-3 text-center">
                    <AlertTriangle className="h-10 w-10 text-amber-500" />
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <p className="text-sm text-muted-foreground">{message}</p>
                </Card>
            </main>
        </div>
    );
}