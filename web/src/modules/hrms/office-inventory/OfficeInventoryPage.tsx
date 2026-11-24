import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Plus, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    useOfficeApplianceCleanings,
    useOfficeAppliances,
    useOfficeApplianceServices,
    useOfficeConsumptions,
    useOfficeEquipment,
    useOfficeEquipmentLogs,
    useOfficeInventoryMutations,
    useOfficeItems,
    useOfficePurchases,
} from "./useOfficeInventory";
import { ItemMasterTab } from "./components/ItemMasterTab";
import { TransactionsTab } from "./components/TransactionsTab";
import { EquipmentTab } from "./components/EquipmentTab";
import { AppliancesTab } from "./components/AppliancesTab";
import { ReportsTab } from "./components/ReportsTab";
import { OfficeInventoryModals, type ModalState } from "./components/OfficeInventoryModals";
import { downloadCsv } from "./utils";

type MainTab = "item-master" | "transactions" | "equipment" | "appliances" | "reports";
const VALID_TABS: MainTab[] = ["item-master", "transactions", "equipment", "appliances", "reports"];

export default function OfficeInventoryPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const rawTab = searchParams.get("tab") as MainTab | null;
    const activeTab: MainTab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : "item-master";
    const rawSub = searchParams.get("sub");

    const txSubTab: "purchases" | "consumptions" =
        rawSub === "consumptions" ? "consumptions" : "purchases";
    const eqSubTab: "register" | "logs" = rawSub === "logs" ? "logs" : "register";
    const apSubTab: "register" | "services" | "cleanings" =
        rawSub === "services" || rawSub === "cleanings" ? rawSub : "register";
    const reportSubTab: "tasks" | "weekly" | "monthly" =
        rawSub === "weekly" || rawSub === "monthly" ? rawSub : "tasks";

    const setActiveTab = (next: MainTab) => {
        setSearchParams(
            prev => {
                const copy = new URLSearchParams(prev);
                copy.set("tab", next);
                copy.delete("sub");
                return copy;
            },
            { replace: true }
        );
    };

    const setSubTab = (nextSub: string) => {
        setSearchParams(
            prev => {
                const copy = new URLSearchParams(prev);
                copy.set("tab", activeTab);
                copy.set("sub", nextSub);
                return copy;
            },
            { replace: true }
        );
    };

    const [search, setSearch] = useState("");
    const [modal, setModal] = useState<ModalState>({ type: "closed" });

    // Only fetch data needed for the active tab (or open modal) to eliminate initial load buffering
    const needItems =
        activeTab === "item-master" ||
        activeTab === "transactions" ||
        modal.type === "purchase" ||
        modal.type === "consumption";
    const needPurchases = activeTab === "transactions" && txSubTab === "purchases";
    const needConsumptions = activeTab === "transactions" && txSubTab === "consumptions";
    const needEquipment = activeTab === "equipment" || modal.type === "equipment-log";
    const needEqLogs = activeTab === "equipment" && eqSubTab === "logs";
    const needAppliances =
        activeTab === "appliances" ||
        modal.type === "appliance-service" ||
        modal.type === "appliance-cleaning";
    const needServices = activeTab === "appliances" && apSubTab === "services";
    const needCleanings = activeTab === "appliances" && apSubTab === "cleanings";

    const { data: items = [], isLoading: itemsLoading, error: itemsError } =
        useOfficeItems(needItems);
    const { data: purchases = [], isLoading: purchasesLoading, error: purchasesError } =
        useOfficePurchases(needPurchases);
    const { data: consumptions = [], isLoading: consumptionsLoading, error: consumptionsError } =
        useOfficeConsumptions(needConsumptions);
    const { data: equipment = [], isLoading: equipmentLoading, error: equipmentError } =
        useOfficeEquipment(needEquipment);
    const { data: equipmentLogs = [], isLoading: eqLogsLoading, error: eqLogsError } =
        useOfficeEquipmentLogs(needEqLogs);
    const { data: appliances = [], isLoading: appliancesLoading, error: appliancesError } =
        useOfficeAppliances(needAppliances);
    const { data: applianceServices = [], isLoading: servicesLoading, error: servicesError } =
        useOfficeApplianceServices(needServices);
    const { data: applianceCleanings = [], isLoading: cleaningsLoading, error: cleaningsError } =
        useOfficeApplianceCleanings(needCleanings);

    const activeError =
        (activeTab === "item-master" && itemsError) ||
        (activeTab === "transactions" && (purchasesError || consumptionsError)) ||
        (activeTab === "equipment" && (equipmentError || eqLogsError)) ||
        (activeTab === "appliances" && (appliancesError || servicesError || cleaningsError)) ||
        null;

    const mutations = useOfficeInventoryMutations();

    const primaryAction = useMemo(() => {
        if (activeTab === "item-master") {
            return { label: "Add New Item", onClick: () => setModal({ type: "item" }) };
        }
        if (activeTab === "transactions") {
            return txSubTab === "purchases"
                ? { label: "Log Purchase", onClick: () => setModal({ type: "purchase" }) }
                : { label: "Log Consumption", onClick: () => setModal({ type: "consumption" }) };
        }
        if (activeTab === "equipment") {
            return eqSubTab === "register"
                ? { label: "Add Equipment", onClick: () => setModal({ type: "equipment" }) }
                : { label: "Log Movement", onClick: () => setModal({ type: "equipment-log" }) };
        }
        if (activeTab === "appliances") {
            if (apSubTab === "register") {
                return { label: "Add Appliance", onClick: () => setModal({ type: "appliance" }) };
            }
            if (apSubTab === "services") {
                return {
                    label: "Log Service Visit",
                    onClick: () => setModal({ type: "appliance-service" }),
                };
            }
            return {
                label: "Log Cleaning",
                onClick: () => setModal({ type: "appliance-cleaning" }),
            };
        }
        return null;
    }, [activeTab, txSubTab, eqSubTab, apSubTab]);

    const handleExportCsv = () => {
        if (activeTab === "item-master") {
            downloadCsv(
                "office-inventory-item-master.csv",
                [
                    "Category",
                    "Item Code",
                    "Item Name",
                    "Unit",
                    "Min Stock Level",
                    "Opening Stock",
                    "Total Purchased",
                    "Total Consumed",
                    "Current Stock",
                    "Status",
                ],
                items.map(i => [
                    i.category,
                    i.itemCode,
                    i.itemName,
                    i.unit,
                    i.minStockLevel,
                    i.openingStock,
                    i.totalPurchased,
                    i.totalConsumed,
                    i.currentStock,
                    i.status,
                ])
            );
            return;
        }
        if (activeTab === "transactions") {
            if (txSubTab === "purchases") {
                downloadCsv(
                    "office-inventory-purchases.csv",
                    [
                        "Date",
                        "Item Code",
                        "Item Name",
                        "Category",
                        "Qty Purchased",
                        "Rate (INR)",
                        "Amount (INR)",
                        "Supplier",
                        "Notes",
                    ],
                    purchases.map(p => [
                        p.purchaseDate,
                        p.itemCode,
                        p.itemName,
                        p.category,
                        p.qtyPurchased,
                        p.rate,
                        p.amount,
                        p.supplier,
                        p.notes,
                    ])
                );
            } else {
                downloadCsv(
                    "office-inventory-consumption.csv",
                    [
                        "Date",
                        "Item Code",
                        "Item Name",
                        "Category",
                        "Qty Issued",
                        "Issued To",
                        "Notes",
                    ],
                    consumptions.map(c => [
                        c.consumptionDate,
                        c.itemCode,
                        c.itemName,
                        c.category,
                        c.qtyIssued,
                        c.issuedTo,
                        c.notes,
                    ])
                );
            }
            return;
        }
        if (activeTab === "equipment") {
            if (eqSubTab === "register") {
                downloadCsv(
                    "office-equipment-register.csv",
                    [
                        "Category",
                        "Equipment Code",
                        "Item Name",
                        "Unit",
                        "Location",
                        "Opening Qty",
                        "Qty Added",
                        "Qty Discarded",
                        "Current Qty",
                        "Unit Cost (INR)",
                        "Condition",
                        "Remarks",
                    ],
                    equipment.map(e => [
                        e.category,
                        e.equipmentCode,
                        e.itemName,
                        e.unit,
                        e.location,
                        e.openingQty,
                        e.qtyAdded,
                        e.qtyDiscarded,
                        e.currentQty,
                        e.unitCost,
                        e.condition,
                        e.remarks,
                    ])
                );
            } else {
                downloadCsv(
                    "office-equipment-log.csv",
                    [
                        "Date",
                        "Equipment Code",
                        "Item Name",
                        "Movement Type",
                        "Qty",
                        "Cost (INR)",
                        "Reason",
                        "Approved By",
                    ],
                    equipmentLogs.map(l => [
                        l.logDate,
                        l.equipmentCode,
                        l.itemName,
                        l.movementType,
                        l.qty,
                        l.cost,
                        l.reasonNotes,
                        l.approvedBy,
                    ])
                );
            }
            return;
        }
        if (activeTab === "appliances") {
            if (apSubTab === "register") {
                downloadCsv(
                    "office-pantry-appliances.csv",
                    [
                        "Appliance Code",
                        "Appliance Name",
                        "Brand/Model",
                        "Location",
                        "Purchase Date",
                        "Purchase Cost",
                        "Warranty Expiry",
                        "Service Freq",
                        "Cleaning Freq",
                        "Status",
                        "Service Visits",
                        "Total Expense",
                        "Last Service",
                        "Cleanings",
                        "Last Cleaned",
                        "Next Cleaning Due",
                    ],
                    appliances.map(a => [
                        a.applianceCode,
                        a.applianceName,
                        a.brandModel,
                        a.location,
                        a.purchaseDate,
                        a.purchaseCost,
                        a.warrantyExpiry,
                        a.serviceFrequency,
                        a.cleaningFrequency,
                        a.status,
                        a.serviceVisitsCount,
                        a.totalMaintenanceExpense,
                        a.lastServiceDate,
                        a.cleaningsCount,
                        a.lastCleanedDate,
                        a.nextCleaningDue,
                    ])
                );
            } else if (apSubTab === "services") {
                downloadCsv(
                    "office-appliance-services.csv",
                    [
                        "Date",
                        "Appliance Code",
                        "Appliance Name",
                        "Visit Type",
                        "Vendor",
                        "Expense (INR)",
                        "Next Service Due",
                        "Notes",
                    ],
                    applianceServices.map(s => [
                        s.serviceDate,
                        s.applianceCode,
                        s.applianceName,
                        s.visitType,
                        s.vendorTechnician,
                        s.expense,
                        s.nextServiceDue,
                        s.notes,
                    ])
                );
            } else {
                downloadCsv(
                    "office-appliance-cleanings.csv",
                    [
                        "Date",
                        "Appliance Code",
                        "Appliance Name",
                        "Cleaning Type",
                        "Done By",
                        "Cost (INR)",
                        "Notes",
                    ],
                    applianceCleanings.map(c => [
                        c.cleaningDate,
                        c.applianceCode,
                        c.applianceName,
                        c.cleaningType,
                        c.doneBy,
                        c.cost,
                        c.notes,
                    ])
                );
            }
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Office Inventory Management</CardTitle>
                <CardDescription>
                    View and manage Housekeeping, Pantry, and Stationery stock, equipment
                    registers, appliance maintenance, and weekly tasks.
                </CardDescription>
                <CardAction>
                    <div className="flex items-center gap-2">
                        {activeTab !== "reports" && (
                            <Button variant="outline" onClick={handleExportCsv}>
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                            </Button>
                        )}
                        {primaryAction && (
                            <Button onClick={primaryAction.onClick}>
                                <Plus className="mr-2 h-4 w-4" />
                                {primaryAction.label}
                            </Button>
                        )}
                    </div>
                </CardAction>
            </CardHeader>

            <CardContent className="space-y-4">
                {activeError && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            Unable to load office inventory data:{" "}
                            {activeError instanceof Error ? activeError.message : "Request failed"}
                        </AlertDescription>
                    </Alert>
                )}
                <Tabs
                    value={activeTab}
                    onValueChange={v => setActiveTab(v as MainTab)}
                    className="w-full"
                >
                    <TabsList className="w-full justify-start overflow-x-auto">
                        <TabsTrigger value="item-master">Item Master</TabsTrigger>
                        <TabsTrigger value="transactions">Purchases &amp; Consumption</TabsTrigger>
                        <TabsTrigger value="equipment">Equipment Register</TabsTrigger>
                        <TabsTrigger value="appliances">Pantry Appliances</TabsTrigger>
                        <TabsTrigger value="reports">Weekly Tasks &amp; Reports</TabsTrigger>
                    </TabsList>

                    {activeTab !== "reports" && (
                        <div className="mt-3 w-full">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    className="h-11 w-full pl-9 md:h-10"
                                    placeholder="Search code, name, category, unit, supplier, or status..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <TabsContent value="item-master" className="mt-3">
                        <ItemMasterTab
                            items={items}
                            loading={itemsLoading}
                            search={search}
                            onEdit={item => setModal({ type: "item", editing: item })}
                            onDelete={item => {
                                if (
                                    window.confirm(
                                        `Delete item "${item.itemName}" (${item.itemCode})?`
                                    )
                                ) {
                                    mutations.deleteItem.mutate(item.id);
                                }
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="transactions" className="mt-3">
                        <TransactionsTab
                            subTab={txSubTab}
                            onSubTabChange={setSubTab}
                            purchases={purchases}
                            consumptions={consumptions}
                            loading={purchasesLoading || consumptionsLoading}
                            search={search}
                            onEditPurchase={row => setModal({ type: "purchase", editing: row })}
                            onDeletePurchase={row => {
                                if (
                                    window.confirm(
                                        `Delete purchase entry for ${row.itemCode} (${row.qtyPurchased} ${row.unit})?`
                                    )
                                ) {
                                    mutations.deletePurchase.mutate(row.id);
                                }
                            }}
                            onEditConsumption={row =>
                                setModal({ type: "consumption", editing: row })
                            }
                            onDeleteConsumption={row => {
                                if (
                                    window.confirm(
                                        `Delete consumption entry for ${row.itemCode} (${row.qtyIssued} ${row.unit})?`
                                    )
                                ) {
                                    mutations.deleteConsumption.mutate(row.id);
                                }
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="equipment" className="mt-3">
                        <EquipmentTab
                            subTab={eqSubTab}
                            onSubTabChange={setSubTab}
                            equipment={equipment}
                            logs={equipmentLogs}
                            loading={equipmentLoading || eqLogsLoading}
                            search={search}
                            onEditEquipment={row => setModal({ type: "equipment", editing: row })}
                            onDeleteEquipment={row => {
                                if (
                                    window.confirm(
                                        `Delete equipment "${row.itemName}" (${row.equipmentCode})?`
                                    )
                                ) {
                                    mutations.deleteEquipment.mutate(row.id);
                                }
                            }}
                            onEditLog={row => setModal({ type: "equipment-log", editing: row })}
                            onDeleteLog={row => {
                                if (
                                    window.confirm(
                                        `Delete equipment movement for ${row.equipmentCode}?`
                                    )
                                ) {
                                    mutations.deleteEquipmentLog.mutate(row.id);
                                }
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="appliances" className="mt-3">
                        <AppliancesTab
                            subTab={apSubTab}
                            onSubTabChange={setSubTab}
                            appliances={appliances}
                            services={applianceServices}
                            cleanings={applianceCleanings}
                            loading={appliancesLoading || servicesLoading || cleaningsLoading}
                            search={search}
                            onEditAppliance={row => setModal({ type: "appliance", editing: row })}
                            onDeleteAppliance={row => {
                                if (
                                    window.confirm(
                                        `Delete appliance "${row.applianceName}" (${row.applianceCode})?`
                                    )
                                ) {
                                    mutations.deleteAppliance.mutate(row.id);
                                }
                            }}
                            onEditService={row =>
                                setModal({ type: "appliance-service", editing: row })
                            }
                            onDeleteService={row => {
                                if (
                                    window.confirm(
                                        `Delete service visit for ${row.applianceCode}?`
                                    )
                                ) {
                                    mutations.deleteApplianceService.mutate(row.id);
                                }
                            }}
                            onEditCleaning={row =>
                                setModal({ type: "appliance-cleaning", editing: row })
                            }
                            onDeleteCleaning={row => {
                                if (
                                    window.confirm(
                                        `Delete cleaning log for ${row.applianceCode}?`
                                    )
                                ) {
                                    mutations.deleteApplianceCleaning.mutate(row.id);
                                }
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="reports" className="mt-3">
                        <ReportsTab subTab={reportSubTab} onSubTabChange={setSubTab} />
                    </TabsContent>
                </Tabs>

                <OfficeInventoryModals
                    modal={modal}
                    onClose={() => setModal({ type: "closed" })}
                    items={items}
                    equipment={equipment}
                    appliances={appliances}
                    mutations={mutations}
                />
            </CardContent>
        </Card>
    );
}
