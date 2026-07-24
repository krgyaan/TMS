import React from "react";
import { CheckCircle, Clock, Sparkles, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { useAllPurchaseOrders, usePurchaseOrderApprovalCounts } from "@/hooks/api/usePurchaseOrders";
import { useLocation } from "react-router-dom";
import PurchaseOrderListPage from "./PurchaseOrderListPage";

type PoTab = "pending" | "approved" | "rejected" | "new";

interface TabConfig {
    key: PoTab;
    label: string;
    icon: React.ReactNode;
    status: string | undefined;
    showApproval: boolean;
}

const PurchaseOrderTabsPage: React.FC = () => {
    const location = useLocation();
    const isAccountsSection = location.pathname.includes("/accounts/");
    const section = isAccountsSection ? "accounts" : "operations";

    const isAccounts = isAccountsSection;

    const tabsConfig: TabConfig[] = isAccounts
        ? [
            { key: "pending", label: "Pending", icon: <Clock className="h-4 w-4" />, status: "pending", showApproval: true },
            { key: "approved", label: "Approved", icon: <CheckCircle className="h-4 w-4" />, status: "approved", showApproval: false },
            { key: "rejected", label: "Rejected", icon: <XCircle className="h-4 w-4" />, status: "rejected", showApproval: false },
          ]
        : [
            { key: "new", label: "New", icon: <Sparkles className="h-4 w-4" />, status: "new", showApproval: false },
            { key: "rejected", label: "Rejected", icon: <XCircle className="h-4 w-4" />, status: "rejected", showApproval: false },
          ];

    const defaultTab: PoTab = isAccounts ? "pending" : "new";
    const storageKey = isAccounts ? "purchase-orders-accounts" : "purchase-orders-operations";

    const { activeTab, setActiveTab, search, setSearch } = usePersistentTableState<PoTab>({
        storageKey,
        defaultTab,
    });

    const currentTab = tabsConfig.find((t) => t.key === activeTab) ?? tabsConfig[0];

    const { data: counts } = usePurchaseOrderApprovalCounts(section);
    const { data: poData } = useAllPurchaseOrders(currentTab.status, section);

    const purchaseOrders = poData?.purchaseOrders ?? [];

    return (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PoTab)}>
            <TabsList className="m-auto mb-4">
                {tabsConfig.map((tab) => (
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
            {tabsConfig.map((tab) => (
                <TabsContent key={tab.key} value={tab.key} className="m-0 data-[state=inactive]:hidden">
                    {activeTab === tab.key && (
                        <PurchaseOrderListPage
                            purchaseOrders={purchaseOrders}
                            showApprovalAction={tab.showApproval}
                            search={search}
                            onSearchChange={setSearch}
                        />
                    )}
                </TabsContent>
            ))}
        </Tabs>
    );
};

export default PurchaseOrderTabsPage;