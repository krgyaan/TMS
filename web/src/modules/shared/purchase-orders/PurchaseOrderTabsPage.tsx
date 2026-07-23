import React, { useMemo } from "react";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { useAllPurchaseOrders } from "@/hooks/api/usePurchaseOrders";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { useLocation } from "react-router-dom";
import PurchaseOrderListPage from "./PurchaseOrderListPage";
import type { PurchaseOrderRow } from "@/modules/operations/purchase-orders/helpers/purchaseOrder.types";

const TABS = [
    { key: "pending" as const, label: "Pending", icon: <Clock className="h-4 w-4" />, filter: (po: PurchaseOrderRow) => po.poApproved === null || po.poApproved === undefined },
    { key: "approved" as const, label: "Approved", icon: <CheckCircle className="h-4 w-4" />, filter: (po: PurchaseOrderRow) => po.poApproved === true },
    { key: "rejected" as const, label: "Rejected", icon: <XCircle className="h-4 w-4" />, filter: (po: PurchaseOrderRow) => po.poApproved === false },
];

type TabKey = (typeof TABS)[number]["key"];

const PurchaseOrderTabsPage: React.FC = () => {
    const location = useLocation();
    const { teamId } = useTeamFilter();
    const isOperationsSection = location.pathname.includes("/operations/");
    const effectiveTeamId = isOperationsSection ? teamId : undefined;
    const { activeTab, setActiveTab } = usePersistentTableState<TabKey>({
        storageKey: "purchase-orders",
        defaultTab: "pending",
    });

    const { data: poData } = useAllPurchaseOrders(effectiveTeamId ?? undefined);
    const allPurchaseOrders = poData?.purchaseOrders ?? [];

    const filteredByTab = useMemo(() => {
        const result: Record<TabKey, PurchaseOrderRow[]> = {
            pending: [],
            approved: [],
            rejected: [],
        };
        for (const tab of TABS) {
            result[tab.key] = allPurchaseOrders.filter(tab.filter);
        }
        return result;
    }, [allPurchaseOrders]);

    return (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
            <TabsList className="m-auto mb-4">
                {TABS.map((tab) => (
                    <TabsTrigger
                        key={tab.key}
                        value={tab.key}
                        className="data-[state=active]:shadow-md flex items-center gap-1"
                    >
                        {tab.icon}
                        <span className="font-semibold text-sm">{tab.label}</span>
                        <Badge variant="secondary" className="text-xs">
                            {filteredByTab[tab.key].length}
                        </Badge>
                    </TabsTrigger>
                ))}
            </TabsList>
            {TABS.map((tab) => (
                <TabsContent key={tab.key} value={tab.key}>
                    <PurchaseOrderListPage
                        purchaseOrders={filteredByTab[tab.key]}
                        showApprovalAction={tab.key === "pending"}
                    />
                </TabsContent>
            ))}
        </Tabs>
    );
};

export default PurchaseOrderTabsPage;
