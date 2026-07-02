import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { useAllPaymentRequests } from "@/hooks/api/useProjectPaymentRequests";
import { useMakerRequests } from "@/hooks/api/useMakerRequests";
import PaymentRequestListPage from "./PaymentRequestListPage";
import MakerRequestListPage from "./MakerRequestListPage";

const TABS = [
    { key: "project-pr" as const, name: "Project Payment Requests" },
    { key: "maker-requests" as const, name: "Maker Requests" },
];

type TabKey = (typeof TABS)[number]["key"];

const PaymentRequestTabsPage: React.FC = () => {
    const { activeTab, setActiveTab } = usePersistentTableState<TabKey>({
        storageKey: "payment-requests",
        defaultTab: "project-pr",
    });

    const { data: prData } = useAllPaymentRequests();
    const { data: mrData } = useMakerRequests();

    const prCount = (prData ?? []).length;
    const mrCount = (mrData ?? []).length;

    const tabCounts: Record<TabKey, number> = {
        "project-pr": prCount,
        "maker-requests": mrCount,
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
            <TabsContent value="project-pr">
                <PaymentRequestListPage />
            </TabsContent>
            <TabsContent value="maker-requests">
                <MakerRequestListPage />
            </TabsContent>
        </Tabs>
    );
};

export default PaymentRequestTabsPage;
