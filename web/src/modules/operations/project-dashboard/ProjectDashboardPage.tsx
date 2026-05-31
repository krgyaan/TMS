import { FileText, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SelectField from "@/components/form/SelectField";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectsMaster } from "@/hooks/api/useProjects";
import { FormProvider, useForm } from "react-hook-form";
import { useSearchParams, useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";

import { EmployeeImprestsSection } from "./sections/EmployeeImprestsSection";
import { ProjectOverviewSection } from "./sections/ProjectOverviewSection";
import { PurchaseOrdersSection } from "./sections/PurchaseOrdersSection";
import { WorkOrdersSection } from "./sections/WorkOrdersSection";

export default function ProjectDashboardPage() {
    const [searchParams] = useSearchParams();
    const { isTeamLeader, isAdmin, isSuperUser, teamId } = useAuth();
    const isOpsTeamLeader = isTeamLeader && Number(teamId) == 3;
    const id = searchParams.get("id");
    const form = useForm<{ projectId: string | null }>({
        defaultValues: { projectId: id },
    });
    const projectId = form.watch("projectId");

    const { data: projects = [] } = useProjectsMaster();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background">
            <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Project Dashboard
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage and monitor your project details
                        </p>
                    </div>
                </div>

                {/* Project Selection */}
                {(isOpsTeamLeader || isAdmin || isSuperUser) && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <FormProvider {...form}>
                                        <SelectField
                                            control={form.control}
                                            name="projectId"
                                            label="Select Project"
                                            placeholder="-- Select Project --"
                                            options={projects.map((p: any) => ({
                                                id: String(p.id),
                                                name: p.projectName,
                                            }))}
                                        />
                                    </FormProvider>
                                </div>
                                {projectId && (
                                    <div className="flex items-end">
                                        <Button
                                            onClick={() => navigate(paths.operations.projectShowPage(Number(projectId)))}
                                            className="gap-2"
                                        >
                                            <Eye className="h-4 w-4" />
                                            View Full Details
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Sections — each fetches its own data in parallel */}
                <ProjectOverviewSection projectId={Number(projectId)} />
                <PurchaseOrdersSection projectId={Number(projectId)} />
                <WorkOrdersSection projectId={Number(projectId)} />
                <EmployeeImprestsSection projectId={Number(projectId)} />

                {/* Empty State */}
                {!projectId && (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-1">No Project Selected</h3>
                            <p className="text-sm text-muted-foreground text-center max-w-sm">
                                Select a project from the dropdown above to view its dashboard and details.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
