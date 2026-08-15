import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useInsurancePolicy } from "@/hooks/api/useInsurancePolicies";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { fileUploadService } from "@/services/api/file-upload.service";
import { paths } from "@/app/routes/paths";
import { AlertCircle, ArrowLeft, Download } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    Active: 'default',
    'Expiring Soon': 'secondary',
    Expired: 'destructive',
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="mt-6 mb-2 text-lg font-semibold text-muted-foreground">{children}</h3>
);

const DetailRow = ({ label, value }: { label: string; value?: React.ReactNode }) => (
    <TableRow className="hover:bg-muted/30 transition-colors">
        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">{label}</TableCell>
        <TableCell className="w-1/4">{value ?? '—'}</TableCell>
        <TableCell className="w-1/2" />
    </TableRow>
);

const FileList = ({ files }: { files?: string[] | null }) => {
    if (!files || files.length === 0) return null;
    return (
        <div className="space-y-1">
            <div className="flex flex-wrap gap-2">
                {files.map((filePath, i) => (
                    <Button key={i} variant="outline" size="sm" asChild>
                        <a href={fileUploadService.getFileUrl(filePath)} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4" /> File {i + 1}
                        </a>
                    </Button>
                ))}
            </div>
        </div>
    );
};

const InsuranceViewPage = () => {
    const { id } = useParams<{ id: string }>();
    const policyId = Number(id);
    const navigate = useNavigate();
    const { data: policy, isLoading, error } = useInsurancePolicy(policyId);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error || !policy) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load insurance policy.</AlertDescription>
            </Alert>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Insurance Policy #{policy.id}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                    <Badge variant={STATUS_BADGE_VARIANT[policy.status] ?? 'outline'}>{policy.status}</Badge>
                    <span>{policy.daysRemaining} days remaining</span>
                </CardDescription>
                <CardAction className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody className="border rounded-2xl">
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Insurance Type
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                {policy.insuranceType}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Policy Number
                            </TableCell>
                            <TableCell className="w-1/4">
                                {policy.policyNumber}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Insurer Name
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                {policy.insurerName}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Start Date
                            </TableCell>
                            <TableCell className="w-1/4">
                                {policy.startDate ? formatDate(policy.startDate) : undefined}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                End Date
                            </TableCell>
                            <TableCell className="w-1/4">
                                {policy.endDate ? formatDate(policy.endDate) : undefined}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Value / Sum Assured
                            </TableCell>
                            <TableCell className="w-1/4">
                                {policy.sumAssured ? formatINR(policy.sumAssured) : undefined}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Project Name
                            </TableCell>
                            <TableCell className="w-1/4">
                                {policy.projectName}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Linked Request
                            </TableCell>
                            <TableCell className="w-1/4">
                                {policy.linkedRequest}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Created By
                            </TableCell>
                            <TableCell className="w-1/4">
                                {policy.createdByName}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            {
                                policy.noOfManpower && (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                            No. of Manpower
                                        </TableCell>
                                        <TableCell className="w-1/4">
                                            {policy.noOfManpower}
                                        </TableCell>
                                    </>
                                )
                            }
                            {
                                policy.manpowerNames && (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                            Manpower Covered
                                        </TableCell>
                                        <TableCell className="w-1/4">
                                            {policy.manpowerNames}
                                        </TableCell>
                                    </>
                                )
                            }
                            {
                                policy.location && (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                            Location
                                        </TableCell>
                                        <TableCell className="w-1/4">
                                            {policy.location}
                                        </TableCell>
                                    </>
                                )
                            }
                            {
                                policy.itemsCovered && (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                            Items Covered
                                        </TableCell>
                                        <TableCell className="w-1/4">
                                            {policy.itemsCovered}
                                        </TableCell>
                                    </>
                                )
                            }
                        </TableRow>
                        <TableRow>
                            {
                                policy.policyDocument && policy.policyDocument.length > 0 && (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                            Policy Document
                                        </TableCell>
                                        <TableCell className="w-1/4">
                                            <FileList files={policy.policyDocument} />
                                        </TableCell>
                                    </>
                                )
                            }
                            {
                                policy.lrCopy && policy.lrCopy.length > 0 && (
                                    <>
                                        <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                            LR Copy
                                        </TableCell>
                                        <TableCell className="w-1/4">
                                            <FileList files={policy.lrCopy} />
                                        </TableCell>
                                    </>
                                )
                            }
                        </TableRow>
                    </TableBody>
                </Table>

                {policy.linkedImprest && (
                    <>
                        <SectionTitle>Linked Imprest Details</SectionTitle>
                        <Table>
                            <TableBody className="border rounded-2xl">
                                <DetailRow
                                    label="Imprest ID"
                                    value={
                                        <a
                                            className="text-blue-600 hover:underline"
                                            href={paths.accounts.imprestsEdit(policy.linkedImprest.imprestId)}
                                        >
                                            Imprest #{policy.linkedImprest.imprestId}
                                        </a>
                                    }
                                />
                                <DetailRow label="Employee Name" value={policy.linkedImprest.userName} />
                                <DetailRow label="Category" value={policy.linkedImprest.categoryName} />
                                <DetailRow label="Project Name" value={policy.linkedImprest.projectName} />
                                <DetailRow
                                    label="Amount"
                                    value={policy.linkedImprest.amount != null ? formatINR(String(policy.linkedImprest.amount)) : undefined}
                                />
                                <DetailRow
                                    label="Date of Expense"
                                    value={policy.linkedImprest.dateOfExpense ? formatDate(policy.linkedImprest.dateOfExpense) : undefined}
                                />
                                <DetailRow
                                    label="Approval Status"
                                    value={
                                        policy.linkedImprest.approvalStatus != null ? (
                                            <Badge variant={policy.linkedImprest.approvalStatus === 1 ? "default" : "secondary"}>
                                                {policy.linkedImprest.approvalStatus === 1 ? "Approved" : "Approval Pending"}
                                            </Badge>
                                        ) : undefined
                                    }
                                />
                            </TableBody>
                        </Table>
                    </>
                )}

                {policy.linkedMakerRequest && (
                    <>
                        <SectionTitle>Linked Maker Request Details</SectionTitle>
                        <Table>
                            <TableBody className="border rounded-2xl">
                                <DetailRow label="Request No" value={policy.linkedMakerRequest.requestNo} />
                                <DetailRow label="Party Name" value={policy.linkedMakerRequest.partyName} />
                                <DetailRow
                                    label="Amount"
                                    value={policy.linkedMakerRequest.amount != null ? formatINR(policy.linkedMakerRequest.amount) : undefined}
                                />
                                <DetailRow label="Payment Mode" value={policy.linkedMakerRequest.paymentMode} />
                                <DetailRow
                                    label="Status"
                                    value={
                                        policy.linkedMakerRequest.status ? (
                                            <Badge variant="outline" className="capitalize">
                                                {policy.linkedMakerRequest.status}
                                            </Badge>
                                        ) : undefined
                                    }
                                />
                                <DetailRow label="Requested By" value={policy.linkedMakerRequest.requestedByName} />
                                <DetailRow
                                    label="Created At"
                                    value={policy.linkedMakerRequest.createdAt ? formatDate(policy.linkedMakerRequest.createdAt) : undefined}
                                />
                            </TableBody>
                        </Table>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default InsuranceViewPage;