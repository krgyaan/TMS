import React from "react";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { useAllPurchaseOrders, usePurchaseOrderApprovalCounts } from "@/hooks/api/usePurchaseOrders";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { useLocation } from "react-router-dom";
import PurchaseOrderListPage from "./PurchaseOrderListPage";

type PoApprovalTab = "pending" | "approved" | "rejected";

const TABS: { key: PoApprovalTab; label: string; icon: React.ReactNode; status: string | undefined }[] = [
    { key: "pending", label: "Pending", icon: <Clock className="h-4 w-4" />, status: "pending" },
    { key: "approved", label: "Approved", icon: <CheckCircle className="h-4 w-4" />, status: "approved" },
    { key: "rejected", label: "Rejected", icon: <XCircle className="h-4 w-4" />, status: "rejected" },
];

const PurchaseOrderTabsPage: React.FC = () => {
    const location = useLocation();
    const { teamId } = useTeamFilter();
    const isOperationsSection = location.pathname.includes("/operations/");
    const effectiveTeamId = isOperationsSection ? teamId : undefined;

    const { activeTab, setActiveTab } = usePersistentTableState<PoApprovalTab>({
        storageKey: "purchase-orders",
        defaultTab: "pending",
    });

    const currentTab = TABS.find((t) => t.key === activeTab) ?? TABS[0];

    const { data: counts } = usePurchaseOrderApprovalCounts(effectiveTeamId ?? undefined);
    const { data: poData } = useAllPurchaseOrders(effectiveTeamId ?? undefined, currentTab.status);

    const purchaseOrders = poData?.purchaseOrders ?? [];

    return (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PoApprovalTab)}>
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
                            {counts?.[tab.key] ?? 0}
                        </Badge>
                    </TabsTrigger>
                ))}
            </TabsList>
            {TABS.map((tab) => (
                <TabsContent key={tab.key} value={tab.key} className="m-0 data-[state=inactive]:hidden">
                    {activeTab === tab.key && (
                        <PurchaseOrderListPage
                            purchaseOrders={purchaseOrders}
                            showApprovalAction={tab.key === "pending"}
                        />
                    )}
                </TabsContent>
            ))}
        </Tabs>
    );
};

export default PurchaseOrderTabsPage;
