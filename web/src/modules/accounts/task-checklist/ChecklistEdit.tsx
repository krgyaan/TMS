// src/pages/accounts/checklist/ChecklistEdit.tsx

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import ChecklistForm, { type ChecklistFormData } from "@/modules/accounts/task-checklist/components/CheckListForm";
import { useChecklist, useUpdateChecklist } from "@/modules/accounts/task-checklist/task-checklist.hooks";
import { useGetTeamMembers } from "@/hooks/api/useUsers"; 
import { paths } from "@/app/routes/paths";

const ChecklistEdit: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const checklistId = parseInt(id || "0");

    // Fetch checklist data
    const { data: checklist, isLoading: checklistLoading, isError } = useChecklist(checklistId);

    // Fetch account users
    const { data: users = [], isLoading: usersLoading } = useGetTeamMembers(5); //5 -> Accounts Team

    // Update mutation
    const updateMutation = useUpdateChecklist();

    const handleSubmit = async (data: ChecklistFormData) => {
        try {
            await updateMutation.mutateAsync({
                id: checklistId,
                data: {
                    taskName: data.taskName,
                    description: data.description,
                    frequency: data.frequency,
                    frequencyCondition: data.frequencyCondition ?? undefined,
                    responsibility: data.responsibility,
                    accountability: data.accountability,
                },
            });

            navigate(paths.accounts.taskChecklists);
        } catch (error) {
            // Error handled by mutation
            console.error("Update failed:", error);
        }
    };

    const handleCancel = () => {
        navigate(paths.accounts.taskChecklists);
    };

    // Loading state
    if (checklistLoading) {
        return (
            <div className="container mx-auto py-6">
                <Card>
                    <CardContent className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Loading checklist...</span>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Error state
    if (isError || !checklist) {
        return (
            <div className="container mx-auto py-6">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center h-64">
                        <p className="text-red-600 mb-4">Failed to load checklist</p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => navigate(paths.accounts.taskChecklists)}>
                                Go Back
                            </Button>
                            <Button onClick={() => window.location.reload()}>Retry</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(paths.accounts.taskChecklists)}
                    className="flex items-center space-x-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Edit Account Checklist</h1>
                    <p className="text-muted-foreground">Update checklist task details</p>
                </div>
            </div>

            {/* Form */}
            <ChecklistForm
                initialData={checklist}
                users={users}
                usersLoading={usersLoading}
                isSubmitting={updateMutation.isPending}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                mode="edit"
            />
        </div>
    );
};

export default ChecklistEdit;