import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, FileText, Pencil } from "lucide-react"
import type { TenderInfoSheet, TenderInfoWithNames } from "@/types/api.types"
import { formatDateTime } from "@/hooks/useFormatedDate"

interface InfoSheetViewProps {
    infoSheet?: TenderInfoSheet | null
    tender?: TenderInfoWithNames | null
    isLoading?: boolean
    onEdit?: () => void
    onBack?: () => void
}

const formatValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return "—"
    return value
}

const formatYesNo = (value?: string | null) => {
    if (!value) return "—"
    return value === "YES" ? "Yes" : value === "NO" ? "No" : value
}

const formatPercentage = (value?: number | null) => {
    if (value === null || value === undefined) return "—"
    return `${value}%`
}

const formatDocuments = (documents: string[] = []) => {
    if (!documents.length) {
        return <span className="text-muted-foreground">No documents listed</span>
    }

    return (
        <div className="flex flex-wrap gap-2">
            {documents.map((doc) => (
                <Badge key={doc} variant="outline">
                    {doc}
                </Badge>
            ))}
        </div>
    )
}

export const InfoSheetView = ({
    infoSheet,
    tender,
    isLoading,
    onEdit,
    onBack,
}: InfoSheetViewProps) => {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>
                        <Skeleton className="h-6 w-48" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({ length: 6 }).map((_, idx) => (
                            <Skeleton key={idx} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!infoSheet) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tender Info Sheet</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No info sheet available for this tender.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Tender Info Sheet
                </CardTitle>
                <CardAction className="flex gap-2">
                    {onEdit && (
                        <Button variant="default" size="sm" onClick={onEdit}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    )}
                    {onBack && (
                        <Button variant="outline" size="sm" onClick={onBack}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    )}
                </CardAction>
            </CardHeader>
            <CardContent className="space-y-8">
                {tender && (
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground uppercase tracking-wide">Tender Summary</p>
                        <p className="text-base font-semibold mt-1">{tender.tenderName}</p>
                        <p className="text-sm text-muted-foreground">
                            Tender No: {tender.tenderNo} • Organization: {tender.organizationName ?? "—"}
                        </p>
                    </div>
                )}

                <section className="space-y-4">
                    <h3 className="font-semibold text-base border-b pb-2">TE Evaluation</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground">Recommendation</p>
                            <p className="text-base font-semibold">{formatYesNo(infoSheet.teRecommendation)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Rejection Reason</p>
                            <p className="text-base font-semibold">
                                {infoSheet.teRejectionReason ? `Status ${infoSheet.teRejectionReason}` : "—"}
                            </p>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-xs text-muted-foreground">TE Remarks</p>
                            <p className="text-sm">{formatValue(infoSheet.teRemark)}</p>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-xs text-muted-foreground">Rejection Remarks</p>
                            <p className="text-sm">{formatValue(infoSheet.rejectionRemark)}</p>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="font-semibold text-base border-b pb-2">Financial Terms</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground">Tender Fee Amount</p>
                            <p className="text-base font-semibold">{formatValue(infoSheet.tenderFeeAmount)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Tender Fee Mode</p>
                            <p className="text-base font-semibold">{formatValue(infoSheet.tenderFeeModes?.map((mode) => mode).join(", "))}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">EMD Required</p>
                            <p className="text-base font-semibold">{formatYesNo(infoSheet.emdRequired)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">EMD Mode</p>
                            <p className="text-base font-semibold">{formatValue(infoSheet.emdModes?.map((mode) => mode).join(", "))}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Reverse Auction</p>
                            <p className="text-base font-semibold">{formatYesNo(infoSheet.reverseAuctionApplicable)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Physical Docs Required</p>
                            <p className="text-base font-semibold">{formatYesNo(infoSheet.physicalDocsRequired)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Physical Docs Deadline</p>
                            <p className="text-base font-semibold">{infoSheet.physicalDocsDeadline ? formatDateTime(infoSheet.physicalDocsDeadline) : "—"}</p>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="font-semibold text-base border-b pb-2">PBG & Security Deposit</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground">PBG Required</p>
                            <p className="text-base font-semibold">{formatYesNo(infoSheet.pbgForm)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">PBG Percentage</p>
                            <p className="text-base font-semibold">{formatPercentage(infoSheet.pbgPercentage)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">PBG Duration (Months)</p>
                            <p className="text-base font-semibold">{formatValue(infoSheet.pbgDurationMonths)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Security Deposit Mode</p>
                            <p className="text-base font-semibold">{formatValue(infoSheet.sdForm)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Security Deposit %</p>
                            <p className="text-base font-semibold">{formatPercentage(infoSheet.securityDepositPercentage)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">SD Duration (Months)</p>
                            <p className="text-base font-semibold">{formatValue(infoSheet.sdDurationMonths)}</p>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="font-semibold text-base border-b pb-2">Eligibility Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground">Company Age (Years)</p>
                            <p className="text-base font-semibold">{formatValue(infoSheet.techEligibilityAgeYears)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Bid Validity (Days)</p>
                            <p className="text-base font-semibold">{formatValue(infoSheet.bidValidityDays)}</p>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="font-semibold text-base border-b pb-2">Client Contacts</h3>
                    <div className="space-y-3">
                        {infoSheet.clients.map((client, idx) => (
                            <div key={`${client.clientName}-${idx}`} className="rounded-md border p-4">
                                <p className="font-semibold text-base">{client.clientName || `Client ${idx + 1}`}</p>
                                <p className="text-sm text-muted-foreground">{client.clientDesignation || "—"}</p>
                                <div className="mt-2 text-sm space-y-1">
                                    <p>Mobile: {client.clientMobile || "—"}</p>
                                    <p>Email: {client.clientEmail || "—"}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="font-semibold text-base border-b pb-2">Documents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground mb-2">Technical Documents</p>
                            {formatDocuments(infoSheet.technicalWorkOrders)}
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-2">Financial Documents</p>
                            {formatDocuments(infoSheet.commercialDocuments)}
                        </div>
                    </div>
                </section>
            </CardContent>
        </Card>
    )
}
