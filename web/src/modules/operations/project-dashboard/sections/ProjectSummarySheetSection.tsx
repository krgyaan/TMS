import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, MapPin, Package, Receipt, Truck, Warehouse } from "lucide-react";
import { formatINR } from "@/hooks/useINRFormatter";
import { useProjectOverview } from "@/hooks/api/useProjectDashboard";
import { useWoDetailByBasicDetail, useWoDetailWithRelations } from "@/hooks/api/useWoDetails";
import { useProjectInventory } from "@/hooks/api/usePurchaseOrders";
import type { ProjectInventoryItem } from "@/modules/operations/sale-invoices/helpers/saleInvoice.types";

interface ProjectSummarySheetSectionProps {
    projectId: number | null;
}

function BoqTable(
    { title, icon, items }: 
    { title: string; icon: React.ReactNode; items: Array<{ srNo: number; itemDescription: string; quantity: string; rate: string; amount: string | null }>}
) {
    const total = items.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    {icon} {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
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
                        {items.map((item, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>{item.itemDescription}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{formatINR(parseFloat(item.rate))}</TableCell>
                                <TableCell className="text-right font-semibold">{formatINR(parseFloat(item.amount || "0"))}</TableCell>
                            </TableRow>
                        ))}
                        {items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground italic">
                                    No items
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    {items.length > 0 && (
                        <TableRow className="bg-muted/30 font-semibold">
                            <TableCell colSpan={4} className="text-right">Total</TableCell>
                            <TableCell className="text-right">{formatINR(total)}</TableCell>
                        </TableRow>
                    )}
                </Table>
            </CardContent>
        </Card>
    );
}

function AddressCard({ address }: { address: { customerName: string; address: string; gst: string | null; srNos: number[] | "all" } }) {
    return (
        <div>
            <Table className="border rounded">
                <TableRow>
                    <TableCell>Customer Name</TableCell>
                    <TableCell>{address.customerName || "—"}</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Address</TableCell>
                    <TableCell>{address.address || "—"}</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>GST</TableCell>
                    <TableCell>{address.gst || "N/A"}</TableCell>
                </TableRow>
            </Table>
            <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground italic">
                    For Item Sr. Nos: {Array.isArray(address.srNos) ? address.srNos.join(", ") : address.srNos}
                </span>
            </div>
        </div>
    );
}

function InventoryTable({ items }: { items: ProjectInventoryItem[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Warehouse className="h-4 w-4 text-emerald-500" />
                    Project Inventory (from Approved POs)
                </CardTitle>
                <CardDescription>Items purchased through approved POs. Invoiced qty is tracked from sale invoices.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-16">Sr. No.</TableHead>
                            <TableHead>Item Description</TableHead>
                            <TableHead>PO Number</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">PO Qty</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Invoiced Qty</TableHead>
                            <TableHead className="text-right">Remaining Qty</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item, idx) => (
                            <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>{item.description}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {item.poNumber}
                                    </Badge>
                                </TableCell>
                                <TableCell>{item.unit || "NOS"}</TableCell>
                                <TableCell className="text-right">{item.qty}</TableCell>
                                <TableCell className="text-right">{formatINR(item.rate)}</TableCell>
                                <TableCell className="text-right">{item.invoicedQty}</TableCell>
                                <TableCell className={`text-right font-semibold ${item.remainingQty <= 0 ? "text-destructive" : item.remainingQty < item.qty ? "text-amber-600" : ""}`}>
                                    {item.remainingQty}
                                </TableCell>
                            </TableRow>
                        ))}
                        {items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground italic">
                                    No items from approved POs yet
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export const ProjectSummarySheetSection: React.FC<ProjectSummarySheetSectionProps> = ({ projectId }) => {
    const [isOpen, setIsOpen] = useState(false);

    const { data: overview, isLoading: isOverviewLoading } = useProjectOverview(projectId!);
    const woBasicDetailId = overview?.woBasicDetail?.id ?? null;

    const { data: woDetailLookup, isLoading: isLookupLoading } = useWoDetailByBasicDetail(woBasicDetailId ?? 0);
    const woDetailId = woDetailLookup?.id ?? null;

    const { data: woDetail, isLoading: isDetailLoading } = useWoDetailWithRelations(woDetailId ?? 0);

    const { data: inventoryData, isLoading: isInventoryLoading } = useProjectInventory(projectId);

    const isLoading = isOverviewLoading || isLookupLoading || isDetailLoading;

    if (!projectId) return null;

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-40 w-full rounded-lg" />
                    <Skeleton className="h-40 w-full rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    if (!woDetail) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Project Summary Sheet</CardTitle>
                    <CardDescription>Billing, shipping, and GST details from WO configuration</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Receipt className="h-10 w-10 mb-3 opacity-30" />
                        <p className="text-sm">No WO details found. Complete the WO Details wizard to populate this summary.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const billingBoq = woDetail.billingBoq ?? [];
    const buybackBoq = woDetail.buybackBoq ?? [];
    const billingAddresses = woDetail.billingAddresses ?? [];
    const shippingAddresses = woDetail.shippingAddresses ?? [];
    const buybackApplicable = buybackBoq.length > 0;

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <Card>
                <CollapsibleTrigger asChild>
                    <button className="w-full text-left">
                        <CardHeader className="pb-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                            <div className="flex justify-between items-center gap-2">
                                <div>
                                    <CardTitle className="text-base font-semibold">Project Summary Sheet</CardTitle>
                                    <CardDescription>Billing, shipping, and GST details from WO configuration</CardDescription>
                                </div>
                                <ChevronDown
                                    className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                                        isOpen ? "rotate-180" : ""
                                    }`}
                                />
                            </div>
                        </CardHeader>
                    </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="space-y-6 pt-0">
                {/* Project Inventory (from Approved POs) */}
                {isInventoryLoading ? (
                    <Skeleton className="h-40 w-full rounded-lg" />
                ) : (
                    <InventoryTable items={inventoryData?.items ?? []} />
                )}

                {/* Billing BOQ */}
                <BoqTable
                    title="Billing BOQ"
                    icon={<Package className="h-4 w-4 text-orange-500" />}
                    items={billingBoq}
                />

                {/* Buyback BOQ */}
                {buybackApplicable ? (
                    <BoqTable
                        title="Buyback BOQ"
                        icon={<Package className="h-4 w-4 text-blue-500" />}
                        items={buybackBoq}
                    />
                ) : (
                    <Card>
                        <CardContent>
                            <p className="text-sm text-muted-foreground italic">Buyback BOQ is not applicable for this work order.</p>
                        </CardContent>
                    </Card>
                )}

                {/* Addresses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                <MapPin className="h-4 w-4 text-orange-500" />
                                Billing Addresses
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {billingAddresses.length > 0 ? (
                                billingAddresses.map((addr, idx) => (
                                    <AddressCard key={addr.id ?? idx} address={addr} />
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground italic text-center py-4">No billing addresses</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                <Truck className="h-4 w-4 text-orange-500" />
                                Shipping Addresses
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {shippingAddresses.length > 0 ? (
                                shippingAddresses.map((addr, idx) => (
                                    <AddressCard key={addr.id ?? idx} address={addr} />
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground italic text-center py-4">No shipping addresses</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
                </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
};
