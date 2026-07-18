import { ArrowLeft, Building2, FileText, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { SaleInvoiceFormValues } from "../helpers/saleInvoice.schema";

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);

interface SIFormPreviewProps {
    formValues: SaleInvoiceFormValues;
    invoiceNumber?: string;
    projectName?: string;
    tenderNumber?: string;
    isSubmitting: boolean;
    onBack: () => void;
    onSubmit: () => void;
}

export function SIFormPreview({
    formValues,
    invoiceNumber,
    projectName,
    tenderNumber,
    isSubmitting,
    onBack,
    onSubmit,
}: SIFormPreviewProps) {
    const items = (formValues.items || []).filter(i => i.itemDescription && i.qty && i.rate);

    let subtotal = 0;
    let totalGst = 0;
    let grandTotal = 0;

    items.forEach(item => {
        const qty = Number(item.qty || 0);
        const rate = Number(item.rate || 0);
        const gstRate = Number(item.gstRate || 0);
        const lineTotal = qty * rate;
        const gst = (lineTotal * gstRate) / 100;
        subtotal += lineTotal;
        totalGst += gst;
        grandTotal += lineTotal + gst;
    });

    return (
        <Card>
            <CardContent className="p-8 space-y-8">
                <div className="flex items-start justify-between border-b pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-bold">Sale Invoice Request</h2>
                        </div>
                        <Badge variant="outline" className="text-sm">
                            {invoiceNumber || "DRAFT"}
                        </Badge>
                    </div>
                    <div className="text-right space-y-1 text-sm text-muted-foreground">
                        {projectName && <p className="font-medium text-foreground">{projectName}</p>}
                        {tenderNumber && <p>Tender: {tenderNumber}</p>}
                        {formValues.invoiceDate && <p>Date: {formValues.invoiceDate}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            Bill To
                        </div>
                        <p className="font-medium">{formValues.billingCustomerName}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formValues.billingAddress}</p>
                        {formValues.billingGst && (
                            <p className="text-sm font-mono">GST: {formValues.billingGst}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            Ship To
                        </div>
                        <p className="font-medium">{formValues.shippingCustomerName}</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formValues.shippingAddress}</p>
                        {formValues.shippingGst && (
                            <p className="text-sm font-mono">GST: {formValues.shippingGst}</p>
                        )}
                    </div>
                </div>

                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[5%]">#</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Rate (₹)</TableHead>
                                <TableHead className="text-right">GST %</TableHead>
                                <TableHead className="text-right">Amount (₹)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, idx) => {
                                const qty = Number(item.qty || 0);
                                const rate = Number(item.rate || 0);
                                const amount = qty * rate;
                                return (
                                    <TableRow key={idx}>
                                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                        <TableCell>{item.itemDescription}</TableCell>
                                        <TableCell className="text-right">{qty}</TableCell>
                                        <TableCell className="text-right">{rate.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{item.gstRate}%</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(amount)}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={4} />
                                <TableCell className="text-right font-medium">Subtotal</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(subtotal)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell colSpan={4} />
                                <TableCell className="text-right font-medium text-blue-600">GST</TableCell>
                                <TableCell className="text-right font-medium text-blue-600">{formatCurrency(totalGst)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell colSpan={4} />
                                <TableCell className="text-right font-bold">Grand Total</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(grandTotal)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>

                {formValues.remarks && (
                    <div className="text-sm">
                        <span className="font-semibold">Remarks:</span>
                        <p className="text-muted-foreground mt-1">{formValues.remarks}</p>
                    </div>
                )}

                <div className="flex items-center justify-between border-t pt-6">
                    <Button type="button" variant="outline" onClick={onBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                    <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                        ) : (
                            <><FileText className="mr-2 h-4 w-4" />Create Sale Invoice Request</>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
