import { useParams, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit } from "lucide-react";
import { useMasterProject } from "@/hooks/api/useMasterProjects";
import { paths } from "@/app/routes/paths";

const ProjectsShowPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const projectId = id ? parseInt(id, 10) : null;

    if (!projectId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Project ID</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    const { data: project, isLoading, error } = useMasterProject(projectId);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                    <CardDescription className="mt-2">
                        Loading project information...
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !project) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load project. Please try again.
                </AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    const formatOrDash = (value?: string | null) =>
        value && value.toString().trim().length > 0 ? value : "—";

    const formatDateTime = (value?: string | null) =>
        value ? new Date(value).toLocaleString() : "—";

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Project Details</CardTitle>
                        <CardDescription className="mt-2">
                            View project master information
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate(paths.documentDashboard.projectsEdit(projectId))}
                        >
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <tbody>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Team
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatOrDash(project.teamName)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Project Name
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatOrDash(project.projectName)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Project Code
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatOrDash(project.projectCode)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    PO No
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatOrDash(project.poNo)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    PO Date
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatOrDash(project.poDate)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    SAP PO No
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatOrDash(project.sapPoNo)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    SAP PO Date
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatOrDash(project.sapPoDate)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Performance Certificate
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatOrDash(project.performanceCertificate)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Performance Date
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatOrDash(project.performanceDate)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Completion Document
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatOrDash(project.completionDocument)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Completion Date
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatOrDash(project.completionDate)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Tender ID
                                </th>
                                <td className="py-3 text-foreground">
                                    {project.tenderId ?? "—"}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Enquiry ID
                                </th>
                                <td className="py-3 text-foreground">
                                    {project.enquiryId ?? "—"}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Created At
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatDateTime(project.createdAt ?? null)}
                                </td>
                            </tr>
                            <tr>
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Updated At
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatDateTime(project.updatedAt ?? null)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};

export default ProjectsShowPage;
