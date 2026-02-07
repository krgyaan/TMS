import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table"
import { FileText } from "lucide-react"
import type { TenderInfoSheet } from "@/modules/tendering/info-sheet/helpers/tenderInfoSheet.types"
import { formatDateTime } from "@/hooks/useFormatedDate"
import { formatINR } from "@/hooks/useINRFormatter"

interface InfoSheetViewProps {
    infoSheet?: TenderInfoSheet | null
    isLoading?: boolean
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

const formatDocuments = (documents: string[] | Array<{ id?: number; documentName: string }> = []) => {
    if (!documents.length) {
        return <span className="text-muted-foreground">No documents listed</span>
    }

    return (
        <div className="flex flex-wrap gap-2">
            {documents.map((doc, index) => {
                // Handle both string arrays and object arrays
                const docName = typeof doc === 'string' ? doc : doc.documentName;
                const docKey = typeof doc === 'string' ? doc : (doc.id ?? doc.documentName ?? index);

                return (
                    <Badge key={docKey} variant="outline">
                        {docName}
                    </Badge>
                );
            })}
        </div>
    )
}

export const InfoSheetView = ({
    infoSheet,
    isLoading,
}: InfoSheetViewProps) => {
    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <Skeleton key={idx} className="h-10 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!infoSheet) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Tender Info Sheet
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No info sheet available for this tender.</p>
                    </div>
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
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {/* TE Evaluation */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                TE Evaluation
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Recommendation
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                {formatYesNo(infoSheet.teRecommendation)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Rejection Reason
                            </TableCell>
                            <TableCell className="text-sm w-1/4">
                                {infoSheet.teRejectionReason ? `Status ${infoSheet.teRejectionReason}` : '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                TE Final Remark
                            </TableCell>
                            <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]" colSpan={3}>
                                {infoSheet.teFinalRemark || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Rejection Remarks
                            </TableCell>
                            <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]" colSpan={3}>
                                {formatValue(infoSheet.teRejectionRemarks)}
                            </TableCell>
                        </TableRow>

                        {/* Processing Fee */}
                        {(infoSheet.processingFeeRequired || infoSheet.processingFeeAmount) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Processing Fee
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Processing Fee Required
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatYesNo(infoSheet.processingFeeRequired)}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Processing Fee Amount
                                    </TableCell>
                                    <TableCell className="text-sm font-semibold">
                                        {infoSheet.processingFeeAmount ? formatINR(Number(infoSheet.processingFeeAmount)) : '—'}
                                    </TableCell>
                                </TableRow>
                                {infoSheet.processingFeeMode && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Processing Fee Mode
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            {infoSheet.processingFeeMode.join(', ')}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                        {/* Financial Terms */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Financial Terms
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Fee Required
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatYesNo(infoSheet.tenderFeeRequired)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Fee Amount
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {infoSheet.tenderFeeAmount ? formatINR(Number(infoSheet.tenderFeeAmount)) : '—'}
                            </TableCell>
                        </TableRow>
                        {infoSheet.tenderFeeMode && (
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Tender Fee Mode
                                </TableCell>
                                <TableCell className="text-sm" colSpan={3}>
                                    {infoSheet.tenderFeeMode.join(', ')}
                                </TableCell>
                            </TableRow>
                        )}
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                EMD Required
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatYesNo(infoSheet.emdRequired)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                EMD Amount
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {infoSheet.emdAmount ? formatINR(Number(infoSheet.emdAmount)) : '—'}
                            </TableCell>
                        </TableRow>
                        {infoSheet.emdMode && (
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    EMD Mode
                                </TableCell>
                                <TableCell className="text-sm" colSpan={3}>
                                    {infoSheet.emdMode.join(', ')}
                                </TableCell>
                            </TableRow>
                        )}
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Reverse Auction Applicable
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatYesNo(infoSheet.reverseAuctionApplicable)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Physical Docs Required
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatYesNo(infoSheet.physicalDocsRequired)}
                            </TableCell>
                        </TableRow>
                        {infoSheet.physicalDocsDeadline && infoSheet.physicalDocsRequired === 'YES' && (
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium text-muted-foreground">
                                    Physical Docs Deadline
                                </TableCell>
                                <TableCell className="text-sm" colSpan={3}>
                                    {formatDateTime(infoSheet.physicalDocsDeadline)}
                                </TableCell>
                            </TableRow>
                        )}

                        {/* Payment Terms */}
                        {(infoSheet.paymentTermsSupply || infoSheet.paymentTermsInstallation) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Payment Terms
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Payment Terms Supply (Days)
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatValue(infoSheet.paymentTermsSupply)}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Payment Terms Installation (Days)
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatValue(infoSheet.paymentTermsInstallation)}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Commercial Evaluation */}
                        {(infoSheet.commercialEvaluation || infoSheet.mafRequired) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Commercial Evaluation
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Commercial Evaluation Type
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatValue(infoSheet.commercialEvaluation)}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        MAF Required
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatValue(infoSheet.mafRequired)}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Delivery Terms */}
                        {(infoSheet.deliveryTimeSupply || infoSheet.deliveryTimeInstallationDays) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Delivery Terms
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Delivery Time Supply (Days)
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatValue(infoSheet.deliveryTimeSupply)}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Installation Inclusive
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {infoSheet.deliveryTimeInstallationInclusive ? 'Yes' : 'No'}
                                    </TableCell>
                                </TableRow>
                                {infoSheet.deliveryTimeInstallationDays && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Delivery Time Installation (Days)
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            {formatValue(infoSheet.deliveryTimeInstallationDays)}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                        {/* PBG & Security Deposit */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                PBG & Security Deposit
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                PBG Required
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatYesNo(infoSheet.pbgRequired)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                PBG Mode
                            </TableCell>
                            <TableCell className="text-sm">
                                {infoSheet.pbgMode}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                PBG Percentage
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatPercentage(Number(infoSheet.pbgPercentage))}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                PBG Duration (Months)
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatValue(infoSheet.pbgDurationMonths)}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                SD Required
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatYesNo(infoSheet.sdRequired)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Security Deposit Mode
                            </TableCell>
                            <TableCell className="text-sm">
                                {infoSheet.sdMode}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Security Deposit %
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatPercentage(Number(infoSheet.sdPercentage))}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                SD Duration (Months)
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatValue(infoSheet.sdDurationMonths)}
                            </TableCell>
                        </TableRow>

                        {/* Liquidated Damages */}
                        {infoSheet.ldRequired && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Liquidated Damages
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        LD Required
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatYesNo(infoSheet.ldRequired)}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        LD Percentage Per Week
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatPercentage(Number(infoSheet.ldPercentagePerWeek))}
                                    </TableCell>
                                </TableRow>
                                {infoSheet.maxLdPercentage && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Max LD Percentage
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={3}>
                                            {formatPercentage(Number(infoSheet.maxLdPercentage))}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                        {/* Eligibility Summary */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Eligibility Summary
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Company Age (Years)
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatValue(infoSheet.techEligibilityAge)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Bid Validity (Days)
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatValue(infoSheet.bidValidityDays)}
                            </TableCell>
                        </TableRow>

                        {/* Work Orders */}
                        {(infoSheet.workValueType) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Eligibility Criteria
                                    </TableCell>
                                </TableRow>
                                {infoSheet.workValueType === 'WORKS_VALUES' && (
                                    <>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Value of 1st Work Order
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {infoSheet.orderValue1 ? formatINR(Number(infoSheet.orderValue1)) : '—'}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Value of 2nd Work Order
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {infoSheet.orderValue2 ? formatINR(Number(infoSheet.orderValue2)) : '—'}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Value of 3rd Work Order
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {infoSheet.orderValue3 ? formatINR(Number(infoSheet.orderValue3)) : '—'}
                                            </TableCell>
                                        </TableRow>
                                    </>
                                )}
                                {infoSheet.workValueType === 'CUSTOM' && (
                                    <>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Custom Eligibility Criteria
                                            </TableCell>
                                            <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]">
                                                {infoSheet.customEligibilityCriteria || '—'}
                                            </TableCell>

                                        </TableRow>
                                    </>
                                )}
                            </>
                        )}

                        {/* Financial Requirements */}
                        {(infoSheet.avgAnnualTurnoverType || infoSheet.workingCapitalType || infoSheet.solvencyCertificateType || infoSheet.netWorthType) && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Financial Requirements
                                    </TableCell>
                                </TableRow>
                                {infoSheet.avgAnnualTurnoverType && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Avg Annual Turnover Type
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {formatValue(infoSheet.avgAnnualTurnoverType)}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Avg Annual Turnover Value
                                        </TableCell>
                                        <TableCell className="text-sm font-semibold">
                                            {infoSheet.avgAnnualTurnoverValue ? formatINR(Number(infoSheet.avgAnnualTurnoverValue)) : '—'}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {infoSheet.workingCapitalType && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Working Capital Type
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {formatValue(infoSheet.workingCapitalType)}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Working Capital Value
                                        </TableCell>
                                        <TableCell className="text-sm font-semibold">
                                            {infoSheet.workingCapitalValue ? formatINR(Number(infoSheet.workingCapitalValue)) : '—'}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {infoSheet.solvencyCertificateType && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Solvency Certificate Type
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {formatValue(infoSheet.solvencyCertificateType)}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Solvency Certificate Value
                                        </TableCell>
                                        <TableCell className="text-sm font-semibold">
                                            {infoSheet.solvencyCertificateValue ? formatINR(Number(infoSheet.solvencyCertificateValue)) : '—'}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {infoSheet.netWorthType && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Net Worth Type
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {formatValue(infoSheet.netWorthType)}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            Net Worth Value
                                        </TableCell>
                                        <TableCell className="text-sm font-semibold">
                                            {infoSheet.netWorthValue ? formatINR(Number(infoSheet.netWorthValue)) : '—'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </>
                        )}

                        {/* Courier Address */}
                        {infoSheet.courierAddress && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Courier Information
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Courier Address
                                    </TableCell>
                                    <TableCell className="text-sm whitespace-normal [overflow-wrap:anywhere]" colSpan={3}>
                                        {infoSheet.courierAddress}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Client Contacts */}
                        {infoSheet.clients && infoSheet.clients.length > 0 ? (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Client Contacts
                                    </TableCell>
                                </TableRow>
                                {infoSheet.clients.map((client, idx) => (
                                    <React.Fragment key={`${client.clientName}-${idx}`}>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Client {idx + 1} Name
                                            </TableCell>
                                            <TableCell className="text-sm font-semibold">
                                                {client.clientName || '—'}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Designation
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {client.clientDesignation || '—'}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Mobile
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {client.clientMobile || '—'}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground">
                                                Email
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {client.clientEmail || '—'}
                                            </TableCell>
                                        </TableRow>
                                    </React.Fragment>
                                ))}
                            </>
                        ) : null}

                        {/* Documents */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Documents
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Technical Documents
                            </TableCell>
                            <TableCell className="text-sm" colSpan={3}>
                                {formatDocuments(infoSheet.technicalWorkOrders || [])}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Financial Documents
                            </TableCell>
                            <TableCell className="text-sm" colSpan={3}>
                                {formatDocuments(infoSheet.commercialDocuments || [])}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
