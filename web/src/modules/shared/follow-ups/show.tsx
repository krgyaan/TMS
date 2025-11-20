import React from "react";
import { useNavigate } from "react-router-dom";

/* ShadCN Components */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* Icons */
import {
    ArrowLeft,
    Edit,
    User,
    Building,
    DollarSign,
    Calendar,
    Clock,
    FileText,
    Phone,
    Mail,
    Image as ImageIcon,
} from "lucide-react";

/* Dummy data matching your Blade structure */
const dummyFollowup = {
    id: 123,
    area: "Accounts",
    party_name: "Acme Corporation",
    followup_for: "Pending Payment",
    amount: 75000,
    assignee: { name: "John Doe" },
    creator: { name: "Jane Smith" },
    next_follow_up_date: "2024-12-15",

    /* Status */
    frequency: "4", // Weekly
    start_from: "2024-11-01",
    stop_reason: null,
    proof_text: null,
    proof_img: null,
    stop_rem: null,
    latest_comment: "Client requested additional documentation. Will follow up next week.",

    /* Contacts */
    followPerson: [
        {
            id: 1,
            name: "Rahul Sharma",
            phone: "+91 99999 88888",
            email: "rahul.sharma@acme.com",
        },
        {
            id: 2,
            name: "Sunita Patel",
            phone: "+91 88888 77777",
            email: "sunita.patel@acme.com",
        },
    ],

    /* Attachments */
    attachments: ["contract_agreement.pdf", "invoice_2345.png", "meeting_notes.docx"],
};

/* Frequency labels matching your Blade */
const FREQUENCY_LABELS: Record<string, string> = {
    "1": "Daily",
    "2": "Alternate Days",
    "3": "Twice a Day",
    "4": "Weekly",
    "5": "Twice a Week",
    "6": "Stopped",
};

/* Stop reasons matching your Blade */
const STOP_REASONS: Record<string, string> = {
    "1": "Person is getting angry / requested to stop",
    "2": "Objective Achieved",
    "3": "External Followup Initiated",
    "4": "Remarks",
};

export default function FollowupDetailsPage() {
    const navigate = useNavigate();
    const followup = dummyFollowup; // In real app, this would come from API

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="min-h-screen bg-background py-6 px-4 sm:px-6 lg:px-8">
            <div className=" mx-auto">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(-1)}
                            className="h-10 w-10 rounded-lg border border-border bg-card hover:bg-accent"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Followup Details</h1>
                            <p className="text-muted-foreground mt-1">View followup information and contact details</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="px-3 py-1.5 bg-primary/10 text-primary border-primary/20">
                            ID: #{followup.id}
                        </Badge>
                        <Button
                            onClick={() => navigate(`/followups/edit/${followup.id}`)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Basic Information Card */}
                    <Card className="border-border/50 bg-card shadow-sm">
                        <CardHeader className="pb-4 border-b border-border">
                            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <Building className="h-5 w-5 text-primary" />
                                Basic Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-muted-foreground">Area</label>
                                    <p className="text-foreground font-medium">{followup.area}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-muted-foreground">Organization</label>
                                    <p className="text-foreground font-medium">{followup.party_name}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-muted-foreground">Followup For</label>
                                    <p className="text-foreground">{followup.followup_for}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-muted-foreground">Amount</label>
                                    <p className="text-foreground font-semibold text-primary">
                                        {formatCurrency(followup.amount)}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-muted-foreground">Assigned To</label>
                                    <p className="text-foreground">{followup.assignee?.name || "-"}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-muted-foreground">Created By</label>
                                    <p className="text-foreground">{followup.creator?.name}</p>
                                </div>

                                {followup.next_follow_up_date && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-muted-foreground">
                                            Next Follow Up Date
                                        </label>
                                        <p className="text-foreground font-medium">
                                            {formatDate(followup.next_follow_up_date)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Followup Status Card */}
                    <Card className="border-border/50 bg-card shadow-sm">
                        <CardHeader className="pb-4 border-b border-border">
                            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" />
                                Followup Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-muted-foreground">Frequency</label>
                                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                        {FREQUENCY_LABELS[followup.frequency] || "N/A"}
                                    </Badge>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-muted-foreground">Start From</label>
                                    <p className="text-foreground">
                                        {followup.start_from ? formatDate(followup.start_from) : "-"}
                                    </p>
                                </div>

                                {followup.frequency === "6" && (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-muted-foreground">
                                                Stop Reason
                                            </label>
                                            <p className="text-foreground">
                                                {STOP_REASONS[followup.stop_reason!] || "-"}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-muted-foreground">
                                                Proof Text
                                            </label>
                                            <p className="text-foreground">{followup.proof_text || "-"}</p>
                                        </div>

                                        {followup.proof_img && (
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-muted-foreground">
                                                    Proof Image
                                                </label>
                                                <div className="flex items-center gap-2 p-2 border border-border rounded-lg bg-background/50">
                                                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-foreground text-sm">
                                                        {followup.proof_img}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-muted-foreground">
                                                Stop Remarks
                                            </label>
                                            <p className="text-foreground">{followup.stop_rem || "-"}</p>
                                        </div>
                                    </>
                                )}

                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-sm font-medium text-muted-foreground">Latest Comment</label>
                                    <p className="text-foreground bg-muted/30 p-3 rounded-lg border border-border">
                                        {followup.latest_comment || "-"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Persons Card */}
                    <Card className="border-border/50 bg-card shadow-sm">
                        <CardHeader className="pb-4 border-b border-border">
                            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                Contact Persons
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {followup.followPerson.length > 0 ? (
                                <div className="space-y-4">
                                    {followup.followPerson.map(person => (
                                        <div
                                            key={person.id}
                                            className="p-4 rounded-lg border border-border bg-background/50 space-y-3"
                                        >
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium text-foreground">{person.name}</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-foreground">{person.phone}</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-foreground">{person.email}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-4">No contact persons added.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Attachments Card */}
                    <Card className="border-border/50 bg-card shadow-sm">
                        <CardHeader className="pb-4 border-b border-border">
                            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Attachments
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {followup.attachments.length > 0 ? (
                                <div className="space-y-2">
                                    {followup.attachments.map((file, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50 hover:bg-accent/50 transition-colors"
                                        >
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            <a
                                                href={`/uploads/accounts/${file}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-foreground hover:text-primary hover:underline transition-colors flex-1"
                                            >
                                                {file}
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-4">No attachments available.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
