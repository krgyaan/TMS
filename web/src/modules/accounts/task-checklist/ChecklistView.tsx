// src/pages/accounts/checklist/ChecklistDetail.tsx

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, User, UserCheck, Clock, FileText, Edit } from "lucide-react";
import { format } from "date-fns";

import { useChecklist } from "@/modules/accounts/task-checklist/task-checklist.hooks";
import { useAuth } from "@/contexts/AuthContext";
import { paths } from "@/app/routes/paths";

// Frequency badge colors
const frequencyColors: Record<string, string> = {
    Daily: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    Weekly: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    Monthly: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    Quarterly: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    Annual: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

// Detail Item Component
interface DetailItemProps {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
}

const DetailItem: React.FC<DetailItemProps> = ({ icon, label, value }) => (
    <div className="flex items-start gap-3 py-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="mt-1 text-sm font-semibold">{value}</div>
        </div>
    </div>
);

// Loading Skeleton
const DetailSkeleton: React.FC = () => (
    <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3 py-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-48" />
                </div>
            </div>
        ))}
    </div>
);

const ChecklistView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { canUpdate } = useAuth();

    const checklistId = parseInt(id || "0", 10);
    const { data: checklist, isLoading, isError } = useChecklist(checklistId);

    // Get frequency condition display text
    const getFrequencyConditionText = () => {
        if (!checklist || checklist.frequencyCondition === null) return null;

        if (checklist.frequency === "Weekly") {
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            return days[checklist.frequencyCondition] || checklist.frequencyCondition;
        }

        if (checklist.frequency === "Monthly") {
            const day = checklist.frequencyCondition;
            const suffix = day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th";
            return `${day}${suffix} of each month`;
        }

        return checklist.frequencyCondition;
    };

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-9 w-20" />
                            <Skeleton className="h-8 w-48" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <DetailSkeleton />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isError || !checklist) {
        return (
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <p className="text-red-600 mb-4">Failed to load checklist details</p>
                            <div className="flex justify-center gap-2">
                                <Button variant="outline" onClick={() => navigate(-1)}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Go Back
                                </Button>
                                <Button onClick={() => window.location.reload()}>Retry</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>

                {canUpdate("accounts.checklists") && (
                    <Button
                        size="sm"
                        onClick={() => navigate(`/accounts/checklists/${checklist.id}/edit`)}
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                    </Button>
                )}
            </div>

            {/* Main Card */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-xl">{checklist.taskName}</CardTitle>
                            <CardDescription className="mt-1">Checklist Task Details</CardDescription>
                        </div>
                        <Badge className={frequencyColors[checklist.frequency] || ""}>
                            {checklist.frequency}
                        </Badge>
                    </div>
                </CardHeader>

                <Separator />

                <CardContent className="pt-6">
                    <div className="space-y-1">
                        {/* Frequency */}
                        <DetailItem
                            icon={<Clock className="h-5 w-5 text-muted-foreground" />}
                            label="Frequency"
                            value={
                                <div className="flex items-center gap-2">
                                    <span>{checklist.frequency}</span>
                                    {getFrequencyConditionText() && (
                                        <span className="text-muted-foreground">
                                            ({getFrequencyConditionText()})
                                        </span>
                                    )}
                                </div>
                            }
                        />

                        <Separator />

                        {/* Description */}
                        <DetailItem
                            icon={<FileText className="h-5 w-5 text-muted-foreground" />}
                            label="Description"
                            value={
                                <p className="text-sm leading-relaxed">
                                    {checklist.description || (
                                        <span className="text-muted-foreground italic">
                                            No description provided
                                        </span>
                                    )}
                                </p>
                            }
                        />

                        <Separator />

                        {/* Responsible User */}
                        <DetailItem
                            icon={<User className="h-5 w-5 text-muted-foreground" />}
                            label="Responsible User"
                            value={
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-xs font-semibold text-primary">
                                            {checklist.responsibleUserName?.[0]?.toUpperCase() || "?"}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium">
                                            {checklist.responsibleUserName || "Not assigned"}
                                        </p>
                                        {checklist.responsibleUserEmail && (
                                            <p className="text-xs text-muted-foreground">
                                                {checklist.responsibleUserEmail}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            }
                        />

                        <Separator />

                        {/* Accountable User */}
                        <DetailItem
                            icon={<UserCheck className="h-5 w-5 text-muted-foreground" />}
                            label="Accountable User"
                            value={
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center">
                                        <span className="text-xs font-semibold">
                                            {checklist.accountableUserName?.[0]?.toUpperCase() || "?"}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium">
                                            {checklist.accountableUserName || "Not assigned"}
                                        </p>
                                        {checklist.accountableUserEmail && (
                                            <p className="text-xs text-muted-foreground">
                                                {checklist.accountableUserEmail}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            }
                        />

                        <Separator />

                        {/* Timestamps */}
                        <DetailItem
                            icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
                            label="Timeline"
                            value={
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Created</p>
                                        <p className="font-medium">
                                            {format(new Date(checklist.createdAt), "dd MMM yyyy, hh:mm a")}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Last Updated</p>
                                        <p className="font-medium">
                                            {format(new Date(checklist.updatedAt), "dd MMM yyyy, hh:mm a")}
                                        </p>
                                    </div>
                                </div>
                            }
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ChecklistDetail;