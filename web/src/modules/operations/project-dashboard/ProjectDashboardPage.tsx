import { paths } from "@/app/routes/paths";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { EmployeeImprestsSection } from "./sections/EmployeeImprestsSection";
import { PaymentRequestsSection } from "./sections/PaymentRequestsSection";
import { ProjectClosureSection } from "./sections/ProjectClosureSection";
import { ProjectOverviewSection } from "./sections/ProjectOverviewSection";
import { ProjectSummarySheetSection } from "./sections/ProjectSummarySheetSection";
import { PurchaseInvoicesSection } from "./sections/PurchaseInvoicesSection";
import { PurchaseOrdersSection } from "@/modules/operations/purchase-orders/sections/PurchaseOrdersSection";
import { SaleInvoicesSection } from "./sections/SaleInvoicesSection";
import { VendorWorkOrdersSection } from "./sections/VendorWorkOrdersSection";

export default function ProjectDashboardPage() {
    const { projectId: projectIdParam } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const projectId = projectIdParam ? Number(projectIdParam) : null;

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
                        {projectId && (
                            <Button
                                onClick={() => navigate(paths.operations.projectShowPage(projectId))}
                                className="gap-2"
                            >
                                <Eye className="h-4 w-4" />
                                View Full Details
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {!projectId && (
                        <p className="text-sm text-muted-foreground">
                            No project selected. Please select a project from the projects list page.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Sections — each fetches its own data in parallel */}
            <ProjectOverviewSection projectId={projectId} />
            <ProjectSummarySheetSection projectId={projectId} />
            <PurchaseOrdersSection projectId={projectId} />
            <VendorWorkOrdersSection projectId={projectId} />
            <SaleInvoicesSection projectId={projectId} />
            <PurchaseInvoicesSection projectId={projectId} />
            <PaymentRequestsSection projectId={projectId} />
            <EmployeeImprestsSection projectId={projectId} />
            <ProjectClosureSection projectId={projectId} />
        </div>
    );
}
