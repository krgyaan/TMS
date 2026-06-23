import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useRfqResponses } from '@/hooks/api/useRfqResponses';
import { formatDateTime } from '@/hooks/useFormatedDate';
import {
    AlertTriangle, Building2, CheckCircle2, ExternalLink, FileWarning, Paperclip, User,
} from 'lucide-react';

export default function RfqResponsesViewer({ rfqId }: { rfqId: number }) {
    const { data: responsesData, isLoading } = useRfqResponses(rfqId);

    if (isLoading) {
        return (
            <div className="space-y-3 py-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-20 w-full" />
            </div>
        );
    }

    const received = responsesData?.currentRfqResponses || [];
    const pending = responsesData?.pendingTenderResponses || [];

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
        <div className="space-y-4">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Responses Tracker
            </h4>

            {(received.length + pending.length) === 0 ? (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-md p-3 flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    No vendors requested for this RFQ.
                </div>
            ) : pending.length > 0 ? (
                <div className="bg-muted/10 border border-muted rounded-md p-3 space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Awaiting Responses ({pending.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {pending.map((org: any, idx: number) => (
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
                    All requested vendors responded!
                </div>
            )}

            <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Responses Received ({received.length})
                </span>
                {received.length > 0 ? (
                    <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        <Accordion type="single" collapsible className="w-full space-y-1.5">
                            {received.map((res: any, idx: number) => {
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
                                            {res.remarks && (
                                                <div className="p-2 bg-muted/30 border border-muted border-dashed rounded text-[10px] text-muted-foreground italic leading-relaxed">
                                                    &ldquo;{res.remarks}&rdquo;
                                                </div>
                                            )}

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

                                            {res.documents && res.documents.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <span className="block text-[9px] font-bold text-muted-foreground tracking-wider uppercase">Submitted Docs</span>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {res.documents.map((doc: any, dIdx: number) => {
                                                            const filename = doc.path.split('/').pop() || 'Document';
                                                            return (
                                                                <a
                                                                    key={doc.id || dIdx}
                                                                    href={doc.path.startsWith('http') ? doc.path : doc.path.startsWith('/') ? `/uploads/tendering${doc.path}` : `/uploads/tendering/${doc.path}`}
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

                                            <div className="text-[9px] text-right text-muted-foreground font-medium pt-2 border-t border-dashed border-muted">
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
    );
}
