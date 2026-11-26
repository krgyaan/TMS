import { ExternalLink } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WoBasicDetail } from "@/modules/operations/types/wo.types";
import { BasicDetailsSection } from "./BasicDetailsSection";

interface OrdersBasicDetailsAccordionProps {
    orders: WoBasicDetail[];
    activeOrderId: number;
    onOpenOrder: (orderId: number) => void;
}

export function OrdersBasicDetailsAccordion({
    orders,
    activeOrderId,
    onOpenOrder,
}: OrdersBasicDetailsAccordionProps) {
    if (orders.length === 0) {
        return <BasicDetailsSection woBasicDetailId={activeOrderId} />;
    }

    if (orders.length === 1) {
        return <BasicDetailsSection woBasicDetailId={orders[0].id} />;
    }

    return (
        <Accordion
            key={activeOrderId}
            type="multiple"
            defaultValue={[String(activeOrderId)]}
            className="w-full overflow-hidden rounded-lg border bg-card"
        >
            {orders.map((order, index) => (
                <AccordionItem
                    key={order.id}
                    value={String(order.id)}
                    className="border-b px-4 last:border-b-0"
                >
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex min-w-0 flex-1 flex-col gap-1 text-left sm:flex-row sm:items-center sm:gap-3">
                            <span className="flex shrink-0 items-center gap-2 text-sm font-semibold">
                                Order {index + 1}
                                {order.orderType !== "single" && order.orderSequence ? (
                                    <Badge variant="default">
                                        {order.orderType === "repeat" ? "R" : "P"}{order.orderSequence}
                                    </Badge>
                                ) : null}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                                {order.woNumber || "No WO number"} · {order.projectName || "Unnamed project"}
                            </span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                        <BasicDetailsSection woBasicDetailId={order.id} />
                        <div className="flex justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={order.id === activeOrderId}
                                onClick={() => onOpenOrder(order.id)}
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                {order.id === activeOrderId ? "Currently viewing" : "Open this order"}
                            </Button>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}

export default OrdersBasicDetailsAccordion;
