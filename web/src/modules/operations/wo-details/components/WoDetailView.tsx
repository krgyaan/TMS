import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableRow, TableCell, TableHeader, TableHead } from '@/components/ui/table';
import {
    Building2, FileText, CheckCircle2, XCircle, AlertCircle,
    Calculator, Package, MapPin, Truck, Link2, FileEdit, Pen, Clock, TrendingUp, Calendar, Hash
} from 'lucide-react';
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDateTime } from '@/hooks/useFormatedDate';
import type { WoDetailWithRelations } from '@/modules/operations/types/wo.types';

interface WoDetailViewProps {
    data: WoDetailWithRelations;
    isLoading?: boolean;
}

export function WoDetailView({ data, isLoading }: WoDetailViewProps) {
    if (isLoading) {
        return <div className="p-8 text-center">Loading details...</div>;
    }

    if (!data) return null;

    const { woBasicDetail, billingBoq = [], buybackBoq = [], billingAddresses = [], shippingAddresses = [], acceptance } = data;

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'completed': return 'success';
            case 'submitted_for_review': return 'info';
            case 'in_progress': return 'warning';
            default: return 'secondary';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Work Order Details</h1>
                    <p className="text-muted-foreground">Comprehensive view of WO execution and compliance</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(data.status) as any} className="px-3 py-1 text-sm font-semibold capitalize">
                        {data.status.replace(/_/g, ' ')}
                    </Badge>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 h-auto p-1 bg-muted/50">
                    <TabsTrigger value="overview" className="py-2">Overview</TabsTrigger>
                    <TabsTrigger value="handover" className="py-2">Handover</TabsTrigger>
                    <TabsTrigger value="execution" className="py-2">Execution</TabsTrigger>
                    <TabsTrigger value="billing" className="py-2">Billing</TabsTrigger>
                    <TabsTrigger value="profitability" className="py-2">Profitability</TabsTrigger>
                    <TabsTrigger value="acceptance" className="py-2">Acceptance</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="mt-6 space-y-4">
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Building2 className="h-5 w-5 text-primary" />
                                Project Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                        <Hash className="h-3 w-3" /> WO Number
                                    </p>
                                    <p className="font-semibold">{woBasicDetail?.woNumber || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> WO Date
                                    </p>
                                    <p className="font-semibold">{woBasicDetail?.woDate ? formatDateTime(woBasicDetail.woDate) : '—'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                        <Hash className="h-3 w-3" /> Project Code
                                    </p>
                                    <p className="font-mono font-bold text-primary">{woBasicDetail?.projectCode || '—'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Project Name</p>
                                    <p className="font-semibold truncate" title={woBasicDetail?.projectName || ''}>
                                        {woBasicDetail?.projectName || '—'}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="bg-muted/30 border-none">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="p-3 bg-primary/10 rounded-full">
                                            <TrendingUp className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">WO Value (Pre-GST)</p>
                                            <p className="text-lg font-bold">{woBasicDetail?.woValuePreGst ? formatINR(parseFloat(woBasicDetail.woValuePreGst)) : '—'}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-muted/30 border-none">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="p-3 bg-orange-500/10 rounded-full">
                                            <Calculator className="h-5 w-5 text-orange-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Budget (Pre-GST)</p>
                                            <p className="text-lg font-bold">{data.budgetPreGst ? formatINR(parseFloat(data.budgetPreGst)) : '—'}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-muted/30 border-none">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="p-3 bg-green-500/10 rounded-full">
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Gross Margin</p>
                                            <p className="text-lg font-bold text-green-600">{woBasicDetail?.grossMargin ? `${woBasicDetail.grossMargin}%` : '—'}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Clock className="h-5 w-5 text-primary" />
                                Project Status & Audit
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Current Stage</p>
                                    <Badge variant="outline" className="capitalize">{woBasicDetail?.currentStage?.replace(/_/g, ' ') || 'Not Started'}</Badge>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Progress Page</p>
                                    <p className="font-semibold">Page {data.currentPage} of 7</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Created At</p>
                                    <p className="text-sm">{formatDateTime(data.createdAt)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                                    <p className="text-sm">{formatDateTime(data.updatedAt)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* HANDOVER TAB */}
                <TabsContent value="handover" className="mt-6 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-orange-500" />
                                Project Handover Checklist (Page 1)
                            </CardTitle>
                            {data.checklistCompletedAt && (
                                <CardDescription>Completed on {formatDateTime(data.checklistCompletedAt)}</CardDescription>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {data.tenderDocumentsChecklist && Object.entries(data.tenderDocumentsChecklist).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                        <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                        {value ? (
                                            <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Yes</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> No</Badge>
                                        )}
                                    </div>
                                ))}
                                {!data.tenderDocumentsChecklist && <p className="col-span-full text-center py-4 text-muted-foreground italic">Checklist not yet filled</p>}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-500" />
                                Compliance Obligations (Page 2)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium text-muted-foreground w-1/3">LD Applicable</TableCell>
                                        <TableCell>
                                            <Badge variant={data.ldApplicable ? "default" : "secondary"}>{data.ldApplicable ? 'Yes' : 'No'}</Badge>
                                        </TableCell>
                                    </TableRow>
                                    {data.ldApplicable && (
                                        <>
                                            <TableRow>
                                                <TableCell className="font-medium text-muted-foreground">Max LD %</TableCell>
                                                <TableCell>{data.maxLd}%</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-medium text-muted-foreground">LD Start Date</TableCell>
                                                <TableCell>{data.ldStartDate ? formatDateTime(data.ldStartDate) : '—'}</TableCell>
                                            </TableRow>
                                        </>
                                    )}
                                    <TableRow>
                                        <TableCell className="font-medium text-muted-foreground">PBG Required</TableCell>
                                        <TableCell>
                                            <Badge variant={data.isPbgApplicable ? "default" : "secondary"}>{data.isPbgApplicable ? 'Yes' : 'No'}</Badge>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium text-muted-foreground">Contract/Agreement</TableCell>
                                        <TableCell>
                                            <Badge variant={data.isContractAgreement ? "default" : "secondary"}>{data.isContractAgreement ? 'Yes' : 'No'}</Badge>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium text-muted-foreground">Detailed PO Follow-up</TableCell>
                                        <TableCell>
                                            <Badge variant={data.detailedPoApplicable ? "default" : "secondary"}>{data.detailedPoApplicable ? 'Needed' : 'Not Needed'}</Badge>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* EXECUTION TAB */}
                <TabsContent value="execution" className="mt-6 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-purple-500" />
                                SWOT Analysis (Page 3)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 p-4 border rounded-lg bg-green-50/50 dark:bg-green-950/20">
                                <h4 className="font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" /> Strengths
                                </h4>
                                <p className="text-sm whitespace-pre-wrap">{data.swotStrengths || '—'}</p>
                            </div>
                            <div className="space-y-2 p-4 border rounded-lg bg-red-50/50 dark:bg-red-950/20">
                                <h4 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                                    <XCircle className="h-4 w-4" /> Weaknesses
                                </h4>
                                <p className="text-sm whitespace-pre-wrap">{data.swotWeaknesses || '—'}</p>
                            </div>
                            <div className="space-y-2 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                                <h4 className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" /> Opportunities
                                </h4>
                                <p className="text-sm whitespace-pre-wrap">{data.swotOpportunities || '—'}</p>
                            </div>
                            <div className="space-y-2 p-4 border rounded-lg bg-orange-50/50 dark:bg-orange-950/20">
                                <h4 className="font-bold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" /> Threats
                                </h4>
                                <p className="text-sm whitespace-pre-wrap">{data.swotThreats || '—'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="h-5 w-5 text-orange-500" />
                                Project Execution & Site Visit (Page 5)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Site Visit Required</p>
                                    <Badge variant={data.siteVisitNeeded ? "default" : "secondary"}>{data.siteVisitNeeded ? 'Yes' : 'No'}</Badge>
                                </div>
                                {data.siteVisitNeeded && data.siteVisitPerson && (
                                    <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Site Contact Person</p>
                                        <p className="text-sm font-semibold">{data.siteVisitPerson.name}</p>
                                        <p className="text-xs">{data.siteVisitPerson.phone} | {data.siteVisitPerson.email}</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-blue-500" /> Documents Needed from Client
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {data.documentsNeeded?.map((doc, idx) => <Badge key={idx} variant="outline">{doc}</Badge>) || <span className="text-sm text-muted-foreground italic">None listed</span>}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-green-500" /> Documents Available In-House
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {data.documentsInHouse?.map((doc, idx) => <Badge key={idx} variant="outline">{doc}</Badge>) || <span className="text-sm text-muted-foreground italic">None listed</span>}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* BILLING TAB */}
                <TabsContent value="billing" className="mt-6 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-orange-500" />
                                Billing BOQ (Page 4)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
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
                                    {billingBoq.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.srNo}</TableCell>
                                            <TableCell>{item.itemDescription}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatINR(parseFloat(item.rate))}</TableCell>
                                            <TableCell className="text-right font-semibold">{formatINR(parseFloat(item.amount || '0'))}</TableCell>
                                        </TableRow>
                                    ))}
                                    {billingBoq.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">No billing items</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {buybackBoq.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5 text-blue-500" />
                                    Buyback BOQ
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
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
                                        {buybackBoq.map((item) => (
                                            <TableRow key={item.id}>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-4 w-4 text-orange-500" /> Billing Addresses
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {billingAddresses.map((addr, idx) => (
                                    <div key={idx} className="p-3 border rounded-lg text-sm">
                                        <p className="font-bold mb-1">{addr.customerName}</p>
                                        <p className="text-muted-foreground mb-2 whitespace-pre-wrap">{addr.address}</p>
                                        <div className="flex justify-between items-center text-xs">
                                            <Badge variant="outline">GST: {addr.gst || 'N/A'}</Badge>
                                            <span className="text-muted-foreground italic">
                                                Sr. Nos: {Array.isArray(addr.srNos) ? addr.srNos.join(', ') : addr.srNos}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <Truck className="h-4 w-4 text-orange-500" /> Shipping Addresses
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {shippingAddresses.map((addr, idx) => (
                                    <div key={idx} className="p-3 border rounded-lg text-sm">
                                        <p className="font-bold mb-1">{addr.customerName}</p>
                                        <p className="text-muted-foreground mb-2 whitespace-pre-wrap">{addr.address}</p>
                                        <div className="flex justify-between items-center text-xs">
                                            <Badge variant="outline">GST: {addr.gst || 'N/A'}</Badge>
                                            <span className="text-muted-foreground italic">
                                                Sr. Nos: {Array.isArray(addr.srNos) ? addr.srNos.join(', ') : addr.srNos}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* PROFITABILITY TAB */}
                <TabsContent value="profitability" className="mt-6 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Link2 className="h-5 w-5 text-orange-500" />
                                Tendering Costing (Page 6)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 border rounded-lg bg-muted/30">
                                <p className="text-sm font-medium mb-2">Costing Sheet Link:</p>
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
                                    <p className="text-sm text-muted-foreground italic">No link provided</p>
                                )}
                            </div>

                            <Card className={data.hasDiscrepancies ? "border-destructive bg-destructive/5" : ""}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-full ${data.hasDiscrepancies ? "bg-destructive/20 text-destructive" : "bg-green-500/10 text-green-500"}`}>
                                            {data.hasDiscrepancies ? <AlertCircle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg">PO/WO Discrepancies</h4>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                {data.hasDiscrepancies ? "Discrepancies were identified during execution" : "No discrepancies found during PO/WO comparison"}
                                            </p>
                                            {data.hasDiscrepancies && (
                                                <div className="mt-4 p-4 rounded bg-white dark:bg-black/40 border italic text-sm">
                                                    {data.discrepancyComments || "No comments provided"}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-orange-500" />
                                Detailed Budget (Pre-GST)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Supply Budget</p>
                                    <p className="font-semibold">{formatINR(parseFloat(data.budgetSupply || '0'))}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Service Budget</p>
                                    <p className="font-semibold">{formatINR(parseFloat(data.budgetService || '0'))}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Freight Budget</p>
                                    <p className="font-semibold">{formatINR(parseFloat(data.budgetFreight || '0'))}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Admin Budget</p>
                                    <p className="font-semibold">{formatINR(parseFloat(data.budgetAdmin || '0'))}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Buyback Sale</p>
                                    <p className="font-semibold text-destructive">{formatINR(parseFloat(data.budgetBuybackSale || '0'))}</p>
                                </div>
                                <div className="space-y-1 p-3 bg-primary/5 border rounded-lg">
                                    <p className="text-sm font-bold text-primary">Total Budget (Pre-GST)</p>
                                    <p className="text-xl font-bold">{formatINR(parseFloat(data.budgetPreGst || '0'))}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ACCEPTANCE TAB */}
                <TabsContent value="acceptance" className="mt-6 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileEdit className="h-5 w-5 text-primary" />
                                OE Step: Submission Info (Page 7)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${data.oeWoAmendmentNeeded ? "bg-orange-500/10 text-orange-500" : "bg-green-500/10 text-green-500"}`}>
                                        {data.oeWoAmendmentNeeded ? <FileEdit className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Amendment Needed</p>
                                        <p className="font-semibold">{data.oeWoAmendmentNeeded ? 'Yes' : 'No'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${data.oeSignaturePrepared ? "bg-blue-500/10 text-blue-500" : "bg-muted text-muted-foreground"}`}>
                                        <Pen className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Signature Ready</p>
                                        <p className="font-semibold">{data.oeSignaturePrepared ? 'Yes' : 'No'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${data.courierRequestPrepared ? "bg-purple-500/10 text-purple-500" : "bg-muted text-muted-foreground"}`}>
                                        <Truck className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Courier Notified</p>
                                        <p className="font-semibold">{data.courierRequestPrepared ? 'Yes' : 'No'}</p>
                                    </div>
                                </div>
                            </div>

                            {data.oeAmendmentSubmittedAt && (
                                <p className="text-sm text-muted-foreground mt-2">OE Submission Timestamp: {formatDateTime(data.oeAmendmentSubmittedAt)}</p>
                            )}

                            {data.amendments && data.amendments.length > 0 && (
                                <div className="mt-6 space-y-4">
                                    <h4 className="font-bold border-b pb-2">Proposed Amendments</h4>
                                    <div className="space-y-3">
                                        {data.amendments.map((amd, idx) => (
                                            <div key={idx} className="p-4 border border-orange-200 bg-orange-50/20 rounded-lg space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-xs font-bold uppercase text-orange-600">Amendment {idx + 1}</span>
                                                    <Badge variant="outline">{amd.status}</Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                                                    <p><strong>Page:</strong> {amd.pageNo || '—'}</p>
                                                    <p><strong>Clause:</strong> {amd.clauseNo || '—'}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-medium text-muted-foreground">Current Statement:</p>
                                                    <p className="text-sm line-through decoration-red-400 opacity-70">{amd.currentStatement}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-medium text-muted-foreground">Corrected Statement:</p>
                                                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">{amd.correctedStatement}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {acceptance && (
                        <Card border-primary>
                            <CardHeader className="bg-primary/5">
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                    TL Acceptance & Review Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Final Decision</h4>
                                        <div className="flex items-center gap-4">
                                            <Badge variant={acceptance.decision === 'accepted' ? 'success' : 'default'} className="text-lg py-1 px-4">
                                                {acceptance.decision?.toUpperCase() || 'PENDING'}
                                            </Badge>
                                            <div className="text-sm">
                                                <p className="text-muted-foreground">Decided on</p>
                                                <p className="font-semibold">{acceptance.finalDecisionAt ? formatDateTime(acceptance.finalDecisionAt) : '—'}</p>
                                            </div>
                                        </div>
                                        {acceptance.decisionRemarks && (
                                            <div className="p-3 bg-muted rounded italic text-sm border-l-4 border-primary">
                                                "{acceptance.decisionRemarks}"
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">Signatures Status</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-2 border rounded">
                                                <div className="flex items-center gap-2">
                                                    <Pen className="h-4 w-4 text-blue-500" />
                                                    <span className="text-sm">OE Signature</span>
                                                </div>
                                                {acceptance.oeSignedAt ? (
                                                    <Badge variant="success">Signed {formatDateTime(acceptance.oeSignedAt)}</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Pending</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between p-2 border rounded">
                                                <div className="flex items-center gap-2">
                                                    <Pen className="h-4 w-4 text-primary" />
                                                    <span className="text-sm">TL Signature</span>
                                                </div>
                                                {acceptance.tlSignedAt ? (
                                                    <Badge variant="success">Signed {formatDateTime(acceptance.tlSignedAt)}</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Pending</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-3 border rounded text-center">
                                        <p className="text-xs text-muted-foreground uppercase mb-1 font-bold">Authority Letter</p>
                                        {acceptance.authorityLetterGenerated ? (
                                            <div className="flex flex-col gap-1 items-center">
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                <span className="text-xs">Generated</span>
                                            </div>
                                        ) : <span className="text-xs text-muted-foreground italic">Not yet</span>}
                                    </div>
                                    <div className="p-3 border rounded text-center">
                                        <p className="text-xs text-muted-foreground uppercase mb-1 font-bold">Signed WO Upload</p>
                                        {acceptance.isCompleted ? (
                                            <div className="flex flex-col gap-1 items-center">
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                <span className="text-xs">Completed</span>
                                            </div>
                                        ) : <span className="text-xs text-muted-foreground italic">Pending</span>}
                                    </div>
                                    <div className="p-3 border rounded text-center">
                                        <p className="text-xs text-muted-foreground uppercase mb-1 font-bold">Courier Request</p>
                                        <div className="flex flex-col gap-1 items-center">
                                            {acceptance.courierId ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                                            <span className="text-xs">{acceptance.courierId ? `ID: ${acceptance.courierId}` : 'Awaiting Completion'}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
