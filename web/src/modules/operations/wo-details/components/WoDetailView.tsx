import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import { cn } from '@/lib/utils';
import type {
    TenderDocumentsChecklist,
    WoBillingAddress,
    WoBillingBoq,
    WoDetailsHistoryEntry,
    WoDetailWithRelations,
} from '@/modules/operations/types/wo.types';
import {
    Building2,
    CheckCircle2,
    FileEdit,
    FileText,
    Link2,
    Package,
    Pen,
    SkipForward,
    TrendingUp,
    Truck,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface PageState {
    status: 'completed' | 'skipped' | 'draft' | 'pending';
    actorName?: string | null;
    at?: string | null;
}

function getPageState(
    data: WoDetailWithRelations,
    history: WoDetailsHistoryEntry[],
    pageNum: number
): PageState {
    const completedPages = data.completedPages ?? [];
    const skippedPages = data.skippedPages ?? [];
    const isCompleted = completedPages.includes(pageNum);
    const isSkipped = skippedPages.includes(pageNum);

    const pageEvents = history.filter((entry) => entry.pageNo === pageNum);
    const expectedAction = isCompleted
        ? 'page_submitted'
        : isSkipped
            ? 'page_skipped'
            : null;
    const latestEvent =
        (expectedAction
            ? pageEvents.find((entry) => entry.action === expectedAction)
            : undefined) ?? pageEvents[0];

    if (isCompleted) {
        return {
            status: 'completed',
            actorName: latestEvent?.actorName,
            at: latestEvent?.createdAt,
        };
    }
    if (isSkipped) {
        return {
            status: 'skipped',
            actorName: latestEvent?.actorName,
            at: latestEvent?.createdAt,
        };
    }
    if (latestEvent) {
        return {
            status: 'draft',
            actorName: latestEvent.actorName,
            at: latestEvent.createdAt,
        };
    }
    return { status: 'pending' };
}

function PageStatusBadge({
    data,
    history,
    pageNum,
}: {
    data: WoDetailWithRelations;
    history: WoDetailsHistoryEntry[];
    pageNum: number;
}) {
    const state = getPageState(data, history, pageNum);
    const actor = state.actorName ? ` by ${state.actorName}` : '';
    const title = state.at ? formatDateTime(state.at) : undefined;

    if (state.status === 'completed') {
        return (
            <Badge
                variant="outline"
                className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700"
                title={title}
            >
                <CheckCircle2 className="h-3 w-3" />
                Completed{actor}
            </Badge>
        );
    }

    if (state.status === 'skipped') {
        return (
            <Badge
                variant="outline"
                className="gap-1 border-amber-300 bg-amber-50 text-amber-700"
                title={title}
            >
                <SkipForward className="h-3 w-3" />
                Skipped{actor}
            </Badge>
        );
    }

    if (state.status === 'draft') {
        return (
            <Badge
                variant="outline"
                className="gap-1 border-blue-300 bg-blue-50 text-blue-700"
                title={title}
            >
                <Pen className="h-3 w-3" />
                Draft{actor}
            </Badge>
        );
    }

    return <Badge variant="secondary">Pending</Badge>;
}

function DetailSection({
    title,
    icon,
    status,
    description,
    children,
}: {
    title: string;
    icon?: ReactNode;
    status?: ReactNode;
    description?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="space-y-4 py-6 first:pt-0 last:pb-0">
            <header className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <h3 className="flex items-center gap-2 text-base font-semibold">
                        {icon}
                        {title}
                    </h3>
                    {description && (
                        <p className="text-sm text-muted-foreground">{description}</p>
                    )}
                </div>
                {status && <div className="shrink-0">{status}</div>}
            </header>
            <div className="space-y-4">{children}</div>
        </section>
    );
}

function InfoGrid({ children }: { children: ReactNode }) {
    return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function InfoItem({
    label,
    value,
    className,
}: {
    label: string;
    value: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('min-w-0 space-y-1', className)}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
            </p>
            <div className="text-sm">{value ?? '—'}</div>
        </div>
    );
}

function BoolBadge({
    value,
    trueLabel = 'Yes',
    falseLabel = 'No',
}: {
    value: boolean;
    trueLabel?: string;
    falseLabel?: string;
}) {
    return (
        <Badge variant={value ? 'default' : 'secondary'}>
            {value ? trueLabel : falseLabel}
        </Badge>
    );
}

function ChecklistList({ checklist }: { checklist: TenderDocumentsChecklist }) {
    return (
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {Object.entries(checklist).map(([key, value]) => (
                <div
                    key={key}
                    className="flex items-center justify-between gap-3 border-b border-dashed py-2 text-sm last:border-0"
                >
                    <span className="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <BoolBadge value={value} />
                </div>
            ))}
        </div>
    );
}

function BoqTable({
    items,
    emptyLabel,
}: {
    items: WoBillingBoq[];
    emptyLabel: string;
}) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-16">Sr. No.</TableHead>
                    <TableHead>Item Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item) => (
                    <TableRow key={item.id}>
                        <TableCell>{item.srNo}</TableCell>
                        <TableCell>{item.itemDescription}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                            {formatINR(parseFloat(item.rate))}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                            {formatINR(parseFloat(item.amount || '0'))}
                        </TableCell>
                    </TableRow>
                ))}
                {items.length === 0 && (
                    <TableRow>
                        <TableCell
                            colSpan={5}
                            className="py-6 text-center text-sm italic text-muted-foreground"
                        >
                            {emptyLabel}
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}

function AddressList({
    title,
    addresses,
    emptyLabel,
}: {
    title: string;
    addresses: WoBillingAddress[];
    emptyLabel: string;
}) {
    return (
        <div className="space-y-2">
            <p className="text-sm font-medium">{title}</p>
            {addresses.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">{emptyLabel}</p>
            ) : (
                <div className="space-y-2">
                    {addresses.map((addr, index) => {
                        const srNos = Array.isArray(addr.srNos)
                            ? addr.srNos.join(', ')
                            : addr.srNos || '—';

                        return (
                            <div
                                key={addr.id ?? index}
                                className="space-y-1 rounded-md border p-3 text-sm"
                            >
                                <p className="font-medium">{addr.customerName}</p>
                                <p className="whitespace-pre-wrap text-muted-foreground">
                                    {addr.address}
                                </p>
                                <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                                    <span>GST: {addr.gst || 'N/A'}</span>
                                    <span>Sr. Nos: {srNos}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function DocumentList({ documents }: { documents?: string[] | null }) {
    if (!documents?.length) {
        return <span className="text-sm italic text-muted-foreground">None listed</span>;
    }
    return (
        <div className="flex flex-wrap gap-2">
            {documents.map((doc, index) => (
                <Badge key={`${doc}-${index}`} variant="outline">
                    {doc}
                </Badge>
            ))}
        </div>
    );
}

export function WoDetailView({
    data,
    history = [],
}: {
    data: WoDetailWithRelations;
    history?: WoDetailsHistoryEntry[];
}) {
    if (!data) return null;

    const {
        woBasicDetail,
        billingBoq = [],
        buybackBoq = [],
        billingAddresses = [],
        shippingAddresses = [],
        amendments = [],
        acceptance,
    } = data;

    const checklist = data.tenderDocumentsChecklist;

    return (
        <div className="divide-y divide-border/60">
            <DetailSection
                title="Project Information"
                icon={<Building2 className="h-4 w-4 text-primary" />}
            >
                <InfoGrid>
                    <InfoItem
                        label="Current Stage"
                        value={
                            <Badge variant="outline" className="capitalize">
                                {woBasicDetail?.currentStage?.replace(/_/g, ' ') || 'Not Started'}
                            </Badge>
                        }
                    />
                    <InfoItem label="Progress" value={`Page ${data.currentPage} of 7`} />
                    <InfoItem label="Created" value={formatDateTime(data.createdAt)} />
                    <InfoItem label="Last Updated" value={formatDateTime(data.updatedAt)} />
                </InfoGrid>
            </DetailSection>

            <DetailSection
                title="Project Handover (Page 1)"
                icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                status={<PageStatusBadge data={data} history={history} pageNum={1} />}
                description={
                    data.checklistCompletedAt
                        ? `Completed on ${formatDateTime(data.checklistCompletedAt)}`
                        : undefined
                }
            >
                {checklist ? (
                    <ChecklistList checklist={checklist} />
                ) : (
                    <p className="text-sm italic text-muted-foreground">
                        Checklist not yet filled.
                    </p>
                )}
            </DetailSection>

            <DetailSection
                title="Compliance Obligations (Page 2)"
                icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                status={<PageStatusBadge data={data} history={history} pageNum={2} />}
            >
                <InfoGrid>
                    <InfoItem
                        label="LD Applicable"
                        value={<BoolBadge value={data.ldApplicable} />}
                    />
                    <InfoItem
                        label="PBG Required"
                        value={<BoolBadge value={data.isPbgApplicable} />}
                    />
                    {data.ldApplicable && (
                        <>
                            <InfoItem label="Max LD %" value={data.maxLd ? `${data.maxLd}%` : '—'} />
                            <InfoItem
                                label="LD Start Date"
                                value={data.ldStartDate ? formatDateTime(data.ldStartDate) : '—'}
                            />
                        </>
                    )}
                    <InfoItem
                        label="Contract / Agreement"
                        value={<BoolBadge value={data.isContractAgreement} />}
                    />
                    <InfoItem
                        label="Detailed PO Follow-up"
                        value={
                            <BoolBadge
                                value={data.detailedPoApplicable}
                                trueLabel="Needed"
                                falseLabel="Not Needed"
                            />
                        }
                    />
                </InfoGrid>
            </DetailSection>

            <DetailSection
                title="SWOT Analysis (Page 3)"
                icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                status={<PageStatusBadge data={data} history={history} pageNum={3} />}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <InfoItem
                        label="Strengths"
                        value={<p className="whitespace-pre-wrap">{data.swotStrengths || '—'}</p>}
                    />
                    <InfoItem
                        label="Weaknesses"
                        value={<p className="whitespace-pre-wrap">{data.swotWeaknesses || '—'}</p>}
                    />
                    <InfoItem
                        label="Opportunities"
                        value={<p className="whitespace-pre-wrap">{data.swotOpportunities || '—'}</p>}
                    />
                    <InfoItem
                        label="Threats"
                        value={<p className="whitespace-pre-wrap">{data.swotThreats || '—'}</p>}
                    />
                </div>
            </DetailSection>

            <DetailSection
                title="Billing (Page 4)"
                icon={<Package className="h-4 w-4 text-muted-foreground" />}
                status={<PageStatusBadge data={data} history={history} pageNum={4} />}
            >
                <div className="space-y-2">
                    <p className="text-sm font-medium">Billing BOQ</p>
                    <BoqTable items={billingBoq} emptyLabel="No billing items" />
                </div>

                {buybackBoq.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Buyback BOQ</p>
                        <BoqTable items={buybackBoq} emptyLabel="No buyback items" />
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    <AddressList
                        title="Billing Addresses"
                        addresses={billingAddresses}
                        emptyLabel="No billing addresses"
                    />
                    <AddressList
                        title="Shipping Addresses"
                        addresses={shippingAddresses}
                        emptyLabel="No shipping addresses"
                    />
                </div>
            </DetailSection>

            <DetailSection
                title="Project Execution & Site Visit (Page 5)"
                icon={<Truck className="h-4 w-4 text-muted-foreground" />}
                status={<PageStatusBadge data={data} history={history} pageNum={5} />}
            >
                <InfoGrid>
                    <InfoItem
                        label="Site Visit Required"
                        value={<BoolBadge value={data.siteVisitNeeded} />}
                    />
                    {data.siteVisitNeeded && data.siteVisitPerson && (
                        <InfoItem
                            label="Site Contact"
                            value={
                                <div className="space-y-0.5">
                                    <p className="font-medium">{data.siteVisitPerson.name}</p>
                                    <p className="text-muted-foreground">
                                        {data.siteVisitPerson.phone}
                                        {data.siteVisitPerson.phone && data.siteVisitPerson.email
                                            ? ' | '
                                            : ''}
                                        {data.siteVisitPerson.email}
                                    </p>
                                </div>
                            }
                        />
                    )}
                    <InfoItem
                        label="Documents Needed from Client"
                        value={<DocumentList documents={data.documentsNeeded} />}
                        className="sm:col-span-2"
                    />
                    <InfoItem
                        label="Documents Available In-House"
                        value={<DocumentList documents={data.documentsInHouse} />}
                        className="sm:col-span-2"
                    />
                </InfoGrid>
            </DetailSection>

            <DetailSection
                title="Tendering Costing (Page 6)"
                icon={<Link2 className="h-4 w-4 text-muted-foreground" />}
                status={<PageStatusBadge data={data} history={history} pageNum={6} />}
            >
                <InfoGrid>
                    <InfoItem
                        label="Costing Sheet Link"
                        value={
                            data.costingSheetLink ? (
                                <a
                                    href={data.costingSheetLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="break-all text-primary hover:underline"
                                >
                                    {data.costingSheetLink}
                                </a>
                            ) : (
                                <span className="italic text-muted-foreground">No link provided</span>
                            )
                        }
                        className="sm:col-span-2"
                    />
                    <InfoItem
                        label="PO / WO Discrepancies"
                        value={
                            <BoolBadge
                                value={data.hasDiscrepancies}
                                trueLabel="Identified"
                                falseLabel="None"
                            />
                        }
                    />
                    {data.hasDiscrepancies && data.discrepancyComments && (
                        <InfoItem
                            label="Discrepancy Comments"
                            value={
                                <p className="rounded-md border bg-muted/40 p-3 italic">
                                    {data.discrepancyComments}
                                </p>
                            }
                            className="sm:col-span-2"
                        />
                    )}
                </InfoGrid>
            </DetailSection>

            <DetailSection
                title="OE Submission Info (Page 7)"
                icon={<FileEdit className="h-4 w-4 text-muted-foreground" />}
                status={<PageStatusBadge data={data} history={history} pageNum={7} />}
            >
                <InfoGrid>
                    <InfoItem
                        label="Amendment Needed"
                        value={<BoolBadge value={Boolean(data.oeWoAmendmentNeeded)} />}
                    />
                    <InfoItem
                        label="Signature Ready"
                        value={<BoolBadge value={data.oeSignaturePrepared} />}
                    />
                    <InfoItem
                        label="Courier Notified"
                        value={<BoolBadge value={data.courierRequestPrepared} />}
                    />
                    <InfoItem
                        label="OE Submission Time"
                        value={
                            data.oeAmendmentSubmittedAt
                                ? formatDateTime(data.oeAmendmentSubmittedAt)
                                : '—'
                        }
                    />
                </InfoGrid>

                {amendments.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Proposed Amendments</p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead className="w-28">Page / Clause</TableHead>
                                    <TableHead>Current Statement</TableHead>
                                    <TableHead>Corrected Statement</TableHead>
                                    <TableHead className="w-24">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {amendments.map((amd, index) => (
                                    <TableRow key={amd.id ?? index}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            <div>Page: {amd.pageNo || '—'}</div>
                                            <div>Clause: {amd.clauseNo || '—'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm text-muted-foreground line-through">
                                                {amd.currentStatement}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm font-medium">
                                                {amd.correctedStatement}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{amd.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </DetailSection>

            {acceptance && (
                <DetailSection
                    title="TL Acceptance & Review"
                    icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
                >
                    <InfoGrid>
                        <InfoItem
                            label="Final Decision"
                            value={
                                <Badge
                                    variant={acceptance.decision === 'accepted' ? 'success' : 'secondary'}
                                >
                                    {acceptance.decision?.toUpperCase() || 'PENDING'}
                                </Badge>
                            }
                        />
                        <InfoItem
                            label="Decided On"
                            value={
                                acceptance.finalDecisionAt
                                    ? formatDateTime(acceptance.finalDecisionAt)
                                    : '—'
                            }
                        />
                        {acceptance.decisionRemarks && (
                            <InfoItem
                                label="Decision Remarks"
                                value={
                                    <p className="rounded-md border-l-2 border-primary bg-muted/40 p-3 italic">
                                        {acceptance.decisionRemarks}
                                    </p>
                                }
                                className="sm:col-span-2"
                            />
                        )}
                        <InfoItem
                            label="OE Signature"
                            value={
                                acceptance.oeSignedAt ? (
                                    <Badge variant="default" className="gap-1">
                                        <Pen className="h-3 w-3" />
                                        Signed {formatDateTime(acceptance.oeSignedAt)}
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary">Pending</Badge>
                                )
                            }
                        />
                        <InfoItem
                            label="TL Signature"
                            value={
                                acceptance.tlSignedAt ? (
                                    <Badge variant="default" className="gap-1">
                                        <Pen className="h-3 w-3" />
                                        Signed {formatDateTime(acceptance.tlSignedAt)}
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary">Pending</Badge>
                                )
                            }
                        />
                        <InfoItem
                            label="Authority Letter"
                            value={
                                <BoolBadge
                                    value={Boolean(acceptance.authorityLetterGenerated)}
                                    trueLabel="Generated"
                                    falseLabel="Not yet"
                                />
                            }
                        />
                        <InfoItem
                            label="Signed WO Upload"
                            value={
                                <BoolBadge
                                    value={Boolean(acceptance.isCompleted)}
                                    trueLabel="Completed"
                                    falseLabel="Pending"
                                />
                            }
                        />
                        <InfoItem
                            label="Courier Request"
                            value={
                                acceptance.courierId ? (
                                    <Badge variant="default">ID: {acceptance.courierId}</Badge>
                                ) : (
                                    <span className="italic text-muted-foreground">
                                        Awaiting completion
                                    </span>
                                )
                            }
                        />
                    </InfoGrid>
                </DetailSection>
            )}
        </div>
    );
}
