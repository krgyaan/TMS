import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    Download,
    Edit3,
    ExternalLink,
    Eye,
    FileText,
    Loader2,
    ShieldCheck,
    XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchaseOrderDetails, useSubmitPoTlApproval } from "@/hooks/api/usePurchaseOrders";
import { useVendorWorkOrderDetails, useSubmitVwoTlApproval } from "@/hooks/api/useVendorWorkOrders";
import { formatDate } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { purchaseOrderApi } from "@/services/api/purchase-order.api";
import { vendorWorkOrderApi } from "@/services/api/vendor-work-order.api";
import type { PurchaseOrderView } from "@/modules/operations/purchase-orders/helpers/purchaseOrderView.types";
import type { VendorWorkOrderView } from "@/modules/operations/vendor-work-orders/helpers/vwoView.types";
import type {
    SubmitTlApprovalPayload,
    TlEditFieldFeedback,
    TlFeedbackPayload,
    TlRejectFieldFeedback,
} from "./orderView.types";

type ApprovalActionMode = "approve" | "reject" | "edit";

interface FieldOption {
    key: string;
    label: string;
}

const REJECT_FIELD_OPTIONS: FieldOption[] = [
    { key: "vendor", label: "Vendor / Seller Details" },
    { key: "line_items", label: "Line Items / Quantities" },
    { key: "pricing", label: "Unit Rates / Pricing" },
    { key: "gst_taxes", label: "GST / Taxes" },
    { key: "shipping", label: "Delivery Terms / Address" },
    { key: "payment_terms", label: "Payment Terms / T&C" },
    { key: "extra_charges", label: "Extra Charges" },
    { key: "attachments", label: "Attachments / Technical Specs" },
    { key: "general", label: "General / Other" },
];

const EDIT_FIELD_OPTIONS: FieldOption[] = [
    { key: "sellerName", label: "Vendor / Seller Name" },
    { key: "sellerGstNo", label: "Vendor GST / Address" },
    { key: "line_items", label: "Line Items & Quantities" },
    { key: "pricing", label: "Unit Rates / Pricing" },
    { key: "gst_taxes", label: "GST / Tax Rates" },
    { key: "shippingAddress", label: "Delivery / Ship-To Address" },
    { key: "termsAndConditions", label: "Payment & Delivery Terms" },
    { key: "extraCharges", label: "Extra Charges" },
    { key: "remarks", label: "Remarks / Scope Notes" },
];

function renderTlStatusBadge(tlStatus?: number | null) {
    if (tlStatus === 1) return <Badge variant="default">Approved by TL</Badge>;
    if (tlStatus === 2) return <Badge variant="destructive">Rejected by TL</Badge>;
    if (tlStatus === 3) return <Badge variant="secondary" className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">Edit Requested by TL</Badge>;
    return <Badge variant="outline">Pending TL Approval</Badge>;
}

const OrderTlApprovalPage: React.FC = () => {
    const { type: rawType, id: idParam } = useParams<{ type: string; id: string }>();
    const navigate = useNavigate();
    const { roleId, teamId, isSuperUser, isAdmin, isTeamLeader } = useAuth();

    const normalizedType = rawType?.toLowerCase() === "po" ? "po" : "vwo";
    const orderLabel = normalizedType === "po" ? "Purchase Order" : "Work Order";
    const shortLabel = normalizedType === "po" ? "PO" : "WO";
    const orderId = Number(idParam);

    const poQuery = usePurchaseOrderDetails(normalizedType === "po" ? orderId : 0);
    const vwoQuery = useVendorWorkOrderDetails(normalizedType === "vwo" ? orderId : 0);

    const { mutateAsync: submitPoTl, isPending: isSubmittingPo } = useSubmitPoTlApproval();
    const { mutateAsync: submitVwoTl, isPending: isSubmittingVwo } = useSubmitVwoTlApproval();

    const isLoading = normalizedType === "po" ? poQuery.isLoading : vwoQuery.isLoading;
    const isError = normalizedType === "po" ? poQuery.isError : vwoQuery.isError;
    const error = normalizedType === "po" ? poQuery.error : vwoQuery.error;
    const isSubmitting = normalizedType === "po" ? isSubmittingPo : isSubmittingVwo;

    const orderSummary = useMemo(() => {
        if (normalizedType === "po") {
            const po = poQuery.data as PurchaseOrderView | undefined;
            if (!po) return null;
            return {
                id: po.id,
                projectId: po.projectId,
                number: po.poNumber || `PO #${po.id}`,
                category: po.category,
                date: po.poDate,
                raisedByName: po.raisedByName,
                sellerName: po.sellerName,
                sellerAddress: po.sellerAddress,
                sellerGstNo: po.sellerGstNo,
                shipToName: po.shipToName,
                shippingAddress: po.shippingAddress,
                products: po.products ?? [],
                extraCharges: po.extraCharges ?? [],
                termsAndConditions: po.termsAndConditions ?? [],
                remarks: po.remarks,
                total: po.total,
                approved: po.poApproved,
                approvalRemark: po.poApprovalRemark,
                tlStatus: po.tlStatus ?? 0,
                tlComment: po.tlComment ?? null,
                tlFeedback: (po.tlFeedback ?? null) as TlFeedbackPayload | null,
                creatorTeamId: po.creatorTeamId ?? null,
                generatedPdfVersions: po.generatedPdfVersions ?? null,
            };
        } else {
            const vwo = vwoQuery.data as VendorWorkOrderView | undefined;
            if (!vwo) return null;
            return {
                id: vwo.id,
                projectId: vwo.projectId,
                number: vwo.woNumber || `WO #${vwo.id}`,
                category: vwo.category,
                date: vwo.woDate,
                raisedByName: vwo.raisedByName,
                sellerName: vwo.sellerName,
                sellerAddress: vwo.sellerAddress,
                sellerGstNo: vwo.sellerGstNo,
                shipToName: vwo.shipToName,
                shippingAddress: vwo.shippingAddress,
                products: vwo.products ?? [],
                extraCharges: vwo.extraCharges ?? [],
                termsAndConditions: vwo.termsAndConditions ?? [],
                remarks: vwo.remarks,
                total: vwo.total,
                approved: vwo.woApproved,
                approvalRemark: vwo.woApprovalRemark,
                tlStatus: vwo.tlStatus ?? 0,
                tlComment: vwo.tlComment ?? null,
                tlFeedback: (vwo.tlFeedback ?? null) as TlFeedbackPayload | null,
                creatorTeamId: vwo.creatorTeamId ?? null,
                generatedPdfVersions: vwo.generatedPdfVersions ?? null,
            };
        }
    }, [normalizedType, poQuery.data, vwoQuery.data]);

    // Extract current field values from the loaded PO/WO for the "Edit" (Old vs New) form
    const currentFieldValues = useMemo<Record<string, string>>(() => {
        if (!orderSummary) return {};
        const itemsSummary =
            orderSummary.products
                .map((p: any, idx: number) => `${idx + 1}. ${p.description} (Qty: ${p.qty} @ ₹${p.rate}, GST: ${p.gstRate}%)`)
                .join("; ") || "No line items";
        const pricingSummary = `Taxable: ${formatINR(orderSummary.total?.total ?? 0)} | Grand Total: ${formatINR(orderSummary.total?.totalWithGst ?? 0)}`;
        const gstSummary = `Total GST: ${formatINR(orderSummary.total?.totalGst ?? 0)}`;
        const termsSummary =
            (orderSummary.termsAndConditions ?? [])
                .map((t: any) => `${t.field || "Term"}: ${t.value || ""}`)
                .filter(Boolean)
                .join("; ") || "Standard terms";
        const chargesSummary =
            (orderSummary.extraCharges ?? [])
                .map((c: any) => `${c.label}: ₹${c.totalAmount}`)
                .join("; ") || "None";

        return {
            sellerName: orderSummary.sellerName || "—",
            sellerGstNo: [orderSummary.sellerGstNo, orderSummary.sellerAddress].filter(Boolean).join(" — ") || "—",
            line_items: itemsSummary,
            pricing: pricingSummary,
            gst_taxes: gstSummary,
            shippingAddress: [orderSummary.shipToName, orderSummary.shippingAddress].filter(Boolean).join(" — ") || "—",
            termsAndConditions: termsSummary,
            extraCharges: chargesSummary,
            remarks: orderSummary.remarks || "—",
        };
    }, [orderSummary]);

    const pdfVersions = useMemo(() => {
        const map = orderSummary?.generatedPdfVersions;
        if (!map) return [];
        return Object.keys(map).sort((a, b) => b.localeCompare(a));
    }, [orderSummary?.generatedPdfVersions]);

    const [selectedPdfVersion, setSelectedPdfVersion] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (pdfVersions.length > 0) {
            setSelectedPdfVersion(pdfVersions[0]);
        } else {
            setSelectedPdfVersion(undefined);
        }
    }, [pdfVersions]);

    const activePdfUrl = useMemo(() => {
        if (!orderSummary) return "";
        if (normalizedType === "po") {
            return purchaseOrderApi.getPurchaseOrderPdfUrl(orderSummary.id, selectedPdfVersion);
        }
        return vendorWorkOrderApi.getPdfDownloadUrl(orderSummary.id, selectedPdfVersion);
    }, [normalizedType, orderSummary, selectedPdfVersion]);

    const canTlApprove = useMemo(() => {
        if (!orderSummary) return false;
        const isSuperOrAdmin = isSuperUser || isAdmin || roleId === 1 || roleId === 2;
        if (isSuperOrAdmin) return true;
        const isSameTeamTl =
            (isTeamLeader || roleId === 3) &&
            teamId != null &&
            orderSummary.creatorTeamId != null &&
            Number(teamId) === Number(orderSummary.creatorTeamId);
        return isSameTeamTl;
    }, [orderSummary, isSuperUser, isAdmin, isTeamLeader, roleId, teamId]);

    // Form state for the 3-button decision UI
    const [activeMode, setActiveMode] = useState<ApprovalActionMode>("approve");
    const [generalComment, setGeneralComment] = useState<string>("");
    const [selectedRejectKeys, setSelectedRejectKeys] = useState<string[]>([]);
    const [rejectRemarksByKey, setRejectRemarksByKey] = useState<Record<string, string>>({});
    const [selectedEditKeys, setSelectedEditKeys] = useState<string[]>([]);
    const [editNewValueByKey, setEditNewValueByKey] = useState<Record<string, string>>({});
    const [editRemarkByKey, setEditRemarkByKey] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (!orderSummary) return;
        setFormError(null);
        const fb = orderSummary.tlFeedback;
        if (fb?.action === "reject") {
            setActiveMode("reject");
            setGeneralComment(fb.generalRemark ?? "");
            const keys = (fb.rejectionFields ?? []).map(f => f.field);
            setSelectedRejectKeys(keys);
            const map: Record<string, string> = {};
            (fb.rejectionFields ?? []).forEach(f => {
                map[f.field] = f.remark;
            });
            setRejectRemarksByKey(map);
        } else if (fb?.action === "edit") {
            setActiveMode("edit");
            setGeneralComment(fb.generalRemark ?? "");
            const keys = (fb.editFields ?? []).map(f => f.field);
            setSelectedEditKeys(keys);
            const newVals: Record<string, string> = {};
            const notes: Record<string, string> = {};
            (fb.editFields ?? []).forEach(f => {
                newVals[f.field] = f.newValue;
                if (f.remark) notes[f.field] = f.remark;
            });
            setEditNewValueByKey(newVals);
            setEditRemarkByKey(notes);
        } else {
            setActiveMode("approve");
            setGeneralComment(orderSummary.tlComment ?? "");
        }
    }, [orderSummary?.id, orderSummary?.tlStatus]);

    const toggleRejectField = (key: string) => {
        setFormError(null);
        setSelectedRejectKeys(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
    };

    const toggleEditField = (key: string) => {
        setFormError(null);
        setSelectedEditKeys(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
    };

    const handleSubmitDecision = async () => {
        if (!orderSummary) return;
        setFormError(null);

        let payload: SubmitTlApprovalPayload;

        if (activeMode === "approve") {
            payload = {
                tlStatus: 1,
                tlComment: generalComment.trim() || undefined,
            };
        } else if (activeMode === "reject") {
            if (selectedRejectKeys.length === 0) {
                setFormError("Please select at least one field with an issue to reject.");
                return;
            }
            const rejectionFields: TlRejectFieldFeedback[] = [];
            for (const key of selectedRejectKeys) {
                const opt = REJECT_FIELD_OPTIONS.find(o => o.key === key);
                const remark = (rejectRemarksByKey[key] ?? "").trim();
                if (!remark) {
                    setFormError(`Please enter a rejection remark for "${opt?.label || key}".`);
                    return;
                }
                rejectionFields.push({
                    field: key,
                    label: opt?.label || key,
                    remark,
                });
            }
            payload = {
                tlStatus: 2,
                tlComment: generalComment.trim() || undefined,
                rejectionFields,
            };
        } else {
            if (selectedEditKeys.length === 0) {
                setFormError("Please select at least one field to request an edit.");
                return;
            }
            const editFields: TlEditFieldFeedback[] = [];
            for (const key of selectedEditKeys) {
                const opt = EDIT_FIELD_OPTIONS.find(o => o.key === key);
                const newValue = (editNewValueByKey[key] ?? "").trim();
                if (!newValue) {
                    setFormError(`Please enter the requested new value for "${opt?.label || key}".`);
                    return;
                }
                editFields.push({
                    field: key,
                    label: opt?.label || key,
                    oldValue: currentFieldValues[key] ?? "—",
                    newValue,
                    remark: (editRemarkByKey[key] ?? "").trim() || undefined,
                });
            }
            payload = {
                tlStatus: 3,
                tlComment: generalComment.trim() || undefined,
                editFields,
            };
        }

        try {
            if (normalizedType === "po") {
                await submitPoTl({ id: orderSummary.id, data: payload });
            } else {
                await submitVwoTl({ id: orderSummary.id, data: payload });
            }
            const actionLabel =
                payload.tlStatus === 1
                    ? "approved and forwarded to Accounts"
                    : payload.tlStatus === 3
                      ? "marked as Edit Requested"
                      : "rejected";
            toast.success(`${orderLabel} ${orderSummary.number} ${actionLabel}.`);
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || `Failed to submit ${shortLabel} TL decision.`;
            setFormError(Array.isArray(msg) ? msg.join(", ") : String(msg));
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4 p-4 sm:p-6">
                <Skeleton className="h-12 w-80" />
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
                    <Skeleton className="h-[72vh] w-full rounded-xl" />
                    <Skeleton className="h-[72vh] w-full rounded-xl" />
                </div>
            </div>
        );
    }

    if (isError || !orderSummary) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {(error as Error | undefined)?.message || `${orderLabel} not found.`}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const detailUrl =
        normalizedType === "po"
            ? `/operations/purchase-orders/${orderSummary.id}`
            : `/operations/vendor-work-orders/${orderSummary.id}`;

    return (
        <div className="space-y-4 p-3 sm:p-6">
            {/* Top Summary Header */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold sm:text-xl">
                                        {orderSummary.number}
                                    </h1>
                                    {renderTlStatusBadge(orderSummary.tlStatus)}
                                    {orderSummary.approved === true && (
                                        <Badge variant="default">Accounts Approved</Badge>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                                    Vendor: <strong className="text-foreground">{orderSummary.sellerName || "—"}</strong>
                                    {" · "}
                                    Grand Total: <strong className="text-foreground">{formatINR(orderSummary.total?.totalWithGst ?? 0)}</strong>
                                    {" · "}
                                    Raised By: <strong className="text-foreground">{orderSummary.raisedByName || "—"}</strong>
                                    {orderSummary.date ? ` on ${formatDate(orderSummary.date)}` : ""}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(detailUrl)}
                                className="gap-1.5"
                            >
                                <Eye className="h-4 w-4" />
                                Full {shortLabel} Details
                            </Button>
                            {activePdfUrl && (
                                <>
                                    <Button asChild variant="outline" size="sm" className="gap-1.5">
                                        <a href={activePdfUrl} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4" />
                                            Open PDF
                                        </a>
                                    </Button>
                                    <Button asChild variant="secondary" size="sm" className="gap-1.5">
                                        <a href={activePdfUrl} download>
                                            <Download className="h-4 w-4" />
                                            Download
                                        </a>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Split View: PDF Viewer + Stage 1 Approval Panel */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
                {/* Left / Top: In-Browser PDF Viewer */}
                <Card className="flex min-h-[68vh] flex-col overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between border-b py-3">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <CardTitle className="text-sm font-semibold">
                                {shortLabel} Document Preview
                            </CardTitle>
                        </div>
                        {pdfVersions.length > 1 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                {pdfVersions.map((ver, idx) => (
                                    <Button
                                        key={ver}
                                        type="button"
                                        size="sm"
                                        variant={selectedPdfVersion === ver ? "default" : "outline"}
                                        className="h-7 px-2.5 text-xs"
                                        onClick={() => setSelectedPdfVersion(ver)}
                                    >
                                        {ver} {idx === 0 ? "(Latest)" : ""}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col p-2 sm:p-3">
                        {activePdfUrl ? (
                            <iframe
                                key={activePdfUrl}
                                src={`${activePdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                                title={`${orderSummary.number} PDF Preview`}
                                className="min-h-[64vh] w-full flex-1 rounded-lg border border-border bg-white"
                            />
                        ) : (
                            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                                <FileText className="mb-2 h-10 w-10 text-muted-foreground/40" />
                                <p className="text-sm font-medium">PDF preview unavailable</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Use the Full {shortLabel} Details button above to inspect all items and charges.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right / Bottom: Stage 1 TL Approval Panel */}
                <div className="space-y-4">
                    {/* Existing Structured Feedback Display (visible to everyone when tlStatus !== 0) */}
                    {orderSummary.tlStatus !== 0 && (
                        <Card className="border-border">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center justify-between text-sm">
                                    <span>Current TL Decision</span>
                                    {renderTlStatusBadge(orderSummary.tlStatus)}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2.5 text-xs">
                                {orderSummary.tlFeedback?.rejectionFields &&
                                    orderSummary.tlFeedback.rejectionFields.length > 0 && (
                                        <div className="space-y-1.5">
                                            <p className="font-semibold text-destructive">Rejected Fields:</p>
                                            {orderSummary.tlFeedback.rejectionFields.map((rf, i) => (
                                                <div
                                                    key={`${rf.field}-${i}`}
                                                    className="rounded-md border border-destructive/30 bg-destructive/5 p-2"
                                                >
                                                    <p className="font-medium text-foreground">
                                                        {rf.label || rf.field}
                                                    </p>
                                                    <p className="mt-0.5 text-muted-foreground">{rf.remark}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                {orderSummary.tlFeedback?.editFields &&
                                    orderSummary.tlFeedback.editFields.length > 0 && (
                                        <div className="space-y-1.5">
                                            <p className="font-semibold text-amber-700 dark:text-amber-300">
                                                Requested Field Edits:
                                            </p>
                                            {orderSummary.tlFeedback.editFields.map((ef, i) => (
                                                <div
                                                    key={`${ef.field}-${i}`}
                                                    className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 space-y-1"
                                                >
                                                    <p className="font-medium text-foreground">
                                                        {ef.label || ef.field}
                                                    </p>
                                                    <div className="grid grid-cols-1 gap-1 text-[11px]">
                                                        <div className="rounded bg-muted/60 px-2 py-1">
                                                            <span className="font-medium text-muted-foreground">Old: </span>
                                                            <span className="line-through">{ef.oldValue || "—"}</span>
                                                        </div>
                                                        <div className="rounded bg-emerald-500/10 px-2 py-1 text-emerald-800 dark:text-emerald-200">
                                                            <span className="font-medium">New: </span>
                                                            <span>{ef.newValue}</span>
                                                        </div>
                                                    </div>
                                                    {ef.remark && (
                                                        <p className="text-muted-foreground">Note: {ef.remark}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                {orderSummary.tlComment && (
                                    <div className="rounded-md bg-muted/50 p-2">
                                        <span className="font-medium">Summary / Remark: </span>
                                        <span className="text-muted-foreground">{orderSummary.tlComment}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Interactive Three-Button Form for Authorized Approvers */}
                    {canTlApprove && orderSummary.approved !== true ? (
                        <Card className="border-primary/30 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ShieldCheck className="h-5 w-5 text-primary" />
                                    Team Leader Approval (Stage 1)
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Choose an action below after reviewing the {shortLabel} PDF.
                                </CardDescription>

                                {/* 3 Primary Action Mode Buttons: Approve | Reject | Edit */}
                                <div className="grid grid-cols-3 gap-2 pt-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={activeMode === "approve" ? "default" : "outline"}
                                        onClick={() => {
                                            setActiveMode("approve");
                                            setFormError(null);
                                        }}
                                        className="gap-1.5"
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        Approve
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={activeMode === "reject" ? "destructive" : "outline"}
                                        onClick={() => {
                                            setActiveMode("reject");
                                            setFormError(null);
                                        }}
                                        className="gap-1.5"
                                    >
                                        <XCircle className="h-4 w-4" />
                                        Reject
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={activeMode === "edit" ? "secondary" : "outline"}
                                        onClick={() => {
                                            setActiveMode("edit");
                                            setFormError(null);
                                        }}
                                        className={`gap-1.5 ${
                                            activeMode === "edit"
                                                ? "border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-100"
                                                : ""
                                        }`}
                                    >
                                        <Edit3 className="h-4 w-4" />
                                        Edit
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* 1. APPROVE MODE */}
                                {activeMode === "approve" && (
                                    <div className="space-y-3">
                                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-900 dark:text-emerald-200">
                                            Approving this {shortLabel} will notify the POVWO group and advance it to{" "}
                                            <strong>Accounts Approval (Stage 2)</strong>.
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="approve-remark" className="text-xs font-medium">
                                                Approval Remarks (Optional)
                                            </Label>
                                            <Textarea
                                                id="approve-remark"
                                                rows={3}
                                                placeholder="Add optional approval note for Accounts / team..."
                                                value={generalComment}
                                                onChange={e => setGeneralComment(e.target.value)}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 2. REJECT MODE (Multi-Select Fields + Per-Field Remarks) */}
                                {activeMode === "reject" && (
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium">
                                                Select Fields with Issues (Multi-Select) *
                                            </Label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {REJECT_FIELD_OPTIONS.map(opt => {
                                                    const selected = selectedRejectKeys.includes(opt.key);
                                                    return (
                                                        <button
                                                            key={opt.key}
                                                            type="button"
                                                            onClick={() => toggleRejectField(opt.key)}
                                                            disabled={isSubmitting}
                                                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                                                selected
                                                                    ? "border-destructive bg-destructive text-destructive-foreground"
                                                                    : "border-border bg-background hover:bg-muted"
                                                            }`}
                                                        >
                                                            {selected && <Check className="h-3 w-3" />}
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {selectedRejectKeys.length > 0 && (
                                            <div className="max-h-[38vh] space-y-2.5 overflow-y-auto pr-1">
                                                {selectedRejectKeys.map(key => {
                                                    const opt = REJECT_FIELD_OPTIONS.find(o => o.key === key);
                                                    return (
                                                        <div
                                                            key={key}
                                                            className="space-y-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5"
                                                        >
                                                            <Label className="text-xs font-semibold text-foreground">
                                                                {opt?.label || key} — Issue / Remark *
                                                            </Label>
                                                            <Textarea
                                                                rows={2}
                                                                placeholder={`Specify what is wrong with ${opt?.label || key}...`}
                                                                value={rejectRemarksByKey[key] ?? ""}
                                                                onChange={e =>
                                                                    setRejectRemarksByKey(prev => ({
                                                                        ...prev,
                                                                        [key]: e.target.value,
                                                                    }))
                                                                }
                                                                disabled={isSubmitting}
                                                                className="bg-background text-xs"
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <Label htmlFor="reject-general" className="text-xs font-medium">
                                                Overall Rejection Note (Optional)
                                            </Label>
                                            <Textarea
                                                id="reject-general"
                                                rows={2}
                                                placeholder="Optional general rejection note..."
                                                value={generalComment}
                                                onChange={e => setGeneralComment(e.target.value)}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 3. EDIT MODE (Multi-Select Fields + Old Value vs New Value) */}
                                {activeMode === "edit" && (
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium">
                                                Select Fields to Edit (Multi-Select) *
                                            </Label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {EDIT_FIELD_OPTIONS.map(opt => {
                                                    const selected = selectedEditKeys.includes(opt.key);
                                                    return (
                                                        <button
                                                            key={opt.key}
                                                            type="button"
                                                            onClick={() => toggleEditField(opt.key)}
                                                            disabled={isSubmitting}
                                                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                                                selected
                                                                    ? "border-amber-600 bg-amber-500 text-white"
                                                                    : "border-border bg-background hover:bg-muted"
                                                            }`}
                                                        >
                                                            {selected && <Check className="h-3 w-3" />}
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {selectedEditKeys.length > 0 && (
                                            <div className="max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                                                {selectedEditKeys.map(key => {
                                                    const opt = EDIT_FIELD_OPTIONS.find(o => o.key === key);
                                                    const oldVal = currentFieldValues[key] ?? "—";
                                                    return (
                                                        <div
                                                            key={key}
                                                            className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2.5"
                                                        >
                                                            <p className="text-xs font-semibold text-foreground">
                                                                {opt?.label || key}
                                                            </p>
                                                            <div className="space-y-1">
                                                                <span className="text-[11px] font-medium text-muted-foreground">
                                                                    Current (Old) Value:
                                                                </span>
                                                                <div className="rounded-md border border-border bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground break-words">
                                                                    {oldVal}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[11px] font-medium text-foreground">
                                                                    Requested New Value *
                                                                </Label>
                                                                <Textarea
                                                                    rows={2}
                                                                    placeholder={`Enter new value for ${opt?.label || key}...`}
                                                                    value={editNewValueByKey[key] ?? ""}
                                                                    onChange={e =>
                                                                        setEditNewValueByKey(prev => ({
                                                                            ...prev,
                                                                            [key]: e.target.value,
                                                                        }))
                                                                    }
                                                                    disabled={isSubmitting}
                                                                    className="bg-background text-xs"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Input
                                                                    placeholder="Optional note for this field..."
                                                                    value={editRemarkByKey[key] ?? ""}
                                                                    onChange={e =>
                                                                        setEditRemarkByKey(prev => ({
                                                                            ...prev,
                                                                            [key]: e.target.value,
                                                                        }))
                                                                    }
                                                                    disabled={isSubmitting}
                                                                    className="h-7 bg-background text-xs"
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <Label htmlFor="edit-general" className="text-xs font-medium">
                                                Overall Edit Note (Optional)
                                            </Label>
                                            <Textarea
                                                id="edit-general"
                                                rows={2}
                                                placeholder="Optional note for the creator..."
                                                value={generalComment}
                                                onChange={e => setGeneralComment(e.target.value)}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>
                                )}

                                {formError && (
                                    <Alert variant="destructive" className="py-2">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription className="text-xs">{formError}</AlertDescription>
                                    </Alert>
                                )}

                                <Button
                                    type="button"
                                    className="w-full gap-1.5"
                                    variant={
                                        activeMode === "approve"
                                            ? "default"
                                            : activeMode === "reject"
                                              ? "destructive"
                                              : "secondary"
                                    }
                                    disabled={isSubmitting}
                                    onClick={handleSubmitDecision}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : activeMode === "approve" ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : activeMode === "reject" ? (
                                        <XCircle className="h-4 w-4" />
                                    ) : (
                                        <ArrowRight className="h-4 w-4" />
                                    )}
                                    {activeMode === "approve"
                                        ? `Confirm Approve ${shortLabel}`
                                        : activeMode === "reject"
                                          ? `Confirm Reject ${shortLabel}`
                                          : `Send Edit Request for ${shortLabel}`}
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                    Approval Access
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground">
                                {orderSummary.approved === true
                                    ? `This ${orderLabel} has already received final Accounts Approval.`
                                    : `You are viewing this ${orderLabel} in read-only mode. Only the creator's Team Leader, an Admin, or a Super User can submit Stage 1 approval decisions.`}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderTlApprovalPage;
