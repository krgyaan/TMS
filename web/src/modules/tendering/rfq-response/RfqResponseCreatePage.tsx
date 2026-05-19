import { useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    AlertCircle, ArrowLeft, CheckCircle2, Clock, 
    Building2, User, Paperclip, ExternalLink, 
    FileText, FileWarning, Calendar, List 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { paths } from '@/app/routes/paths';
import { useRfq, useResponseStatus } from '@/hooks/api/useRfqs';
import { useRfqResponses } from '@/hooks/api/useRfqResponses';
import { RfqResponseForm } from './components/RfqResponseForm';
import { formatDateTime } from '@/hooks/useFormatedDate';

export default function RfqResponseCreatePage() {
    const navigate = useNavigate();
    const { rfqId: rfqIdParam } = useParams<{ rfqId: string }>();

    const rfqId = rfqIdParam ? parseInt(rfqIdParam, 10) : null;
    const { data: rfq, isLoading, error } = useRfq(rfqId);
    const { data: responseStatus } = useResponseStatus();
    const { data: responsesData, isLoading: isResponsesLoading } = useRfqResponses(rfqId);

    //giving all the vendor orgs
    const orgs = rfq?.vendorOrganizations ?? undefined;

    const receivedResponses = responsesData?.currentRfqResponses || [];
    const pendingResponses = responsesData?.pendingTenderResponses || [];

    if (!rfqIdParam || Number.isNaN(rfqId!)) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Invalid RFQ ID</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(paths.tendering.rfqs)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[400px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !rfq) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Failed to load RFQ. Please try again.</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(paths.tendering.rfqs)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    const rfqData = {
        ...rfq,
        items: rfq.items ?? [],
        tenderNo: (rfq as any).tenderNo ?? '',
        tenderName: (rfq as any).tenderName ?? '',
    };

    if (!rfqData.items.length) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>This RFQ has no items. Add items to the RFQ before recording a response.</AlertDescription>
                <Button variant="outline" size="sm" onClick={() => navigate(paths.tendering.rfqs)}>
                    Go Back
                </Button>
            </Alert>
        );
    }

    const getStatusBadge = (status: any) => {
        const s = String(status);
        switch (s) {
            case '1':
                return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold rounded shadow-none">Quotation Received</Badge>;
            case '2':
                return <Badge variant="destructive" className="text-[10px] font-semibold rounded shadow-none">Product not available</Badge>;
            case '3':
                return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold rounded shadow-none">OEM docs not provided</Badge>;
            case '4':
                return <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20 text-[10px] font-semibold rounded shadow-none">Not allowed by OEM</Badge>;
            case '5':
                return <Badge className="bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20 text-[10px] font-semibold rounded shadow-none">Not Quoted by OEM</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px] font-semibold border-muted rounded shadow-none">Awaiting Response</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border border-muted shadow-sm overflow-hidden bg-background">
                <CardHeader className="pb-3 border-b bg-muted/10">
                    <div className="flex items-center justify-between w-full">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-semibold tracking-tight">RFQ Response & Status Overview</CardTitle>
                            <CardDescription className="text-sm text-muted-foreground">
                                Detailed overview of vendor responses and requested items for this RFQ.
                            </CardDescription>
                        </div>
                        <CardAction>
                            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back
                            </Button>
                        </CardAction>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column: RFQ & Tender Details + Requested Items */}
                        <div className="space-y-6 pr-0 lg:pr-6 lg:border-r border-muted">
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                    <FileText className="h-4 w-4 text-primary" />
                                    RFQ & Tender Details
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/5 p-4 rounded-lg border text-sm">
                                    <div>
                                        <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Tender Number</span>
                                        <span className="font-semibold text-foreground">{rfqData.tenderNo || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Tender Name</span>
                                        <span className="font-semibold text-foreground">{rfqData.tenderName || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">RFQ ID</span>
                                        <span className="font-semibold text-foreground">#{rfqId}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">RFQ Due Date</span>
                                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5 text-amber-500" />
                                            {rfqData.dueDate ? formatDateTime(rfqData.dueDate) : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                    <List className="h-4 w-4 text-muted-foreground" />
                                    Requested Requirements ({rfqData.items.length})
                                </h4>
                                <div className="border border-muted rounded-md overflow-hidden bg-background max-h-[250px] overflow-y-auto custom-scrollbar shadow-none">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead>
                                            <tr className="bg-muted border-b border-muted text-[10px] uppercase font-semibold text-muted-foreground">
                                                <th className="p-2.5 pl-3">Item Description</th>
                                                <th className="p-2.5 w-20">Unit</th>
                                                <th className="p-2.5 w-20 text-right pr-3">Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rfqData.items.map((item: any, idx: number) => (
                                                <tr key={item.id || idx} className="border-b border-muted last:border-0 hover:bg-muted/30 transition-colors text-foreground">
                                                    <td className="p-2.5 pl-3 font-medium">{item.requirement}</td>
                                                    <td className="p-2.5 text-muted-foreground">{item.unit || '-'}</td>
                                                    <td className="p-2.5 text-right pr-3 font-semibold text-foreground">{item.qty || '0'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Responses Tracker */}
                        <div className="space-y-6">
                            <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                Live Responses Tracker
                            </h4>

                            {/* Pending/Awaiting Responses */}
                            {isResponsesLoading ? (
                                <Skeleton className="h-16 w-full" />
                            ) : pendingResponses.length > 0 ? (
                                <div className="bg-muted/10 border border-muted rounded-md p-3 space-y-2">
                                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        Awaiting Responses ({pendingResponses.length})
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {pendingResponses.map((org: any, idx: number) => (
                                            <Badge 
                                                key={org.organizationId || idx} 
                                                variant="outline" 
                                                className="bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] py-1 px-2.5 font-medium flex items-center gap-1.5 rounded-full shadow-none"
                                            >
                                                <Building2 className="h-3 w-3 text-amber-500" />
                                                {org.organizationName}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-md p-3 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    All requested vendors have responded!
                                </div>
                            )}

                            {/* Responses Received List (Accordion) */}
                            <div className="space-y-3">
                                <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Responses Received ({receivedResponses.length})
                                </span>
                                
                                {isResponsesLoading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                ) : receivedResponses.length > 0 ? (
                                    <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                                        <Accordion type="single" collapsible className="w-full space-y-1.5">
                                            {receivedResponses.map((res: any, idx: number) => {
                                                const valueId = `resp-${res.id || idx}`;
                                                return (
                                                    <AccordionItem key={res.id || idx} value={valueId} className="border border-muted rounded bg-muted/20 hover:bg-muted/30 transition-all text-xs overflow-hidden last:border-b-0">
                                                        <AccordionTrigger className="hover:bg-muted/40 transition-all p-3 hover:no-underline [&[data-state=open]]:bg-muted/40 [&[data-state=open]]:border-b border-muted">
                                                            <div className="flex items-start justify-between gap-2 w-full pr-4 text-left">
                                                                <div className="text-foreground">
                                                                    <span className="font-semibold text-foreground flex items-center gap-1 text-[11px]">
                                                                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                                        {res.organizationName || 'Unknown Org'}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 font-normal">
                                                                        <User className="h-3 w-3 text-muted-foreground" /> Submitted by {res.vendorName}
                                                                    </span>
                                                                </div>
                                                                <div className="shrink-0">
                                                                    {getStatusBadge(res.responseStatus)}
                                                                </div>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="p-4 pt-2 bg-background space-y-3.5">
                                                            {/* Remarks callout */}
                                                            {res.remarks && (
                                                                <div className="p-2 bg-muted/30 border border-muted border-dashed rounded text-[10px] text-muted-foreground italic leading-relaxed">
                                                                    &ldquo;{res.remarks}&rdquo;
                                                                </div>
                                                            )}

                                                            {/* Quotation Details */}
                                                            {String(res.responseStatus) === '1' && (
                                                                <div className="grid grid-cols-3 gap-2 py-1.5 px-2.5 bg-muted/20 border border-muted rounded text-[10px] text-muted-foreground">
                                                                    <div>
                                                                        <span className="block font-semibold text-foreground">Delivery</span>
                                                                        <span className="text-muted-foreground">{res.deliveryTime ?? 'N/A'} days</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="block font-semibold text-foreground">GST</span>
                                                                        <span className="text-muted-foreground">{res.gstPercentage != null ? `${res.gstPercentage}%` : 'N/A'}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="block font-semibold text-foreground">Freight</span>
                                                                        <span className="capitalize text-muted-foreground">{res.freightType || 'N/A'}</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Quoted Pricing Items */}
                                                            {res.items && res.items.length > 0 && (
                                                                <div className="space-y-1.5">
                                                                    <span className="block text-[9px] font-bold text-muted-foreground tracking-wider uppercase">Quoted Pricing</span>
                                                                    <div className="border border-muted rounded-md overflow-hidden bg-background">
                                                                        <table className="w-full text-[10px] text-left border-collapse">
                                                                            <thead>
                                                                                <tr className="bg-muted border-b border-muted text-[8px] uppercase font-semibold text-muted-foreground">
                                                                                    <th className="p-2 pl-3">Item Description</th>
                                                                                    <th className="p-2 w-24 text-right">Unit Price</th>
                                                                                    <th className="p-2 w-24 text-right pr-3">Total</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {res.items.map((it: any, iIdx: number) => (
                                                                                    <tr key={it.id || iIdx} className="border-b border-muted last:border-0 hover:bg-muted/10 transition-colors text-foreground">
                                                                                        <td className="p-2 pl-3 font-medium truncate max-w-[250px]">{it.requirement}</td>
                                                                                        <td className="p-2 text-right font-medium">₹{it.unitPrice ? Number(it.unitPrice).toLocaleString('en-IN') : '0'}</td>
                                                                                        <td className="p-2 text-right font-semibold pr-3">₹{it.totalPrice ? Number(it.totalPrice).toLocaleString('en-IN') : '0'}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Quoted Documents */}
                                                            {res.documents && res.documents.length > 0 && (
                                                                <div className="space-y-1.5">
                                                                    <span className="block text-[9px] font-bold text-muted-foreground tracking-wider uppercase">Submitted Docs</span>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                        {res.documents.map((doc: any, dIdx: number) => {
                                                                            const filename = doc.path.split('/').pop() || 'Document';
                                                                            return (
                                                                                <a 
                                                                                    key={doc.id || dIdx} 
                                                                                    href={doc.path} 
                                                                                    target="_blank" 
                                                                                    rel="noopener noreferrer"
                                                                                    className="p-2.5 border border-muted rounded flex items-center justify-between hover:bg-muted transition-all text-primary font-medium truncate bg-background text-[10px]"
                                                                                >
                                                                                    <div className="flex items-center gap-2 truncate">
                                                                                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                                                        <span className="font-semibold uppercase text-[8px] text-muted-foreground border px-1.5 py-0.5 rounded bg-muted/30 shrink-0">{doc.docType.replace('_', ' ')}</span>
                                                                                        <span className="truncate text-muted-foreground">{filename}</span>
                                                                                    </div>
                                                                                    <ExternalLink className="h-3 w-3 text-primary shrink-0 ml-1" />
                                                                                </a>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="text-[9px] text-right text-muted-foreground font-medium pt-2 border-t border-dashed border-muted font-mono">
                                                                Received: {formatDateTime(res.receiptDatetime)}
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                );
                                            })}
                                        </Accordion>
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-muted-foreground italic p-4 border border-dashed border-muted rounded bg-muted/10 text-center flex flex-col items-center justify-center gap-1.5">
                                        <FileWarning className="h-5 w-5 text-muted-foreground" />
                                        No responses received yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <RfqResponseForm
                rfqId={rfqId!}
                rfqData={rfqData}
                orgs={orgs}
                responseStatus={responseStatus}
            />
        </div>
    );
}
