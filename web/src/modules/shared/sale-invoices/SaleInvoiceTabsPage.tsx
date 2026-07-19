import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePersistentTableState } from "@/hooks/usePersistentTableState";
import { useAllSaleInvoices } from "@/hooks/api/useSaleInvoices";
import SaleInvoiceListPage from "./SaleInvoiceListPage";

type TabKey = "sale-invoices";

const SaleInvoiceTabsPage: React.FC = () => {
    const { activeTab, setActiveTab } = usePersistentTableState<TabKey>({
        storageKey: "sale-invoices",
        defaultTab: "sale-invoices",
    });

    const { data } = useAllSaleInvoices();
    const siCount = (data?.saleInvoices ?? []).length;

    return (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
            <TabsList className="m-auto mb-4">
                <TabsTrigger value="sale-invoices" className="data-[state=active]:shadow-md flex items-center gap-1">
                    <span className="font-semibold text-sm">Sale Invoices</span>
                    <Badge variant="secondary" className="text-xs">{siCount}</Badge>
                </TabsTrigger>
            </TabsList>
            <TabsContent value="sale-invoices">
                <SaleInvoiceListPage />
            </TabsContent>
        </Tabs>
    );
};

export default SaleInvoiceTabsPage;
