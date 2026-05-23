import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWoDetailWithRelations } from "@/hooks/api/useWoDetails";
import { AlertCircle, ArrowLeft, Calculator, FileCheck, FileEdit, Loader2, MapPinned, Package, Send, ShieldCheck, SkipForward, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import type { WoBillingAddress, WoBillingBoq, WoContact, WoShippingAddress } from "../../../types/wo.types";

interface Page8ReviewProps {
    woDetailId: number | null;
    onSubmit: () => Promise<void>;
    onBack: () => void;
}

const PAGE_ICONS: Record<number, React.ReactNode> = {
    1: <Users className="h-5 w-5" />,
    2: <ShieldCheck className="h-5 w-5" />,
    3: <TrendingUp className="h-5 w-5" />,
    4: <Package className="h-5 w-5" />,
    5: <MapPinned className="h-5 w-5" />,
    6: <Calculator className="h-5 w-5" />,
    7: <FileEdit className="h-5 w-5" />,
};

const PAGE_TITLES: Record<number, string> = {
    1: "Project Handover",
    2: "Compliance Obligations",
    3: "SWOT Analysis",
    4: "Billing",
    5: "Project Execution",
    6: "Profitability",
    7: "WO Acceptance",
};

type DetailShape = Record<string, unknown>;

function countFilled(detail: DetailShape, fields: string[]): number {
    return fields.filter((f) => {
        const val = detail[f];
        if (val === null || val === undefined || val === "") return false;
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === "object") return Object.keys(val as object).length > 0;
        return true;
    }).length;
}

const PAGE_FIELDS: Record<number, { total: number; check: (d: DetailShape) => number }> = {
    1: {
        total: 2,
        check: (d) => ((d.contacts as any[])?.length ? 1 : 0) + (d.tenderDocumentsChecklist ? 1 : 0),
    },
    2: {
        total: 4,
        check: (d) =>
            countFilled(d, ["ldApplicable", "isPbgApplicable", "isContractAgreement", "detailedPoApplicable"]),
    },
    3: {
        total: 4,
        check: (d) =>
            countFilled(d, ["swotStrengths", "swotWeaknesses", "swotOpportunities", "swotThreats"]),
    },
    4: {
        total: 3,
        check: (d) =>
            ((d.billingBoq as any[])?.length ? 1 : 0) +
            ((d.billingAddresses as any[])?.length ? 1 : 0) +
            ((d.shippingAddresses as any[])?.length ? 1 : 0),
    },
    5: {
        total: 4,
        check: (d) =>
            countFilled(d, ["siteVisitNeeded"]) +
            ((d.documentsFromTendering as any[])?.length ? 1 : 0) +
            ((d.documentsNeeded as any[])?.length ? 1 : 0) +
            ((d.documentsInHouse as any[])?.length ? 1 : 0),
    },
    6: {
        total: 2,
        check: (d) =>
            (d.costingSheetLink ? 1 : 0) +
            (d.hasDiscrepancies !== undefined && d.hasDiscrepancies !== null ? 1 : 0),
    },
    7: {
        total: 3,
        check: (d) =>
            countFilled(d, ["oeWoAmendmentNeeded", "oeSignaturePrepared", "courierRequestPrepared"]),
    },
};

function SummaryRow({ label, value }: { label: string; value: string | undefined | null }) {
    return (
        <div className="flex justify-between py-1.5 border-b border-dashed last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium">{value || "—"}</span>
        </div>
    );
}

function SectionCard({
    pageNum,
    isSkipped,
    filled,
    total,
    children,
}: {
    pageNum: number;
    isSkipped: boolean;
    filled: number;
    total: number;
    children: React.ReactNode;
}) {
    const allFilled = filled >= total;
    return (
        <Card className={isSkipped ? "opacity-60" : ""}>
            <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <span className="text-muted-foreground">{PAGE_ICONS[pageNum]}</span>
                        {PAGE_TITLES[pageNum]}
                    </CardTitle>
                    {isSkipped ? (
                        <Badge variant="outline" className="gap-1 text-yellow-700 border-yellow-300 bg-yellow-50">
                            <SkipForward className="h-3 w-3" />
                            Skipped
                        </Badge>
                    ) : (
                        <Badge
                            variant="outline"
                            className={
                                allFilled
                                    ? "gap-1 text-green-700 border-green-300 bg-green-50"
                                    : "gap-1 text-muted-foreground"
                            }
                        >
                            {filled}/{total} fields
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                {isSkipped ? (
                    <p className="text-sm text-muted-foreground italic">This page was skipped.</p>
                ) : (
                    children
                )}
            </CardContent>
        </Card>
    );
}

export function Page8Review({ woDetailId, onSubmit, onBack }: Page8ReviewProps) {
    const { data: detail, isLoading } = useWoDetailWithRelations(woDetailId || 0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!woDetailId) return;
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            await onSubmit();
        } catch {
            setSubmitError("Failed to submit for review. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading || !detail) {
        return (
            <Card>
                <CardContent className="p-12 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    const skipped = detail.skippedPages || [];
    const d = detail as unknown as Record<string, unknown>;
    const pageStatus = (n: number) => ({
        isSkipped: skipped.includes(n),
        filled: PAGE_FIELDS[n].check(d),
        total: PAGE_FIELDS[n].total,
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">Review & Submit</h2>
                    <p className="text-sm text-muted-foreground">
                        Review all data before submitting for TL review
                    </p>
                </div>
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Edit
                </Button>
            </div>

            {submitError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{submitError}</AlertDescription>
                </Alert>
            )}

            {/* Page 1: Contacts & Checklist */}
            <SectionCard pageNum={1} {...pageStatus(1)}>
                {detail.contacts && detail.contacts.length > 0 ? (
                    <div className="space-y-2">
                        {detail.contacts.map((c: WoContact, i: number) => (
                            <div key={c.id || i} className="text-sm p-2 bg-muted/30 rounded">
                                <span className="font-medium">{c.name || "—"}</span>
                                {c.organization && <span className="text-muted-foreground ml-2">({c.organization})</span>}
                                <div className="text-xs text-muted-foreground mt-0.5">
                                    {[c.departments, c.designation, c.phone, c.email].filter(Boolean).join(" · ") || "No details"}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No contacts added</p>
                )}
                <div className="mt-3 pt-3 border-t">
                    <p className="text-sm">
                        <FileCheck className="h-4 w-4 inline mr-1 text-muted-foreground" />
                        Tender Checklist: {detail.tenderDocumentsChecklist ? "Submitted" : "Not filled"}
                    </p>
                </div>
            </SectionCard>

            {/* Page 2: Compliance */}
            <SectionCard pageNum={2} {...pageStatus(2)}>
                <SummaryRow label="LD Applicable" value={detail.ldApplicable ? "Yes" : "No"} />
                {detail.ldApplicable && (
                    <>
                        <SummaryRow label="Max LD %" value={detail.maxLd} />
                        <SummaryRow label="LD Start Date" value={detail.ldStartDate} />
                        <SummaryRow label="Max LD Date" value={detail.maxLdDate} />
                    </>
                )}
                <SummaryRow label="PBG Applicable" value={detail.isPbgApplicable ? "Yes" : "No"} />
                {detail.isPbgApplicable && <SummaryRow label="BG Format" value={detail.filledBgFormat} />}
                <SummaryRow label="Contract Agreement" value={detail.isContractAgreement ? "Yes" : "No"} />
                {detail.isContractAgreement && <SummaryRow label="Agreement Format" value={detail.contractAgreementFormat} />}
                <SummaryRow label="Detailed PO" value={detail.detailedPoApplicable ? "Yes" : "No"} />
            </SectionCard>

            {/* Page 3: SWOT */}
            <SectionCard pageNum={3} {...pageStatus(3)}>
                {detail.swotStrengths || detail.swotWeaknesses || detail.swotOpportunities || detail.swotThreats ? (
                    <div className="grid grid-cols-2 gap-4">
                        {detail.swotStrengths && (
                            <div>
                                <p className="text-xs font-semibold text-green-600 mb-1">Strengths</p>
                                <p className="text-sm">{detail.swotStrengths}</p>
                            </div>
                        )}
                        {detail.swotWeaknesses && (
                            <div>
                                <p className="text-xs font-semibold text-red-600 mb-1">Weaknesses</p>
                                <p className="text-sm">{detail.swotWeaknesses}</p>
                            </div>
                        )}
                        {detail.swotOpportunities && (
                            <div>
                                <p className="text-xs font-semibold text-blue-600 mb-1">Opportunities</p>
                                <p className="text-sm">{detail.swotOpportunities}</p>
                            </div>
                        )}
                        {detail.swotThreats && (
                            <div>
                                <p className="text-xs font-semibold text-yellow-600 mb-1">Threats</p>
                                <p className="text-sm">{detail.swotThreats}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No SWOT analysis provided</p>
                )}
            </SectionCard>

            {/* Page 4: Billing */}
            <SectionCard pageNum={4} {...pageStatus(4)}>
                <p className="text-sm font-medium mb-2">Billing BOQ ({detail.billingBoq?.length || 0} items)</p>
                {detail.billingBoq && detail.billingBoq.length > 0 ? (
                    <div className="border rounded text-sm mb-3">
                        {detail.billingBoq.map((item: WoBillingBoq, i: number) => (
                            <div key={item.id || i} className="flex justify-between px-3 py-1.5 border-b last:border-0">
                                <span>{item.itemDescription || "—"}</span>
                                <span className="text-muted-foreground">
                                    {item.quantity || "0"} × ₹{item.rate || "0"}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground mb-3">No billing BOQ items</p>
                )}

                <p className="text-sm font-medium mb-2">Addresses</p>
                <div className="space-y-2">
                    <div>
                        <p className="text-xs text-muted-foreground">Billing:</p>
                        {detail.billingAddresses?.length ? detail.billingAddresses.map((a: WoBillingAddress, i: number) => (
                            <p key={i} className="text-sm">{a.customerName} — {a.address}</p>
                        )) : <p className="text-sm text-muted-foreground">None</p>}
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Shipping:</p>
                        {detail.shippingAddresses?.length ? detail.shippingAddresses.map((a: WoShippingAddress, i: number) => (
                            <p key={i} className="text-sm">{a.customerName} — {a.address}</p>
                        )) : <p className="text-sm text-muted-foreground">None</p>}
                    </div>
                </div>
            </SectionCard>

            {/* Page 5: Execution */}
            <SectionCard pageNum={5} {...pageStatus(5)}>
                <SummaryRow label="Site Visit Required" value={detail.siteVisitNeeded ? "Yes" : "No"} />
                {detail.siteVisitPerson?.name && (
                    <>
                        <SummaryRow label="Contact Person" value={detail.siteVisitPerson.name} />
                        <SummaryRow label="Phone" value={detail.siteVisitPerson.phone} />
                        <SummaryRow label="Email" value={detail.siteVisitPerson.email} />
                    </>
                )}
                <SummaryRow label="Documents from Tendering" value={`${detail.documentsFromTendering?.length || 0} docs`} />
                <SummaryRow label="Additional Documents" value={`${detail.documentsNeeded?.length || 0} docs`} />
                <SummaryRow label="In-House Documents" value={`${detail.documentsInHouse?.length || 0} docs`} />
            </SectionCard>

            {/* Page 6: Profitability */}
            <SectionCard pageNum={6} {...pageStatus(6)}>
                {detail.costingSheetLink && (
                    <SummaryRow label="Costing Sheet" value={detail.costingSheetLink} />
                )}
                <SummaryRow label="Discrepancies Found" value={detail.hasDiscrepancies ? "Yes" : "No"} />
                {detail.hasDiscrepancies && <SummaryRow label="Comments" value={detail.discrepancyComments} />}
            </SectionCard>

            {/* Page 7: Acceptance */}
            <SectionCard pageNum={7} {...pageStatus(7)}>
                <SummaryRow label="Amendment Needed" value={detail.oeWoAmendmentNeeded === true ? "Yes" : detail.oeWoAmendmentNeeded === false ? "No" : "Not set"} />
                {detail.oeWoAmendmentNeeded === false && (
                    <>
                        <SummaryRow label="Signature Prepared" value={detail.oeSignaturePrepared ? "Yes" : "No"} />
                        <SummaryRow label="Courier Prepared" value={detail.courierRequestPrepared ? "Yes" : "No"} />
                    </>
                )}
            </SectionCard>

            <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Edit
                </Button>

                <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
                    {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="mr-2 h-4 w-4" />
                    )}
                    {isSubmitting ? "Submitting..." : "Submit for TL Review"}
                </Button>
            </div>
        </div>
    );
}
