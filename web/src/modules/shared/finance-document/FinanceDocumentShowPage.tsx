import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit } from "lucide-react";
import { useFinanceDocument } from "@/hooks/api/useFinanceDocuments";
import { useFinancialYears } from "@/hooks/api/useFinancialYear";
import { useFinanceDocTypes } from "@/hooks/api/useFinanceDocType";

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

const FinanceDocumentShowPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const financeDocumentId = id ? parseInt(id, 10) : null;

    if (!financeDocumentId) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid Finance Document ID</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    const { data: financeDocument, isLoading, error } = useFinanceDocument(financeDocumentId);
    const { data: financialYears = [] } = useFinancialYears();
    const { data: financeDocTypes = [] } = useFinanceDocTypes();

    const financialYearMap = useMemo(
        () =>
            Object.fromEntries(
                financialYears.map((fy) => [String(fy.id), fy.name] as const)
            ),
        [financialYears]
    );

    const financeDocTypeMap = useMemo(
        () =>
            Object.fromEntries(
                financeDocTypes.map((dt) => [String(dt.id), dt.name] as const)
            ),
        [financeDocTypes]
    );

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Finance Document Details</CardTitle>
                    <CardDescription className="mt-2">
                        Loading finance document information...
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !financeDocument) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Failed to load finance document. Please try again.
                </AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    const documentTypeLabel =
        financeDocTypeMap[financeDocument.documentType] ?? "—";
    const financialYearLabel =
        financialYearMap[financeDocument.financialYear] ?? "—";

    const documentFiles = parsePgTextArray(financeDocument.uploadFile);

    const formatDateTime = (value?: string | null) =>
        value ? new Date(value).toLocaleString() : "—";

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Finance Document Details</CardTitle>
                        <CardDescription className="mt-2">
                            View finance document information
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() =>
                                navigate(
                                    `/document-dashboard/finance-document/${financeDocumentId}/edit`
                                )
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
                                    Document Name
                                </th>
                                <td className="py-3 text-foreground">
                                    {financeDocument.documentName ?? "—"}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Document Type
                                </th>
                                <td className="py-3 text-foreground">
                                    {documentTypeLabel}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Financial Year
                                </th>
                                <td className="py-3 text-foreground">
                                    {financialYearLabel}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Document
                                </th>
                                <td className="py-3 text-foreground space-y-1">
                                    {documentFiles.length > 0 ? (
                                        documentFiles.map((fileName, index) => {
                                            const url = `/uploads/finance-document/${fileName}`;
                                            return (
                                                <div key={`${fileName}-${index}`}>
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {documentFiles.length > 1
                                                            ? `View Document ${index + 1}`
                                                            : "View Document"}
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
                                    Created At
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatDateTime(financeDocument.createdAt ?? null)}
                                </td>
                            </tr>
                            <tr>
                                <th className="w-1/3 py-3 pr-4 text-left font-medium text-muted-foreground">
                                    Updated At
                                </th>
                                <td className="py-3 text-foreground">
                                    {formatDateTime(financeDocument.updatedAt ?? null)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};

export default FinanceDocumentShowPage;
