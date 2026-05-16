import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableRow, TableCell, TableHeader, TableHead } from '@/components/ui/table';
import {
    Building2, FileText, CheckCircle2, XCircle, AlertCircle,
    Calculator, Package, MapPin, Truck, Link2, FileEdit, Pen, Clock, TrendingUp
} from 'lucide-react';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDateTime } from '@/hooks/useFormatedDate';
import type { WoDetailWithRelations } from '@/modules/operations/types/wo.types';


export function WoDetailView({ data }: { data: WoDetailWithRelations }) {
    if (!data) return null;

    const { woBasicDetail, billingBoq = [], buybackBoq = [], billingAddresses = [], shippingAddresses = [], acceptance } = data;

    return (
        <>
            {/* PROJECT INFORMATION */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Building2 className="h-5 w-5 text-primary" />
                        Project Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground">Current Stage</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="capitalize">
                                        {woBasicDetail?.currentStage?.replace(/_/g, ' ') || 'Not Started'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium text-muted-foreground">Progress Page</TableCell>
                                <TableCell className="font-semibold">Page {data.currentPage} of 7</TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground">Created At</TableCell>
                                <TableCell>{formatDateTime(data.createdAt)}</TableCell>
                                <TableCell className="font-medium text-muted-foreground">Last Updated</TableCell>
                                <TableCell colSpan={3}>{formatDateTime(data.updatedAt)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* HANDOVER CHECKLIST */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5 text-orange-500" />
                        Project Handover Checklist (Page 1)
                    </CardTitle>
                    {data.checklistCompletedAt && (
                        <CardDescription>Completed on {formatDateTime(data.checklistCompletedAt)}</CardDescription>
                    )}
                </CardHeader>
                <CardContent className="pt-4">
                    {data.tenderDocumentsChecklist ? (
                        <Table>
                            <TableBody>
                                {Object.entries(data.tenderDocumentsChecklist).reduce((rows: any[], [key, value], index, arr) => {
                                    if (index % 2 === 0) {
                                        const nextEntry = arr[index + 1];
                                        rows.push(
                                            <TableRow key={key} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium w-1/4 capitalize">
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </TableCell>
                                                <TableCell className="w-1/4">
                                                    {value ? (
                                                        <Badge variant="default" className="gap-1">
                                                            <CheckCircle2 className="h-3 w-3" /> Yes
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="gap-1">
                                                            <XCircle className="h-3 w-3" /> No
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                {nextEntry ? (
                                                    <>
                                                        <TableCell className="font-medium w-1/4 capitalize">
                                                            {nextEntry[0].replace(/([A-Z])/g, ' $1').trim()}
                                                        </TableCell>
                                                        <TableCell className="w-1/4">
                                                            {nextEntry[1] ? (
                                                                <Badge variant="default" className="gap-1">
                                                                    <CheckCircle2 className="h-3 w-3" /> Yes
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="gap-1">
                                                                    <XCircle className="h-3 w-3" /> No
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                    </>
                                                ) : (
                                                    <>
                                                        <TableCell className="w-1/4"></TableCell>
                                                        <TableCell className="w-1/4"></TableCell>
                                                    </>
                                                )}
                                            </TableRow>
                                        );
                                    }
                                    return rows;
                                }, [])}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center py-4 text-muted-foreground italic">Checklist not yet filled</p>
                    )}
                </CardContent>
            </Card>

            {/* COMPLIANCE OBLIGATIONS */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5 text-blue-500" />
                        Compliance Obligations (Page 2)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground w-1/4">LD Applicable</TableCell>
                                <TableCell className="w-1/4">
                                    <Badge variant={data.ldApplicable ? "default" : "secondary"}>
                                        {data.ldApplicable ? 'Yes' : 'No'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium text-muted-foreground w-1/4">PBG Required</TableCell>
                                <TableCell className="w-1/4">
                                    <Badge variant={data.isPbgApplicable ? "default" : "secondary"}>
                                        {data.isPbgApplicable ? 'Yes' : 'No'}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                            {data.ldApplicable && (
                                <>
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium text-muted-foreground">Max LD %</TableCell>
                                        <TableCell>{data.maxLd}%</TableCell>
                                        <TableCell className="font-medium text-muted-foreground">LD Start Date</TableCell>
                                        <TableCell>{data.ldStartDate ? formatDateTime(data.ldStartDate) : '—'}</TableCell>
                                    </TableRow>
                                </>
                            )}
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground">Contract/Agreement</TableCell>
                                <TableCell>
                                    <Badge variant={data.isContractAgreement ? "default" : "secondary"}>
                                        {data.isContractAgreement ? 'Yes' : 'No'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium text-muted-foreground">Detailed PO Follow-up</TableCell>
                                <TableCell>
                                    <Badge variant={data.detailedPoApplicable ? "default" : "secondary"}>
                                        {data.detailedPoApplicable ? 'Needed' : 'Not Needed'}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* SWOT ANALYSIS */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingUp className="h-5 w-5 text-purple-500" />
                        SWOT Analysis (Page 3)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-bold text-green-700 dark:text-green-400 w-1/4">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" /> Strengths
                                    </div>
                                </TableCell>
                                <TableCell className="w-3/4">
                                    <p className="text-sm whitespace-pre-wrap">{data.swotStrengths || '—'}</p>
                                </TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-bold text-red-700 dark:text-red-400">
                                    <div className="flex items-center gap-2">
                                        <XCircle className="h-4 w-4" /> Weaknesses
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm whitespace-pre-wrap">{data.swotWeaknesses || '—'}</p>
                                </TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-bold text-blue-700 dark:text-blue-400">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4" /> Opportunities
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm whitespace-pre-wrap">{data.swotOpportunities || '—'}</p>
                                </TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-bold text-orange-700 dark:text-orange-400">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" /> Threats
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm whitespace-pre-wrap">{data.swotThreats || '—'}</p>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* BILLING BOQ */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="h-5 w-5 text-orange-500" />
                        Billing BOQ (Page 4)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-16">Sr. No.</TableHead>
                                <TableHead>Item Description</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {billingBoq.map((item) => (
                                <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                                    <TableCell>{item.srNo}</TableCell>
                                    <TableCell>{item.itemDescription}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{formatINR(parseFloat(item.rate))}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatINR(parseFloat(item.amount || '0'))}</TableCell>
                                </TableRow>
                            ))}
                            {billingBoq.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                                        No billing items
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* BUYBACK BOQ */}
            {buybackBoq.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Package className="h-5 w-5 text-blue-500" />
                            Buyback BOQ
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-16">Sr. No.</TableHead>
                                    <TableHead>Item Description</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Rate</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {buybackBoq.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell>{item.srNo}</TableCell>
                                        <TableCell>{item.itemDescription}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">{formatINR(parseFloat(item.rate))}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatINR(parseFloat(item.amount || '0'))}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* ADDRESSES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MapPin className="h-4 w-4 text-orange-500" /> Billing Addresses
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <Table>
                            <TableBody>
                                {billingAddresses.map((addr, idx) => (
                                    <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                                        <TableCell>
                                            <div className="space-y-2">
                                                <p className="font-bold">{addr.customerName}</p>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{addr.address}</p>
                                                <div className="flex justify-between items-center text-xs">
                                                    <Badge variant="outline">GST: {addr.gst || 'N/A'}</Badge>
                                                    <span className="text-muted-foreground italic">
                                                        Sr. Nos: {Array.isArray(addr.srNos) ? addr.srNos.join(', ') : addr.srNos}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {billingAddresses.length === 0 && (
                                    <TableRow>
                                        <TableCell className="text-center py-4 text-muted-foreground italic">
                                            No billing addresses
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Truck className="h-4 w-4 text-orange-500" /> Shipping Addresses
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <Table>
                            <TableBody>
                                {shippingAddresses.map((addr, idx) => (
                                    <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                                        <TableCell>
                                            <div className="space-y-2">
                                                <p className="font-bold">{addr.customerName}</p>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{addr.address}</p>
                                                <div className="flex justify-between items-center text-xs">
                                                    <Badge variant="outline">GST: {addr.gst || 'N/A'}</Badge>
                                                    <span className="text-muted-foreground italic">
                                                        Sr. Nos: {Array.isArray(addr.srNos) ? addr.srNos.join(', ') : addr.srNos}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {shippingAddresses.length === 0 && (
                                    <TableRow>
                                        <TableCell className="text-center py-4 text-muted-foreground italic">
                                            No shipping addresses
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* PROJECT EXECUTION & SITE VISIT */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Truck className="h-5 w-5 text-orange-500" />
                        Project Execution & Site Visit (Page 5)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground w-1/4">Site Visit Required</TableCell>
                                <TableCell colSpan={3}>
                                    <Badge variant={data.siteVisitNeeded ? "default" : "secondary"}>
                                        {data.siteVisitNeeded ? 'Yes' : 'No'}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                            {data.siteVisitNeeded && data.siteVisitPerson && (
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-medium text-muted-foreground">Site Contact Person</TableCell>
                                    <TableCell colSpan={3}>
                                        <div className="space-y-1">
                                            <p className="font-semibold">{data.siteVisitPerson.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {data.siteVisitPerson.phone} | {data.siteVisitPerson.email}
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground align-top">Documents Needed from Client</TableCell>
                                <TableCell colSpan={3}>
                                    <div className="flex flex-wrap gap-2">
                                        {data.documentsNeeded?.map((doc, idx) => (
                                            <Badge key={idx} variant="outline">{doc}</Badge>
                                        )) || <span className="text-sm text-muted-foreground italic">None listed</span>}
                                    </div>
                                </TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground align-top">Documents Available In-House</TableCell>
                                <TableCell colSpan={3}>
                                    <div className="flex flex-wrap gap-2">
                                        {data.documentsInHouse?.map((doc, idx) => (
                                            <Badge key={idx} variant="outline">{doc}</Badge>
                                        )) || <span className="text-sm text-muted-foreground italic">None listed</span>}
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* TENDERING COSTING */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Link2 className="h-5 w-5 text-orange-500" />
                        Tendering Costing (Page 6)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground w-1/4">Costing Sheet Link</TableCell>
                                <TableCell colSpan={3}>
                                    {data.costingSheetLink ? (
                                        <a
                                            href={data.costingSheetLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline flex items-center gap-2 break-all"
                                        >
                                            <Link2 className="h-4 w-4 shrink-0" />
                                            {data.costingSheetLink}
                                        </a>
                                    ) : (
                                        <span className="text-sm text-muted-foreground italic">No link provided</span>
                                    )}
                                </TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground">PO/WO Discrepancies</TableCell>
                                <TableCell colSpan={3}>
                                    <div className="flex items-start gap-3">
                                        {data.hasDiscrepancies ? (
                                            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-1" />
                                        ) : (
                                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-1" />
                                        )}
                                        <div className="space-y-2">
                                            <p className="font-semibold">
                                                {data.hasDiscrepancies ? "Discrepancies Identified" : "No Discrepancies"}
                                            </p>
                                            {data.hasDiscrepancies && data.discrepancyComments && (
                                                <p className="text-sm italic text-muted-foreground p-3 bg-muted rounded border">
                                                    {data.discrepancyComments}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* DETAILED BUDGET */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Calculator className="h-5 w-5 text-orange-500" />
                        Detailed Budget (Pre-GST)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground w-1/4">Supply Budget</TableCell>
                                <TableCell className="font-semibold w-1/4">{formatINR(parseFloat(data.budgetSupply || '0'))}</TableCell>
                                <TableCell className="font-medium text-muted-foreground w-1/4">Service Budget</TableCell>
                                <TableCell className="font-semibold w-1/4">{formatINR(parseFloat(data.budgetService || '0'))}</TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground">Freight Budget</TableCell>
                                <TableCell className="font-semibold">{formatINR(parseFloat(data.budgetFreight || '0'))}</TableCell>
                                <TableCell className="font-medium text-muted-foreground">Admin Budget</TableCell>
                                <TableCell className="font-semibold">{formatINR(parseFloat(data.budgetAdmin || '0'))}</TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground">Buyback Sale</TableCell>
                                <TableCell className="font-semibold text-destructive">{formatINR(parseFloat(data.budgetBuybackSale || '0'))}</TableCell>
                                <TableCell className="font-bold text-primary">Total Budget (Pre-GST)</TableCell>
                                <TableCell className="text-xl font-bold">{formatINR(parseFloat(data.budgetPreGst || '0'))}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* OE SUBMISSION INFO */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FileEdit className="h-5 w-5 text-primary" />
                        OE Step: Submission Info (Page 7)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <Table>
                        <TableBody>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground w-1/4">Amendment Needed</TableCell>
                                <TableCell className="w-1/4">
                                    <div className="flex items-center gap-2">
                                        {data.oeWoAmendmentNeeded ? (
                                            <FileEdit className="h-4 w-4 text-orange-500" />
                                        ) : (
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        )}
                                        <span className="font-semibold">{data.oeWoAmendmentNeeded ? 'Yes' : 'No'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium text-muted-foreground w-1/4">Signature Ready</TableCell>
                                <TableCell className="w-1/4">
                                    <div className="flex items-center gap-2">
                                        <Pen className="h-4 w-4 text-blue-500" />
                                        <span className="font-semibold">{data.oeSignaturePrepared ? 'Yes' : 'No'}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="font-medium text-muted-foreground">Courier Notified</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Truck className="h-4 w-4 text-purple-500" />
                                        <span className="font-semibold">{data.courierRequestPrepared ? 'Yes' : 'No'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium text-muted-foreground">OE Submission Time</TableCell>
                                <TableCell>
                                    {data.oeAmendmentSubmittedAt ? formatDateTime(data.oeAmendmentSubmittedAt) : '—'}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>

                    {data.amendments && data.amendments.length > 0 && (
                        <div className="mt-6">
                            <h4 className="font-bold mb-4 text-base border-b pb-2">Proposed Amendments</h4>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead className="w-24">Page/Clause</TableHead>
                                        <TableHead>Current Statement</TableHead>
                                        <TableHead>Corrected Statement</TableHead>
                                        <TableHead className="w-24">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.amendments.map((amd, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-bold">{idx + 1}</TableCell>
                                            <TableCell>
                                                <div className="text-xs">
                                                    <div>Page: {amd.pageNo || '—'}</div>
                                                    <div>Clause: {amd.clauseNo || '—'}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm line-through decoration-red-400 opacity-70">
                                                    {amd.currentStatement}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
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
                </CardContent>
            </Card>

            {/* TL ACCEPTANCE */}
            {acceptance && (
                <Card className="border-primary">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            TL Acceptance & Review Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <Table>
                            <TableBody>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-medium text-muted-foreground w-1/4">Final Decision</TableCell>
                                    <TableCell className="w-1/4">
                                        <Badge
                                            variant={acceptance.decision === 'accepted' ? 'success' : 'secondary'}
                                            className="text-base"
                                        >
                                            {acceptance.decision?.toUpperCase() || 'PENDING'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium text-muted-foreground w-1/4">Decided On</TableCell>
                                    <TableCell className="w-1/4">
                                        {acceptance.finalDecisionAt ? formatDateTime(acceptance.finalDecisionAt) : '—'}
                                    </TableCell>
                                </TableRow>
                                {acceptance.decisionRemarks && (
                                    <TableRow className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium text-muted-foreground">Decision Remarks</TableCell>
                                        <TableCell colSpan={3}>
                                            <p className="text-sm italic border-l-4 border-primary pl-3 py-2">
                                                "{acceptance.decisionRemarks}"
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                )}
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-medium text-muted-foreground">OE Signature</TableCell>
                                    <TableCell>
                                        {acceptance.oeSignedAt ? (
                                            <Badge variant="default" className="gap-1">
                                                <Pen className="h-3 w-3" /> Signed {formatDateTime(acceptance.oeSignedAt)}
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">Pending</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium text-muted-foreground">TL Signature</TableCell>
                                    <TableCell>
                                        {acceptance.tlSignedAt ? (
                                            <Badge variant="default" className="gap-1">
                                                <Pen className="h-3 w-3" /> Signed {formatDateTime(acceptance.tlSignedAt)}
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">Pending</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-medium text-muted-foreground">Authority Letter</TableCell>
                                    <TableCell>
                                        {acceptance.authorityLetterGenerated ? (
                                            <Badge variant="default" className="gap-1">
                                                <CheckCircle2 className="h-3 w-3" /> Generated
                                            </Badge>
                                        ) : (
                                            <span className="text-sm text-muted-foreground italic">Not yet</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium text-muted-foreground">Signed WO Upload</TableCell>
                                    <TableCell>
                                        {acceptance.isCompleted ? (
                                            <Badge variant="default" className="gap-1">
                                                <CheckCircle2 className="h-3 w-3" /> Completed
                                            </Badge>
                                        ) : (
                                            <span className="text-sm text-muted-foreground italic">Pending</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-medium text-muted-foreground">Courier Request</TableCell>
                                    <TableCell colSpan={3}>
                                        {acceptance.courierId ? (
                                            <Badge variant="default" className="gap-1">
                                                <CheckCircle2 className="h-3 w-3" /> ID: {acceptance.courierId}
                                            </Badge>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground italic">Awaiting Completion</span>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </>
    );
}
