import SelectField from "@/components/form/SelectField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectDashboardDetails } from "@/hooks/api/useProjectDashboard";
import { useProjectsMaster } from "@/hooks/api/useProjects";
import { AlertCircle, Edit, FileText } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";

import { EmployeeImprestsSection } from "./sections/EmployeeImprestsSection";
import { ProjectOverviewSection } from "./sections/ProjectOverviewSection";
import { PurchaseOrdersSection } from "./sections/PurchaseOrdersSection";
import { WorkOrdersSection } from "./sections/WorkOrdersSection";

export default function ProjectDashboardPage() {
    const [searchParams] = useSearchParams();
    const { isTeamLeader, isAdmin, isSuperUser, teamId } = useAuth();
    const isOpsTeamLeader = isTeamLeader && Number(teamId) == 3;
    const id = searchParams.get("id");
    const form = useForm<{ projectId: number | null }>({
        defaultValues: { projectId: id },
    });
    const projectId = form.watch("projectId");

    const { data: projects = [] } = useProjectsMaster();
    const { data: projectDetails, isLoading } = useProjectDashboardDetails(projectId);

    if (isLoading && !projectId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

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
                                <div className="md:col-span-1">
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
                            </div>
                        </CardContent>
                    </Card>
                )}

                {projectId && isLoading && (
                    <Card>
                        <CardContent className="flex items-center justify-center py-12">
                            <div className="flex flex-col items-center gap-3">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                <p className="text-sm text-muted-foreground">
                                    Loading project details...
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {projectDetails && !projectDetails?.tender && (
                    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm group-hover:scale-105 transition-transform">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold">Tender Not Linked</h3>
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold h-5 px-1.5 border-primary/20 text-primary bg-primary/5">
                                        Action Required
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                                    This project does not have a linked tender record. Linking a tender is essential for accurate budget tracking, compliance monitoring, and automated work order generation.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="hidden md:flex gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
                            >
                                <Edit className="h-4 w-4" />
                                Link Tender
                            </Button>
                        </div>
                        <div className="absolute -right-10 -bottom-6 opacity-[0.03] text-foreground pointer-events-none">
                            <AlertCircle size={120} />
                        </div>
                    </div>
                )}

                {projectId && projectDetails && (
                    <>
                        <ProjectOverviewSection
                            projectId={projectId}
                            projectDetails={projectDetails}
                        />
                        <PurchaseOrdersSection
                            purchaseOrders={projectDetails?.purchaseOrders ?? []}
                        />
                        <WorkOrdersSection
                            woBasicDetail={projectDetails?.woBasicDetail ?? {}}
                        />
                        <EmployeeImprestsSection
                            imprests={projectDetails?.imprests ?? []}
                            imprestSum={projectDetails?.imprestSum ?? 0}
                        />
                    </>
                )}

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
