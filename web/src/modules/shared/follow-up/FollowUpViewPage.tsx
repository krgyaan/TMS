import React from "react";
import { useNavigate, useParams } from "react-router-dom";

/* UI */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* Icons */
import { ArrowLeft, Edit, Building, User, Phone, Mail, FileText, Clock, Calendar } from "lucide-react";

/* Data */
import { useFollowUp } from "./follow-up.hooks";

/* ================================
   LABEL MAPPINGS (SINGLE SOURCE)
================================ */

const FREQUENCY_LABELS: Record<number, string> = {
    1: "Daily",
    2: "Alternate Days",
    3: "Weekly",
    4: "Bi-Weekly",
    5: "Monthly",
    6: "Stopped",
};

const STOP_REASON_LABELS: Record<number, string> = {
    1: "Person is getting angry / requested to stop",
    2: "Objective Achieved",
    3: "External Followup Initiated",
    4: "Remarks",
};

/* ================================
   HELPERS
================================ */

const formatDate = (date?: string | null) =>
    date
        ? new Date(date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : "-";

const formatCurrency = (amount?: number | null) =>
    amount
        ? new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
          }).format(amount)
        : "-";

/* ================================
   PAGE
================================ */

export default function FollowupViewPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const followupId = Number(id);

    const { data: followup, isLoading, isError } = useFollowUp(followupId);

    if (isLoading) return <div className="p-6">Loading…</div>;
    if (isError || !followup) return <div className="p-6 text-red-500">Unable to load follow-up</div>;

    const isStopped = followup.frequency === 6;

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="mx-auto max-w-6xl space-y-6">
                {/* HEADER */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>

                        <div>
                            <h1 className="text-3xl font-bold">Follow-up Details</h1>
                            <p className="text-muted-foreground">View complete follow-up information</p>
                        </div>
                    </div>

                    {/* <Button onClick={() => navigate(`/followups/edit/${followup.id}`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                    </Button> */}
                </div>

                {/* BASIC INFORMATION */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            Basic Information
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Info label="Area" value={followup.area} />
                        <Info label="Party Name" value={followup.partyName} />
                        <Info label="Follow-up For" value={followup.followupFor} />
                        <Info label="Amount" value={formatCurrency(followup.amount)} />
                        <Info label="Assigned To" value={followup.assignee?.name ?? "-"} />
                        <Info label="Created By" value={followup.creator?.name ?? "-"} />
                        <Info label="Next Follow-up Date" value={formatDate(followup.startFrom)} />
                    </CardContent>
                </Card>

                {/* STATUS */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Follow-up Status
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm text-muted-foreground">Frequency</label>
                            <div className="mt-1">
                                <Badge variant={isStopped ? "destructive" : "secondary"}>{FREQUENCY_LABELS[followup.frequency] ?? "N/A"}</Badge>
                            </div>
                        </div>

                        <Info label="Start From" value={formatDate(followup.startFrom)} />

                        {isStopped && (
                            <>
                                <Info label="Stop Reason" value={followup.stopReason ? STOP_REASON_LABELS[followup.stopReason] ?? "-" : "-"} className="md:col-span-2" />

                                {followup.stopReason === 2 && <Info label="Proof Details" value={followup.proofText ?? "-"} className="md:col-span-2" />}

                                {followup.stopReason === 4 && <Info label="Stop Remarks" value={followup.stopRemarks ?? "-"} className="md:col-span-2" />}
                            </>
                        )}

                        {/* <Info label="Latest Comment" value={followup.latestComment ?? "-"} className="md:col-span-2" /> */}
                    </CardContent>
                </Card>

                {/* CONTACT PERSONS */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Contact Persons
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {followup.contacts?.length ? (
                            followup.contacts.map((p, i) => (
                                <div key={i} className="border rounded-lg p-4 space-y-2">
                                    <Row icon={<User />} value={p.name} />
                                    {p.phone && <Row icon={<Phone />} value={p.phone} />}
                                    {p.email && <Row icon={<Mail />} value={p.email} />}
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-center">No contact persons added.</p>
                        )}
                    </CardContent>
                </Card>

                {/* ATTACHMENTS */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Attachments
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        {followup.attachments?.length ? (
                            <div className="space-y-2">
                                {followup.attachments.map((file: string, i: number) => (
                                    <a key={i} href={file} target="_blank" rel="noreferrer" className="block border rounded p-2 hover:bg-muted underline">
                                        {file}
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center">No attachments available.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

/* ================================
   SMALL UI HELPERS
================================ */

function Info({ label, value, className = "" }: { label: string; value?: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <label className="text-sm text-muted-foreground">{label}</label>
            <p className="font-medium mt-1">{value ?? "-"}</p>
        </div>
    );
}

function Row({ icon, value }: { icon: React.ReactNode; value: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{icon}</span>
            <span>{value}</span>
        </div>
    );
}
