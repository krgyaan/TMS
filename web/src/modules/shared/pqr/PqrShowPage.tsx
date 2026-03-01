import { useParams, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit } from "lucide-react";
import { usePqr } from "@/hooks/api/usePqrs";

const parsePgTextArray = (value?: string | null): string[] => {
    if (!value) return [];
    const trimmed = value.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
        return [trimmed];
    }
    const inner = trimmed.slice(1, -1);
    if (!inner) return [];
    return inner
        .split(",")
        .map((part) => part.trim().replace(/^"(.*)"$/, "$1"))
        .filter((part) => part.length > 0);
};

const PqrShowPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const pqrId = id ? parseInt(id, 10) : null;

    if (!pqrId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid PQR ID</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    const { data: pqr, isLoading, error } = usePqr(pqrId);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>PQR Details</CardTitle>
                    <CardDescription className="mt-2">
                        Loading PQR information...
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !pqr) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load PQR. Please try again.
                </AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    const formatOrDash = (value?: string | null) =>
        value && value.trim().length > 0 ? value : "—";

    const formatDate = (value?: string | null) =>
        value && value.trim().length > 0 ? value : "—";

    const formatDateTime = (value?: string | null) =>
        value ? new Date(value).toLocaleString() : "—";

    const poFiles = parsePgTextArray(pqr.uploadPo);
    const sapGemPoFiles = parsePgTextArray(pqr.uploadSapGemPo);
    const completionFiles = parsePgTextArray(pqr.uploadCompletion);
    const performanceCertFiles = parsePgTextArray(pqr.uploadPerformanceCertificate);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>PQR Details</CardTitle>
                        <CardDescription className="mt-2">
                            View PQR information
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() =>
                                navigate(`/document-dashboard/pqr/${pqrId}/edit`)
                            }
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
                                    Team Name
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatOrDash(pqr.teamName)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Project Name
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatOrDash(pqr.projectName)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Value
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatOrDash(pqr.value)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Item
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatOrDash(pqr.item)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    PO Date
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatDate(pqr.poDate)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    SAP/GEM PO Date
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatDate(pqr.sapGemPoDate)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Completion Date
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatDate(pqr.completionDate)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Upload PO
                                </th>
                                <td className="py-3 text-foreground space-y-1">
                                    {poFiles.length > 0 ? (
                                        poFiles.map((file, index) => {
                                            const url = `/uploads/pqr-po/${file}`;
                                            return (
                                                <div key={`${file}-${index}`}>
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {poFiles.length > 1 ? `View PO ${index + 1}` : "View PO"}
                                                    </a>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        "—"
                                    )}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Upload SAP/GEM PO
                                </th>
                                <td className="py-3 text-foreground space-y-1">
                                    {sapGemPoFiles.length > 0 ? (
                                        sapGemPoFiles.map((file, index) => {
                                            const url = `/uploads/pqr-sap-gem-po/${file}`;
                                            return (
                                                <div key={`${file}-${index}`}>
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {sapGemPoFiles.length > 1
                                                            ? `View SAP/GEM PO ${index + 1}`
                                                            : "View SAP/GEM PO"}
                                                    </a>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        "—"
                                    )}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Upload Completion
                                </th>
                                <td className="py-3 text-foreground space-y-1">
                                    {completionFiles.length > 0 ? (
                                        completionFiles.map((file, index) => {
                                            const url = `/uploads/pqr-completion/${file}`;
                                            return (
                                                <div key={`${file}-${index}`}>
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {completionFiles.length > 1
                                                            ? `View Completion ${index + 1}`
                                                            : "View Completion"}
                                                    </a>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        "—"
                                    )}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Upload Performance Certificate
                                </th>
                                <td className="py-3 text-foreground space-y-1">
                                    {performanceCertFiles.length > 0 ? (
                                        performanceCertFiles.map((file, index) => {
                                            const url = `/uploads/pqr-performance-certificate/${file}`;
                                            return (
                                                <div key={`${file}-${index}`}>
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {performanceCertFiles.length > 1
                                                            ? `View Performance Certificate ${index + 1}`
                                                            : "View Performance Certificate"}
                                                    </a>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        "—"
                                    )}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Remarks
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatOrDash(pqr.remarks)}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Created At
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatDateTime(pqr.createdAt ?? null)}
                                </td>
                            </tr>
                            <tr>
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Updated At
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatDateTime(pqr.updatedAt ?? null)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};

export default PqrShowPage;
