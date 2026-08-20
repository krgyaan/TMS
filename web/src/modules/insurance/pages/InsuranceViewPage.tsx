import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useInsurancePolicy } from "@/hooks/api/useInsurancePolicies";
import { useImprestDetail } from "@/hooks/api/imprest.hooks";
import { useMakerRequestDetails } from "@/hooks/api/useMakerRequests";
import { usePaymentRequestDetails } from "@/hooks/api/useProjectPaymentRequests";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { fileUploadService } from "@/services/api/file-upload.service";
import { paths } from "@/app/routes/paths";
import { STATUS_CONFIG } from "@/modules/operations/payment-requests/constants";
import { PaymentRequestDetailFields } from "@/modules/operations/payment-requests/components/PaymentRequestDetailFields";
import type { PaymentRequestRow } from "@/modules/operations/payment-requests/helpers/paymentRequest.types";
import type {
    LinkedImprestDetails,
    LinkedMakerRequestDetails,
    LinkedPaymentRequestDetails,
} from "@/modules/insurance/helpers/insurance.types";
import { AlertCircle, ArrowLeft, Download } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    Active: 'default',
    'Expiring Soon': 'secondary',
    Expired: 'destructive',
};

const RequestStatusBadge = ({ status }: { status?: string | null }) => {
    if (!status) return null;
    const config = STATUS_CONFIG[status];
    if (!config) {
        return <Badge variant="outline" className="capitalize">{status}</Badge>;
    }
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
        </span>
    );
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="mt-6 mb-2 text-lg font-semibold text-muted-foreground">{children}</h3>
);

const Field = ({ label, value }: { label: string; value?: React.ReactNode }) => (
    <div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-0.5">{value ?? '—'}</div>
    </div>
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

const EntryCard = ({ badge, title, action, children }: {
    badge: string;
    title: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
}) => (
    <div className="rounded-2xl border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{badge}</Badge>
                <span className="font-medium">{title}</span>
            </div>
            {action}
        </div>
        {children}
    </div>
);

const LinkedImprestEntry = ({ entry }: { entry: LinkedImprestDetails }) => {
    const { data: detail, isLoading } = useImprestDetail(entry.imprestId);
    return (
        <EntryCard
            badge={entry.linkType}
            title={`Imprest #${entry.imprestId}`}
            action={
                <a className="text-blue-600 hover:underline text-sm" href={paths.accounts.imprestsEdit(entry.imprestId)}>
                    View Imprest
                </a>
            }
        >
            {isLoading ? (
                <Skeleton className="h-32 w-full" />
            ) : detail ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Field label="Party Name" value={detail.partyName} />
                    <Field label="Project" value={detail.projectName} />
                    <Field label="Category" value={detail.categoryName} />
                    <Field label="Amount" value={detail.amount != null ? formatINR(String(detail.amount)) : undefined} />
                    <Field label="Date of Expense" value={detail.dateOfExpense ? formatDate(detail.dateOfExpense) : undefined} />
                    <Field label="Remark" value={detail.remark} />
                    <Field label="Accounts Remark" value={detail.accRemark} />
                    <Field
                        label="Approval Status"
                        value={
                            <Badge variant={detail.approvalStatus === 1 ? "default" : "secondary"}>
                                {detail.approvalStatus === 1 ? "Approved" : "Approval Pending"}
                            </Badge>
                        }
                    />
                    <Field
                        label="Tally Status"
                        value={
                            <Badge variant={detail.tallyStatus === 1 ? "default" : "secondary"}>
                                {detail.tallyStatus === 1 ? "Tallied" : "Not Tallied"}
                            </Badge>
                        }
                    />
                    <Field
                        label="Proof Status"
                        value={
                            <Badge variant={detail.proofStatus === 1 ? "default" : "secondary"}>
                                {detail.proofStatus === 1 ? "Proof Verified" : "Proof Pending"}
                            </Badge>
                        }
                    />
                    {detail.invoiceProof && detail.invoiceProof.length > 0 && (
                        <div className="col-span-2">
                            <div className="text-xs font-medium text-muted-foreground mb-1">Invoice / Proof Files</div>
                            <div className="flex flex-wrap gap-2">
                                {detail.invoiceProof.map((p, i) => (
                                    <Button key={i} variant="outline" size="sm" asChild>
                                        <a href={p.url} target="_blank" rel="noreferrer">
                                            <Download className="h-4 w-4" /> {p.name || `File ${i + 1}`}
                                        </a>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-muted-foreground text-sm">No details found.</p>
            )}
        </EntryCard>
    );
};

const LinkedMakerRequestEntry = ({ entry }: { entry: LinkedMakerRequestDetails }) => {
    const { data: detail, isLoading } = useMakerRequestDetails(entry.makerRequestId);
    return (
        <EntryCard
            badge={entry.linkType}
            title={<span className="font-mono">{detail?.requestNo ?? entry.requestNo}</span>}
            action={<RequestStatusBadge status={entry.status} />}
        >
            {isLoading ? (
                <Skeleton className="h-32 w-full" />
            ) : detail ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Field label="Party Name" value={detail.partyName} />
                    <Field label="Amount" value={detail.amount != null ? formatINR(detail.amount) : undefined} />
                    <Field label="Category" value={detail.category} />
                    <Field label="Payment Mode" value={detail.paymentMode?.replaceAll('_', ' ').toLowerCase()} />
                    <Field label="Account Number" value={detail.accountNumber} />
                    <Field label="Bank Name" value={detail.bankName} />
                    <Field label="IFSC" value={detail.ifsc} />
                    <Field label="Requested By" value={detail.requestedByName} />
                    <Field label="Created At" value={formatDate(detail.createdAt)} />
                    <Field label="UTR Number" value={detail.utrNumber} />
                    {detail.rejectionReason && (
                        <div className="col-span-2">
                            <div className="text-xs font-medium text-muted-foreground">Rejection Reason</div>
                            <div className="mt-0.5 text-red-600">{detail.rejectionReason}</div>
                        </div>
                    )}
                    {detail.remark && <Field label="Remark" value={detail.remark} />}
                    {detail.portalLink && (
                        <div className="col-span-2">
                            <div className="text-xs font-medium text-muted-foreground">Portal Link</div>
                            <div className="mt-0.5 text-blue-600 underline break-all">{detail.portalLink}</div>
                        </div>
                    )}
                    {detail.billFiles?.length > 0 && (
                        <div className="col-span-2">
                            <div className="text-xs font-medium text-muted-foreground mb-1">Bill / Proof Files</div>
                            <FileList files={detail.billFiles} />
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-muted-foreground text-sm">No details found.</p>
            )}
        </EntryCard>
    );
};

const LinkedPaymentRequestEntry = ({ entry }: { entry: LinkedPaymentRequestDetails }) => {
    const { data: detailData, isLoading } = usePaymentRequestDetails(entry.paymentRequestId);
    const detail = detailData as PaymentRequestRow | undefined;
    return (
        <EntryCard
            badge={entry.linkType}
            title={<span className="font-mono">{detail?.requestNo ?? entry.requestNo}</span>}
            action={<RequestStatusBadge status={entry.status} />}
        >
            {isLoading ? (
                <Skeleton className="h-32 w-full" />
            ) : detail ? (
                <PaymentRequestDetailFields detail={detail} />
            ) : (
                <p className="text-muted-foreground text-sm">No details found.</p>
            )}
        </EntryCard>
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

                {policy.linkedImprests && policy.linkedImprests.length > 0 && (
                    <>
                        <SectionTitle>Linked Imprests</SectionTitle>
                        <div className="space-y-4">
                            {policy.linkedImprests.map(e => (
                                <LinkedImprestEntry key={e.imprestId} entry={e} />
                            ))}
                        </div>
                    </>
                )}

                {policy.linkedMakerRequests && policy.linkedMakerRequests.length > 0 && (
                    <>
                        <SectionTitle>Linked Maker Requests</SectionTitle>
                        <div className="space-y-4">
                            {policy.linkedMakerRequests.map(e => (
                                <LinkedMakerRequestEntry key={e.makerRequestId} entry={e} />
                            ))}
                        </div>
                    </>
                )}

                {policy.linkedPaymentRequests && policy.linkedPaymentRequests.length > 0 && (
                    <>
                        <SectionTitle>Linked Payment Requests</SectionTitle>
                        <div className="space-y-4">
                            {policy.linkedPaymentRequests.map(e => (
                                <LinkedPaymentRequestEntry key={e.paymentRequestId} entry={e} />
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default InsuranceViewPage;