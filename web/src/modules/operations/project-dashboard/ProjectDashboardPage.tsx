import { paths } from "@/app/routes/paths";
import SelectField from "@/components/form/SelectField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, FileText } from "lucide-react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { useProjectMasterOptions } from "@/hooks/api/useProjectMaster";
import { EmployeeImprestsSection } from "./sections/EmployeeImprestsSection";
import { PaymentRequestsSection } from "./sections/PaymentRequestsSection";
import { ProjectOverviewSection } from "./sections/ProjectOverviewSection";
import { PurchaseInvoicesSection } from "./sections/PurchaseInvoicesSection";
import { PurchaseOrdersSection } from "./sections/PurchaseOrdersSection";
import { VendorWorkOrdersSection } from "./sections/VendorWorkOrdersSection";

export default function ProjectDashboardPage() {
    const { projectId: projectIdParam } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { isTeamLeader, isAdmin, isSuperUser, teamId } = useAuth();
    const isOpsTeamLeader = isTeamLeader;

    const form = useForm<{ projectId: string | null }>({
        defaultValues: { projectId: projectIdParam || null },
    });
    const selectedProjectId = form.watch("projectId");
    const projectId = projectIdParam || selectedProjectId;

    const projects = useProjectMasterOptions();

    useEffect(() => {
        if (selectedProjectId && selectedProjectId !== projectIdParam) {
            navigate(paths.operations.projectDashboard(Number(selectedProjectId)), { replace: true });
        }
    }, [selectedProjectId, projectIdParam, navigate]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between"> 
                        <div>
                            <CardTitle>Project Dashboard</CardTitle>
                            <CardDescription>
                                Manage and monitor your project details
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Project Selection */}
                    {/* {(isOpsTeamLeader || isAdmin || isSuperUser) && ( */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 justify-between">
                            <FormProvider {...form}>
                                <SelectField
                                    control={form.control}
                                    name="projectId"
                                    label="Select Project"
                                    placeholder="-- Select Project --"
                                    options={projects}
                                />
                            </FormProvider>
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
                    {/* )} */}


                    {/* Empty State */}
                    {!projectId && (
                        <div className="flex flex-col items-center justify-center border border-dashed rounded-md p-6">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-1">No Project Selected</h3>
                            <p className="text-sm text-muted-foreground text-center max-w-sm">
                                Select a project from the dropdown above to view its dashboard and details.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Sections — each fetches its own data in parallel */}
            <ProjectOverviewSection projectId={Number(projectId)} />
            <PurchaseOrdersSection projectId={Number(projectId)} />
            <VendorWorkOrdersSection projectId={Number(projectId)} />
            <PurchaseInvoicesSection projectId={Number(projectId)} />
            <PaymentRequestsSection projectId={Number(projectId)} />
            <EmployeeImprestsSection projectId={Number(projectId)} />
        </div>
    );
}
