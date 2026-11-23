import { useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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

const TABS: Array<{ id: MainTab; label: string }> = [
    { id: "item-master", label: "Item Master" },
    { id: "transactions", label: "Purchases & Consumption" },
    { id: "equipment", label: "Equipment Register" },
    { id: "appliances", label: "Pantry Appliances" },
    { id: "reports", label: "Weekly Tasks & Reports" },
];

export default function OfficeInventoryPage() {
    const [activeTab, setActiveTab] = useState<MainTab>("item-master");
    const [txSubTab, setTxSubTab] = useState<"purchases" | "consumptions">("purchases");
    const [eqSubTab, setEqSubTab] = useState<"register" | "logs">("register");
    const [apSubTab, setApSubTab] = useState<"register" | "services" | "cleanings">("register");
    const [search, setSearch] = useState("");
    const [modal, setModal] = useState<ModalState>({ type: "closed" });

    const { data: items = [], isLoading: itemsLoading } = useOfficeItems();
    const { data: purchases = [] } = useOfficePurchases();
    const { data: consumptions = [] } = useOfficeConsumptions();
    const { data: equipment = [] } = useOfficeEquipment();
    const { data: equipmentLogs = [] } = useOfficeEquipmentLogs();
    const { data: appliances = [] } = useOfficeAppliances();
    const { data: applianceServices = [] } = useOfficeApplianceServices();
    const { data: applianceCleanings = [] } = useOfficeApplianceCleanings();

    const mutations = useOfficeInventoryMutations();

    const primaryAction = useMemo(() => {
        if (activeTab === "item-master") {
            return { label: "Add Item", onClick: () => setModal({ type: "item" }) };
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
                    ["Date", "Item Code", "Item Name", "Category", "Qty Issued", "Issued To", "Notes"],
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
                    ["Date", "Equipment Code", "Item Name", "Movement Type", "Qty", "Cost (INR)", "Reason", "Approved By"],
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
                    ["Date", "Appliance Code", "Appliance Name", "Visit Type", "Vendor", "Expense (INR)", "Next Service Due", "Notes"],
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
                    ["Date", "Appliance Code", "Appliance Name", "Cleaning Type", "Done By", "Cost (INR)", "Notes"],
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
        <div className="mx-auto max-w-[1380px] px-4 pb-16 pt-4 sm:px-6">
            {/* Header */}
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-[#111827] sm:text-[24px]">
                        Office Inventory Management
                    </h1>
                    <p className="mt-1 text-[14px] text-[#6B7280]">
                        View and manage Housekeeping, Pantry, and Stationery stock, equipment
                        registers, appliance maintenance, and weekly tasks.
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                    {activeTab !== "reports" && (
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#E5E7EB] bg-white px-3.5 py-2 text-[13px] font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                        >
                            <Download className="h-4 w-4 text-[#6B7280]" />
                            Export CSV
                        </button>
                    )}
                    {primaryAction && (
                        <button
                            type="button"
                            onClick={primaryAction.onClick}
                            className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#111827] px-4 py-2 text-[13px] font-medium text-white shadow-xs transition hover:bg-[#1F2937]"
                        >
                            <Plus className="h-4 w-4" />
                            {primaryAction.label}
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mb-5 overflow-x-auto border-b border-[#E5E7EB]">
                <nav className="flex min-w-max items-center gap-6" aria-label="Inventory Sections">
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`whitespace-nowrap border-b-2 px-1 py-2.5 text-[14px] transition ${
                                    isActive
                                        ? "border-[#111827] font-semibold text-[#111827]"
                                        : "border-transparent font-medium text-[#6B7280] hover:text-[#111827]"
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Global Search Bar (for tabular tabs) */}
            {activeTab !== "reports" && (
                <div className="mb-5">
                    <div className="flex items-center rounded-[10px] border border-[#E5E7EB] bg-white px-4 py-2.5 shadow-2xs transition focus-within:border-[#9CA3AF]">
                        <Search className="mr-3 h-[18px] w-[18px] shrink-0 text-[#6B7280]" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search code, name, category, unit, supplier, or status..."
                            className="w-full bg-transparent text-[14px] text-[#111827] placeholder-[#6B7280] focus:outline-none"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="ml-2 rounded bg-[#F3F4F6] px-2 py-0.5 text-[12px] text-[#6B7280] hover:text-[#111827]"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Tab Content */}
            {itemsLoading && activeTab === "item-master" ? (
                <Skeleton className="h-96 w-full rounded-[10px]" />
            ) : activeTab === "item-master" ? (
                <ItemMasterTab
                    items={items}
                    search={search}
                    onView={item => setModal({ type: "item-detail", item })}
                    onEdit={item => setModal({ type: "item", editing: item })}
                    onQuickPurchase={item => setModal({ type: "purchase", presetItemId: item.id })}
                    onQuickConsume={item =>
                        setModal({ type: "consumption", presetItemId: item.id })
                    }
                    onDelete={item => {
                        if (window.confirm(`Delete item "${item.itemName}" (${item.itemCode})?`)) {
                            mutations.deleteItem.mutate(item.id);
                        }
                    }}
                />
            ) : activeTab === "transactions" ? (
                <TransactionsTab
                    subTab={txSubTab}
                    onSubTabChange={setTxSubTab}
                    purchases={purchases}
                    consumptions={consumptions}
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
                    onEditConsumption={row => setModal({ type: "consumption", editing: row })}
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
            ) : activeTab === "equipment" ? (
                <EquipmentTab
                    subTab={eqSubTab}
                    onSubTabChange={setEqSubTab}
                    equipment={equipment}
                    logs={equipmentLogs}
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
                        if (window.confirm(`Delete equipment movement for ${row.equipmentCode}?`)) {
                            mutations.deleteEquipmentLog.mutate(row.id);
                        }
                    }}
                />
            ) : activeTab === "appliances" ? (
                <AppliancesTab
                    subTab={apSubTab}
                    onSubTabChange={setApSubTab}
                    appliances={appliances}
                    services={applianceServices}
                    cleanings={applianceCleanings}
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
                    onEditService={row => setModal({ type: "appliance-service", editing: row })}
                    onDeleteService={row => {
                        if (window.confirm(`Delete service visit for ${row.applianceCode}?`)) {
                            mutations.deleteApplianceService.mutate(row.id);
                        }
                    }}
                    onEditCleaning={row => setModal({ type: "appliance-cleaning", editing: row })}
                    onDeleteCleaning={row => {
                        if (window.confirm(`Delete cleaning log for ${row.applianceCode}?`)) {
                            mutations.deleteApplianceCleaning.mutate(row.id);
                        }
                    }}
                />
            ) : (
                <ReportsTab />
            )}

            {/* Modals */}
            <OfficeInventoryModals
                modal={modal}
                onClose={() => setModal({ type: "closed" })}
                items={items}
                equipment={equipment}
                appliances={appliances}
                mutations={mutations}
            />
        </div>
    );
}
