import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { useAllPurchaseOrders } from "@/hooks/api/useProjectDashboard";
import { useAllVendorWorkOrders } from "@/hooks/api/useVendorWorkOrders";
import PurchaseOrderListPage from "./PurchaseOrderListPage";
import VendorWorkOrderListPage from "@/modules/operations/vendor-work-orders/VendorWorkOrderListPage";

const TABS = [
    { key: "purchase-orders" as const, name: "Purchase Orders" },
    { key: "vendor-wo" as const, name: "Vendor Work Orders" },
];

type TabKey = (typeof TABS)[number]["key"];

const PurchaseOrderTabsPage: React.FC = () => {
    const { activeTab, setActiveTab } = usePersistentTableState<TabKey>({
        storageKey: "purchase-orders",
        defaultTab: "purchase-orders",
    });

    const { data: poData } = useAllPurchaseOrders();
    const { data: vwoData } = useAllVendorWorkOrders();

    const poCount = (poData?.purchaseOrders ?? []).length;
    const vwoCount = (vwoData ?? []).length;

    const tabCounts: Record<TabKey, number> = {
        "purchase-orders": poCount,
        "vendor-wo": vwoCount,
    };

    return (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
            <TabsList className="m-auto mb-4">
                {TABS.map((tab) => (
                    <TabsTrigger
                        key={tab.key}
                        value={tab.key}
                        className="data-[state=active]:shadow-md flex items-center gap-1"
                    >
                        <span className="font-semibold text-sm">{tab.name}</span>
                        <Badge variant="secondary" className="text-xs">
                            {tabCounts[tab.key]}
                        </Badge>
                    </TabsTrigger>
                ))}
            </TabsList>
            <TabsContent value="purchase-orders">
                <PurchaseOrderListPage />
            </TabsContent>
            <TabsContent value="vendor-wo">
                <VendorWorkOrderListPage />
            </TabsContent>
        </Tabs>
    );
};

export default PurchaseOrderTabsPage;
