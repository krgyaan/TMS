// src/pages/accounts/checklist/ChecklistCreate.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

import ChecklistForm, { type ChecklistFormData } from "@/modules/accounts/task-checklist/components/ChecklistForm";
import { useCreateChecklist } from "@/modules/accounts/task-checklist/task-checklist.hooks";
import { useGetTeamMembers } from "@/hooks/api/useUsers"; // Adjust import path as needed
import { paths } from "@/app/routes/paths";

const ChecklistCreate: React.FC = () => {
    const navigate = useNavigate();

    // Fetch account users
    const { data: users = [], isLoading: usersLoading } = useGetTeamMembers(5);

    // Create mutation
    const createMutation = useCreateChecklist();

    const handleSubmit = async (data: ChecklistFormData) => {
        try {
            await createMutation.mutateAsync({
                taskName: data.taskName,
                description: data.description,
                frequency: data.frequency,
                frequencyCondition: data.frequencyCondition ?? undefined,
                responsibility: data.responsibility,
                accountability: data.accountability,
            });

            navigate(paths.accounts.taskChecklists);
        } catch (error) {
            // Error handled by mutation
            console.error("Create failed:", error);
        }
    };

    const handleCancel = () => {
        navigate(paths.accounts.taskChecklists);
    };

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
                    <h1 className="text-2xl font-bold tracking-tight">Create Account Checklist</h1>
                    <p className="text-muted-foreground">Add a new checklist task for the accounts team</p>
                </div>
            </div>

            {/* Form */}
            <ChecklistForm
                initialData={null}
                users={users}
                usersLoading={usersLoading}
                isSubmitting={createMutation.isPending}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                mode="create"
            />
        </div>
    );
};

export default ChecklistCreate;