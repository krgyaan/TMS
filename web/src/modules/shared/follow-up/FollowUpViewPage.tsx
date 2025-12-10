import React from "react";
import { useNavigate, useParams } from "react-router-dom";

/* ShadCN Components */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* Icons */
import { ArrowLeft, Edit, User, Building, FileText, Phone, Mail, Clock } from "lucide-react";

import { useFollowUp } from "./follow-up.hooks";

export default function FollowupViewPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const followupId = id ? parseInt(id) : 0;

    const { data: followup, isLoading, isError } = useFollowUp(followupId);

    /* ✅ Prevent UI crash */
    if (isLoading) return <div className="p-6">Loading...</div>;
    if (isError || !followup) return <div className="p-6 text-red-500">Error loading followup</div>;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const formatCurrency = (amount: number | null | undefined) => {
        if (!amount) return "-";
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="min-h-screen bg-background py-6 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto space-y-6">
                {/* ✅ HEADER */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-lg border">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">Followup Details</h1>
                            <p className="text-muted-foreground mt-1">View followup information and contact details</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge>ID: #{followup.id}</Badge>
                        <Button onClick={() => navigate(`/followups/edit/${followup.id}`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    </div>
                </div>

                {/* ✅ BASIC INFORMATION */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            Basic Information
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-muted-foreground">Area</label>
                            <p className="font-medium">{followup.area}</p>
                        </div>

                        <div>
                            <label className="text-sm text-muted-foreground">Organization</label>
                            <p className="font-medium">{followup.partyName}</p>
                        </div>

                        <div>
                            <label className="text-sm text-muted-foreground">Amount</label>
                            <p className="font-semibold text-primary">{formatCurrency(followup.amount)}</p>
                        </div>

                        <div>
                            <label className="text-sm text-muted-foreground">Status</label>
                            <p className="capitalize">{followup.status}</p>
                        </div>

                        <div>
                            <label className="text-sm text-muted-foreground">Created At</label>
                            <p>{formatDate(followup.createdAt)}</p>
                        </div>

                        <div>
                            <label className="text-sm text-muted-foreground">Last Updated</label>
                            <p>{formatDate(followup.updatedAt)}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* ✅ FOLLOWUP STATUS */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Followup Status
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-muted-foreground">Frequency</label>
                            <Badge>{followup.frequency ?? "-"}</Badge>
                        </div>

                        <div>
                            <label className="text-sm text-muted-foreground">Start From</label>
                            <p>{followup.startFrom ? formatDate(followup.startFrom) : "-"}</p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-sm text-muted-foreground">Latest Comment</label>
                            <p className="bg-muted p-3 rounded">{followup.details || "-"}</p>
                        </div>

                        {followup.stopReason && (
                            <div className="md:col-span-2">
                                <label className="text-sm text-muted-foreground">Stop Reason</label>
                                <p>{followup.stopReason}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ✅ CONTACT PERSONS */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Contact Persons
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        {followup.contacts.length > 0 ? (
                            <div className="space-y-4">
                                {followup.contacts.map((person, index) => (
                                    <div key={index} className="p-4 rounded-lg border space-y-2">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            <span>{person.name}</span>
                                        </div>

                                        {person.org && (
                                            <div className="flex items-center gap-2">
                                                <Building className="h-4 w-4" />
                                                <span>{person.org}</span>
                                            </div>
                                        )}

                                        {person.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4" />
                                                <span>{person.phone}</span>
                                            </div>
                                        )}

                                        {person.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                <span>{person.email}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No contact persons added.</p>
                        )}
                    </CardContent>
                </Card>

                {/* ✅ ATTACHMENTS */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Attachments
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        {followup.attachments && followup.attachments.length > 0 ? (
                            <div className="space-y-2">
                                {followup.attachments.map((file, index) => (
                                    <div key={index} className="p-2 border rounded">
                                        {file}
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
    );
}
