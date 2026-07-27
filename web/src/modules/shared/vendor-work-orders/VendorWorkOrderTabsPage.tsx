import React from "react";
import { CheckCircle, Clock, Sparkles, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { useAllVendorWorkOrders, useVendorWorkOrderApprovalCounts } from "@/hooks/api/useVendorWorkOrders";
import { useLocation } from "react-router-dom";
import VendorWorkOrderListPage from "@/modules/operations/vendor-work-orders/VendorWorkOrderListPage";

type VwoTab = "pending" | "approved" | "rejected" | "new";

interface TabConfig {
    key: VwoTab;
    label: string;
    icon: React.ReactNode;
    status: string | undefined;
    showApproval: boolean;
}

const VendorWorkOrderTabsPage: React.FC = () => {
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
            { key: "new", label: "New", icon: <Sparkles className="h-4 w-4" />, status: undefined, showApproval: false },
            { key: "rejected", label: "Rejected", icon: <XCircle className="h-4 w-4" />, status: "rejected", showApproval: false },
          ];

    const defaultTab: VwoTab = isAccounts ? "pending" : "new";
    const storageKey = isAccounts ? "vendor-work-orders-accounts" : "vendor-work-orders-operations";

    const { activeTab, setActiveTab, search, setSearch } = usePersistentTableState<VwoTab>({
        storageKey,
        defaultTab,
    });

    const currentTab = tabsConfig.find((t) => t.key === activeTab) ?? tabsConfig[0];

    const { data: counts } = useVendorWorkOrderApprovalCounts(section);
    const { data: vwoData } = useAllVendorWorkOrders(currentTab.status, section);

    const workOrders = vwoData ?? [];

    return (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as VwoTab)}>
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
                        <VendorWorkOrderListPage
                            workOrders={workOrders}
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

export default VendorWorkOrderTabsPage;