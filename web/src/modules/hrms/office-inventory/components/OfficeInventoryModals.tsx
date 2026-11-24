import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    APPLIANCE_CLEANING_FREQUENCIES,
    APPLIANCE_CLEANING_TYPES,
    APPLIANCE_SERVICE_FREQUENCIES,
    APPLIANCE_STATUSES,
    APPLIANCE_VISIT_TYPES,
    EQUIPMENT_CATEGORIES,
    EQUIPMENT_CONDITIONS,
    EQUIPMENT_MOVEMENT_TYPES,
    ITEM_CATEGORIES,
    type ApplianceCleaningFrequency,
    type ApplianceCleaningType,
    type ApplianceServiceFrequency,
    type ApplianceStatus,
    type ApplianceVisitType,
    type EquipmentCategory,
    type EquipmentCondition,
    type EquipmentMovementType,
    type ItemCategory,
    type OfficeAppliance,
    type OfficeApplianceCleaning,
    type OfficeApplianceService,
    type OfficeEquipment,
    type OfficeEquipmentLog,
    type OfficeInventoryConsumption,
    type OfficeInventoryItem,
    type OfficeInventoryPurchase,
} from "../types";
import { officeInventoryApi } from "../officeInventory.service";
import { formatCurrency, formatQty, todayIso } from "../utils";

export type ModalState =
    | { type: "closed" }
    | { type: "item"; editing?: OfficeInventoryItem }
    | { type: "item-detail"; item: OfficeInventoryItem }
    | { type: "purchase"; editing?: OfficeInventoryPurchase; presetItemId?: number }
    | { type: "consumption"; editing?: OfficeInventoryConsumption; presetItemId?: number }
    | { type: "equipment"; editing?: OfficeEquipment }
    | { type: "equipment-log"; editing?: OfficeEquipmentLog }
    | { type: "appliance"; editing?: OfficeAppliance }
    | { type: "appliance-service"; editing?: OfficeApplianceService }
    | { type: "appliance-cleaning"; editing?: OfficeApplianceCleaning };

interface ModalsProps {
    modal: ModalState;
    onClose: () => void;
    items: OfficeInventoryItem[];
    equipment: OfficeEquipment[];
    appliances: OfficeAppliance[];
    mutations: ReturnType<typeof import("../useOfficeInventory").useOfficeInventoryMutations>;
}

export function OfficeInventoryModals({
    modal,
    onClose,
    items,
    equipment,
    appliances,
    mutations,
}: ModalsProps) {
    // --- Item form ---
    const [itemCategory, setItemCategory] = useState<ItemCategory>("Housekeeping");
    const [itemCode, setItemCode] = useState("");
    const [itemName, setItemName] = useState("");
    const [itemUnit, setItemUnit] = useState("Piece");
    const [itemMinStock, setItemMinStock] = useState("0");
    const [itemOpening, setItemOpening] = useState("0");

    // --- Purchase form ---
    const [pDate, setPDate] = useState(todayIso());
    const [pItemId, setPItemId] = useState("");
    const [pQty, setPQty] = useState("");
    const [pRate, setPRate] = useState("");
    const [pSupplier, setPSupplier] = useState("");
    const [pNotes, setPNotes] = useState("");

    // --- Consumption form ---
    const [cDate, setCDate] = useState(todayIso());
    const [cItemId, setCItemId] = useState("");
    const [cQty, setCQty] = useState("");
    const [cIssuedTo, setCIssuedTo] = useState("");
    const [cNotes, setCNotes] = useState("");

    // --- Equipment form ---
    const [eqCategory, setEqCategory] = useState<EquipmentCategory>("Housekeeping");
    const [eqCode, setEqCode] = useState("");
    const [eqName, setEqName] = useState("");
    const [eqUnit, setEqUnit] = useState("Piece");
    const [eqLocation, setEqLocation] = useState("");
    const [eqOpening, setEqOpening] = useState("0");
    const [eqUnitCost, setEqUnitCost] = useState("0");
    const [eqCondition, setEqCondition] = useState<EquipmentCondition>("Good");
    const [eqRemarks, setEqRemarks] = useState("");

    // --- Equipment Log form ---
    const [elDate, setElDate] = useState(todayIso());
    const [elEqId, setElEqId] = useState("");
    const [elType, setElType] = useState<EquipmentMovementType>("New Purchase");
    const [elQty, setElQty] = useState("");
    const [elCost, setElCost] = useState("");
    const [elReason, setElReason] = useState("");
    const [elApprovedBy, setElApprovedBy] = useState("");

    // --- Appliance form ---
    const [apCode, setApCode] = useState("");
    const [apName, setApName] = useState("");
    const [apBrand, setApBrand] = useState("");
    const [apLocation, setApLocation] = useState("Pantry");
    const [apPurchaseDate, setApPurchaseDate] = useState("");
    const [apPurchaseCost, setApPurchaseCost] = useState("");
    const [apWarranty, setApWarranty] = useState("");
    const [apServiceFreq, setApServiceFreq] = useState<ApplianceServiceFrequency>("Quarterly");
    const [apCleaningFreq, setApCleaningFreq] = useState<ApplianceCleaningFrequency>("Weekly");
    const [apStatus, setApStatus] = useState<ApplianceStatus>("In Service");
    const [apDiscardDate, setApDiscardDate] = useState("");
    const [apNotes, setApNotes] = useState("");

    // --- Service Visit form ---
    const [svDate, setSvDate] = useState(todayIso());
    const [svAppId, setSvAppId] = useState("");
    const [svType, setSvType] = useState<ApplianceVisitType>("Routine Service");
    const [svVendor, setSvVendor] = useState("");
    const [svExpense, setSvExpense] = useState("0");
    const [svNextDue, setSvNextDue] = useState("");
    const [svNotes, setSvNotes] = useState("");

    // --- Cleaning Log form ---
    const [clDate, setClDate] = useState(todayIso());
    const [clAppId, setClAppId] = useState("");
    const [clType, setClType] = useState<ApplianceCleaningType>("Routine Cleaning");
    const [clDoneBy, setClDoneBy] = useState("");
    const [clCost, setClCost] = useState("0");
    const [clNotes, setClNotes] = useState("");

    useEffect(() => {
        if (modal.type === "item") {
            const e = modal.editing;
            if (e) {
                setItemCategory(e.category);
                setItemCode(e.itemCode);
                setItemName(e.itemName);
                setItemUnit(e.unit);
                setItemMinStock(String(e.minStockLevel));
                setItemOpening(String(e.openingStock));
            } else {
                setItemCategory("Housekeeping");
                setItemCode("");
                setItemName("");
                setItemUnit("Piece");
                setItemMinStock("0");
                setItemOpening("0");
                officeInventoryApi
                    .getNextItemCode("Housekeeping")
                    .then(r => setItemCode(r.code))
                    .catch(() => {});
            }
        } else if (modal.type === "purchase") {
            const e = modal.editing;
            setPDate(e?.purchaseDate?.slice(0, 10) || todayIso());
            setPItemId(
                e
                    ? String(e.itemId)
                    : modal.presetItemId
                      ? String(modal.presetItemId)
                      : items[0]
                        ? String(items[0].id)
                        : ""
            );
            setPQty(e ? String(e.qtyPurchased) : "");
            setPRate(e ? String(e.rate) : "");
            setPSupplier(e?.supplier || "");
            setPNotes(e?.notes || "");
        } else if (modal.type === "consumption") {
            const e = modal.editing;
            setCDate(e?.consumptionDate?.slice(0, 10) || todayIso());
            setCItemId(
                e
                    ? String(e.itemId)
                    : modal.presetItemId
                      ? String(modal.presetItemId)
                      : items[0]
                        ? String(items[0].id)
                        : ""
            );
            setCQty(e ? String(e.qtyIssued) : "");
            setCIssuedTo(e?.issuedTo || "");
            setCNotes(e?.notes || "");
        } else if (modal.type === "equipment") {
            const e = modal.editing;
            if (e) {
                setEqCategory(e.category);
                setEqCode(e.equipmentCode);
                setEqName(e.itemName);
                setEqUnit(e.unit);
                setEqLocation(e.location || "");
                setEqOpening(String(e.openingQty));
                setEqUnitCost(String(e.unitCost));
                setEqCondition(e.condition);
                setEqRemarks(e.remarks || "");
            } else {
                setEqCategory("Housekeeping");
                setEqCode("");
                setEqName("");
                setEqUnit("Piece");
                setEqLocation("");
                setEqOpening("0");
                setEqUnitCost("0");
                setEqCondition("Good");
                setEqRemarks("");
                officeInventoryApi
                    .getNextEquipmentCode("Housekeeping")
                    .then(r => setEqCode(r.code))
                    .catch(() => {});
            }
        } else if (modal.type === "equipment-log") {
            const e = modal.editing;
            setElDate(e?.logDate?.slice(0, 10) || todayIso());
            setElEqId(e ? String(e.equipmentId) : equipment[0] ? String(equipment[0].id) : "");
            setElType(e?.movementType || "New Purchase");
            setElQty(e ? String(e.qty) : "");
            setElCost(e?.cost !== null && e?.cost !== undefined ? String(e.cost) : "");
            setElReason(e?.reasonNotes || "");
            setElApprovedBy(e?.approvedBy || "");
        } else if (modal.type === "appliance") {
            const e = modal.editing;
            if (e) {
                setApCode(e.applianceCode);
                setApName(e.applianceName);
                setApBrand(e.brandModel || "");
                setApLocation(e.location || "");
                setApPurchaseDate(e.purchaseDate?.slice(0, 10) || "");
                setApPurchaseCost(e.purchaseCost !== null ? String(e.purchaseCost) : "");
                setApWarranty(e.warrantyExpiry?.slice(0, 10) || "");
                setApServiceFreq(e.serviceFrequency);
                setApCleaningFreq(e.cleaningFrequency);
                setApStatus(e.status);
                setApDiscardDate(e.discardDate?.slice(0, 10) || "");
                setApNotes(e.notes || "");
            } else {
                setApCode("");
                setApName("");
                setApBrand("");
                setApLocation("Pantry");
                setApPurchaseDate("");
                setApPurchaseCost("");
                setApWarranty("");
                setApServiceFreq("Quarterly");
                setApCleaningFreq("Weekly");
                setApStatus("In Service");
                setApDiscardDate("");
                setApNotes("");
                officeInventoryApi
                    .getNextApplianceCode()
                    .then(r => setApCode(r.code))
                    .catch(() => {});
            }
        } else if (modal.type === "appliance-service") {
            const e = modal.editing;
            setSvDate(e?.serviceDate?.slice(0, 10) || todayIso());
            setSvAppId(e ? String(e.applianceId) : appliances[0] ? String(appliances[0].id) : "");
            setSvType(e?.visitType || "Routine Service");
            setSvVendor(e?.vendorTechnician || "");
            setSvExpense(e ? String(e.expense) : "0");
            setSvNextDue(e?.nextServiceDue?.slice(0, 10) || "");
            setSvNotes(e?.notes || "");
        } else if (modal.type === "appliance-cleaning") {
            const e = modal.editing;
            setClDate(e?.cleaningDate?.slice(0, 10) || todayIso());
            setClAppId(e ? String(e.applianceId) : appliances[0] ? String(appliances[0].id) : "");
            setClType(e?.cleaningType || "Routine Cleaning");
            setClDoneBy(e?.doneBy || "");
            setClCost(e ? String(e.cost) : "0");
            setClNotes(e?.notes || "");
        }
    }, [modal, items, equipment, appliances]);

    const handleItemCategoryChange = (next: ItemCategory) => {
        setItemCategory(next);
        if (modal.type === "item" && !modal.editing) {
            officeInventoryApi
                .getNextItemCode(next)
                .then(r => setItemCode(r.code))
                .catch(() => {});
        }
    };

    const handleEqCategoryChange = (next: EquipmentCategory) => {
        setEqCategory(next);
        if (modal.type === "equipment" && !modal.editing) {
            officeInventoryApi
                .getNextEquipmentCode(next)
                .then(r => setEqCode(r.code))
                .catch(() => {});
        }
    };

    const selectedConsumeItem = items.find(i => String(i.id) === cItemId);
    const purchaseAmountPreview = (Number(pQty) || 0) * (Number(pRate) || 0);

    return (
        <>
            {/* 1. ITEM ADD / EDIT */}
            <Dialog open={modal.type === "item"} onOpenChange={open => !open && onClose()}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {modal.type === "item" && modal.editing
                                ? `Edit Item (${modal.editing.itemCode})`
                                : "Add Inventory Item"}
                        </DialogTitle>
                        <DialogDescription>
                            Item code follows HK / PN / ST numbering automatically and can be
                            customized.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={async e => {
                            e.preventDefault();
                            const payload = {
                                category: itemCategory,
                                itemCode: itemCode.trim() || undefined,
                                itemName: itemName.trim(),
                                unit: itemUnit.trim(),
                                minStockLevel: Number(itemMinStock) || 0,
                                openingStock: Number(itemOpening) || 0,
                            };
                            if (modal.type === "item" && modal.editing) {
                                await mutations.updateItem.mutateAsync({
                                    id: modal.editing.id,
                                    data: payload,
                                });
                            } else {
                                await mutations.createItem.mutateAsync(payload);
                            }
                            onClose();
                        }}
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Category *</Label>
                                <Select
                                    value={itemCategory}
                                    onValueChange={v => handleItemCategoryChange(v as ItemCategory)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ITEM_CATEGORIES.map(c => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Item Code *</Label>
                                <Input
                                    className="font-mono"
                                    value={itemCode}
                                    onChange={e => setItemCode(e.target.value)}
                                    placeholder="HK-001"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2 space-y-1">
                                <Label>Item Name *</Label>
                                <Input
                                    value={itemName}
                                    onChange={e => setItemName(e.target.value)}
                                    placeholder="e.g. Floor Cleaner (5L)"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Unit *</Label>
                                <Input
                                    value={itemUnit}
                                    onChange={e => setItemUnit(e.target.value)}
                                    placeholder="Bottle / Packet"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Minimum Stock Level</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={itemMinStock}
                                    onChange={e => setItemMinStock(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Opening Stock</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={itemOpening}
                                    onChange={e => setItemOpening(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    mutations.createItem.isPending || mutations.updateItem.isPending
                                }
                            >
                                {modal.type === "item" && modal.editing
                                    ? "Save Changes"
                                    : "Add Item"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 1b. ITEM DETAIL VIEW */}
            <Dialog open={modal.type === "item-detail"} onOpenChange={open => !open && onClose()}>
                <DialogContent className="sm:max-w-md">
                    {modal.type === "item-detail" && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{modal.item.itemName}</DialogTitle>
                                <DialogDescription className="font-mono">
                                    {modal.item.itemCode} · {modal.item.category}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-md border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">
                                        Current Stock
                                    </div>
                                    <div className="mt-0.5 text-lg font-bold tabular-nums">
                                        {formatQty(modal.item.currentStock)} {modal.item.unit}
                                    </div>
                                </div>
                                <div className="rounded-md border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">Status</div>
                                    <div className="mt-1">
                                        <Badge
                                            variant={
                                                modal.item.status === "LOW STOCK"
                                                    ? "destructive"
                                                    : "secondary"
                                            }
                                        >
                                            {modal.item.status}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="rounded-md border p-2.5">
                                    <div className="text-xs text-muted-foreground">
                                        Opening Stock
                                    </div>
                                    <div className="font-semibold tabular-nums">
                                        {formatQty(modal.item.openingStock)}
                                    </div>
                                </div>
                                <div className="rounded-md border p-2.5">
                                    <div className="text-xs text-muted-foreground">
                                        Min Stock Level
                                    </div>
                                    <div className="font-semibold tabular-nums">
                                        {formatQty(modal.item.minStockLevel)}
                                    </div>
                                </div>
                                <div className="rounded-md border p-2.5">
                                    <div className="text-xs text-muted-foreground">
                                        Total Purchased
                                    </div>
                                    <div className="font-semibold tabular-nums">
                                        +{formatQty(modal.item.totalPurchased)}
                                    </div>
                                </div>
                                <div className="rounded-md border p-2.5">
                                    <div className="text-xs text-muted-foreground">
                                        Total Consumed
                                    </div>
                                    <div className="font-semibold tabular-nums">
                                        -{formatQty(modal.item.totalConsumed)}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={onClose}>Close</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* 2. PURCHASE ADD / EDIT */}
            <Dialog open={modal.type === "purchase"} onOpenChange={open => !open && onClose()}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {modal.type === "purchase" && modal.editing
                                ? "Edit Purchase Entry"
                                : "Log Purchase"}
                        </DialogTitle>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={async e => {
                            e.preventDefault();
                            if (!pItemId) return;
                            const payload = {
                                purchaseDate: pDate,
                                itemId: Number(pItemId),
                                qtyPurchased: Number(pQty),
                                rate: Number(pRate) || 0,
                                supplier: pSupplier.trim() || null,
                                notes: pNotes.trim() || null,
                            };
                            if (modal.type === "purchase" && modal.editing) {
                                await mutations.updatePurchase.mutateAsync({
                                    id: modal.editing.id,
                                    data: payload,
                                });
                            } else {
                                await mutations.createPurchase.mutateAsync(payload);
                            }
                            onClose();
                        }}
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Date *</Label>
                                <Input
                                    type="date"
                                    value={pDate}
                                    onChange={e => setPDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Item *</Label>
                                <Select value={pItemId} onValueChange={setPItemId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select item..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {items.map(i => (
                                            <SelectItem key={i.id} value={String(i.id)}>
                                                {i.itemCode} — {i.itemName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label>Qty Purchased *</Label>
                                <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={pQty}
                                    onChange={e => setPQty(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Rate (₹) *</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={pRate}
                                    onChange={e => setPRate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Amount (Auto)</Label>
                                <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-semibold tabular-nums">
                                    {formatCurrency(purchaseAmountPreview)}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Supplier / Vendor</Label>
                            <Input
                                value={pSupplier}
                                onChange={e => setPSupplier(e.target.value)}
                                placeholder="e.g. CleanKart Supplies"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Notes</Label>
                            <Textarea
                                rows={2}
                                value={pNotes}
                                onChange={e => setPNotes(e.target.value)}
                                placeholder="Invoice no. or remarks"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    !pItemId ||
                                    mutations.createPurchase.isPending ||
                                    mutations.updatePurchase.isPending
                                }
                            >
                                {modal.type === "purchase" && modal.editing
                                    ? "Save Changes"
                                    : "Log Purchase"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 3. CONSUMPTION ADD / EDIT */}
            <Dialog open={modal.type === "consumption"} onOpenChange={open => !open && onClose()}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {modal.type === "consumption" && modal.editing
                                ? "Edit Consumption Entry"
                                : "Log Consumption / Issue"}
                        </DialogTitle>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={async e => {
                            e.preventDefault();
                            if (!cItemId) return;
                            const payload = {
                                consumptionDate: cDate,
                                itemId: Number(cItemId),
                                qtyIssued: Number(cQty),
                                issuedTo: cIssuedTo.trim() || null,
                                notes: cNotes.trim() || null,
                            };
                            if (modal.type === "consumption" && modal.editing) {
                                await mutations.updateConsumption.mutateAsync({
                                    id: modal.editing.id,
                                    data: payload,
                                });
                            } else {
                                await mutations.createConsumption.mutateAsync(payload);
                            }
                            onClose();
                        }}
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Date *</Label>
                                <Input
                                    type="date"
                                    value={cDate}
                                    onChange={e => setCDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Item *</Label>
                                <Select value={cItemId} onValueChange={setCItemId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select item..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {items.map(i => (
                                            <SelectItem key={i.id} value={String(i.id)}>
                                                {i.itemCode} — {i.itemName} (Stock:{" "}
                                                {formatQty(i.currentStock)})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>
                                    Qty Issued *{" "}
                                    {selectedConsumeItem && (
                                        <span className="text-xs font-normal text-muted-foreground">
                                            (Avail: {formatQty(selectedConsumeItem.currentStock)}{" "}
                                            {selectedConsumeItem.unit})
                                        </span>
                                    )}
                                </Label>
                                <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={cQty}
                                    onChange={e => setCQty(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Issued To / Department</Label>
                                <Input
                                    value={cIssuedTo}
                                    onChange={e => setCIssuedTo(e.target.value)}
                                    placeholder="e.g. Pantry / Admin / Housekeeping"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Notes</Label>
                            <Textarea
                                rows={2}
                                value={cNotes}
                                onChange={e => setCNotes(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    !cItemId ||
                                    mutations.createConsumption.isPending ||
                                    mutations.updateConsumption.isPending
                                }
                            >
                                {modal.type === "consumption" && modal.editing
                                    ? "Save Changes"
                                    : "Log Consumption"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 4. EQUIPMENT ADD / EDIT */}
            <Dialog open={modal.type === "equipment"} onOpenChange={open => !open && onClose()}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {modal.type === "equipment" && modal.editing
                                ? `Edit Equipment (${modal.editing.equipmentCode})`
                                : "Add Equipment"}
                        </DialogTitle>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={async e => {
                            e.preventDefault();
                            const payload = {
                                category: eqCategory,
                                equipmentCode: eqCode.trim() || undefined,
                                itemName: eqName.trim(),
                                unit: eqUnit.trim(),
                                location: eqLocation.trim() || null,
                                openingQty: Number(eqOpening) || 0,
                                unitCost: Number(eqUnitCost) || 0,
                                condition: eqCondition,
                                remarks: eqRemarks.trim() || null,
                            };
                            if (modal.type === "equipment" && modal.editing) {
                                await mutations.updateEquipment.mutateAsync({
                                    id: modal.editing.id,
                                    data: payload,
                                });
                            } else {
                                await mutations.createEquipment.mutateAsync(payload);
                            }
                            onClose();
                        }}
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Category *</Label>
                                <Select
                                    value={eqCategory}
                                    onValueChange={v =>
                                        handleEqCategoryChange(v as EquipmentCategory)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EQUIPMENT_CATEGORIES.map(c => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Equipment Code *</Label>
                                <Input
                                    className="font-mono"
                                    value={eqCode}
                                    onChange={e => setEqCode(e.target.value)}
                                    placeholder="EQ-HK-001"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2 space-y-1">
                                <Label>Equipment Name *</Label>
                                <Input
                                    value={eqName}
                                    onChange={e => setEqName(e.target.value)}
                                    placeholder="e.g. Broom (Soft)"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Unit *</Label>
                                <Input
                                    value={eqUnit}
                                    onChange={e => setEqUnit(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Location</Label>
                                <Input
                                    value={eqLocation}
                                    onChange={e => setEqLocation(e.target.value)}
                                    placeholder="e.g. All Floors / Pantry"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Condition</Label>
                                <Select
                                    value={eqCondition}
                                    onValueChange={v => setEqCondition(v as EquipmentCondition)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EQUIPMENT_CONDITIONS.map(c => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Opening Qty</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={eqOpening}
                                    onChange={e => setEqOpening(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Unit Cost (₹)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={eqUnitCost}
                                    onChange={e => setEqUnitCost(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Remarks</Label>
                            <Textarea
                                rows={2}
                                value={eqRemarks}
                                onChange={e => setEqRemarks(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    mutations.createEquipment.isPending ||
                                    mutations.updateEquipment.isPending
                                }
                            >
                                {modal.type === "equipment" && modal.editing
                                    ? "Save Changes"
                                    : "Add Equipment"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 5. EQUIPMENT MOVEMENT LOG ADD / EDIT */}
            <Dialog open={modal.type === "equipment-log"} onOpenChange={open => !open && onClose()}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {modal.type === "equipment-log" && modal.editing
                                ? "Edit Equipment Movement"
                                : "Log Equipment Movement"}
                        </DialogTitle>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={async e => {
                            e.preventDefault();
                            if (!elEqId) return;
                            const payload = {
                                logDate: elDate,
                                equipmentId: Number(elEqId),
                                movementType: elType,
                                qty: Number(elQty),
                                cost: elCost === "" ? null : Number(elCost),
                                reasonNotes: elReason.trim() || null,
                                approvedBy: elApprovedBy.trim() || null,
                            };
                            if (modal.type === "equipment-log" && modal.editing) {
                                await mutations.updateEquipmentLog.mutateAsync({
                                    id: modal.editing.id,
                                    data: payload,
                                });
                            } else {
                                await mutations.createEquipmentLog.mutateAsync(payload);
                            }
                            onClose();
                        }}
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Date *</Label>
                                <Input
                                    type="date"
                                    value={elDate}
                                    onChange={e => setElDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Equipment *</Label>
                                <Select value={elEqId} onValueChange={setElEqId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select equipment..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {equipment.map(eq => (
                                            <SelectItem key={eq.id} value={String(eq.id)}>
                                                {eq.equipmentCode} — {eq.itemName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2 space-y-1">
                                <Label>Movement Type *</Label>
                                <Select
                                    value={elType}
                                    onValueChange={v => setElType(v as EquipmentMovementType)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EQUIPMENT_MOVEMENT_TYPES.map(t => (
                                            <SelectItem key={t} value={t}>
                                                {t}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Qty *</Label>
                                <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={elQty}
                                    onChange={e => setElQty(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Cost (₹)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={elCost}
                                    onChange={e => setElCost(e.target.value)}
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Approved By</Label>
                                <Input
                                    value={elApprovedBy}
                                    onChange={e => setElApprovedBy(e.target.value)}
                                    placeholder="e.g. Admin Head"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Reason / Notes</Label>
                            <Textarea
                                rows={2}
                                value={elReason}
                                onChange={e => setElReason(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    !elEqId ||
                                    mutations.createEquipmentLog.isPending ||
                                    mutations.updateEquipmentLog.isPending
                                }
                            >
                                {modal.type === "equipment-log" && modal.editing
                                    ? "Save Changes"
                                    : "Log Movement"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 6. APPLIANCE ADD / EDIT */}
            <Dialog open={modal.type === "appliance"} onOpenChange={open => !open && onClose()}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {modal.type === "appliance" && modal.editing
                                ? `Edit Appliance (${modal.editing.applianceCode})`
                                : "Add Pantry Appliance"}
                        </DialogTitle>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={async e => {
                            e.preventDefault();
                            const payload = {
                                applianceCode: apCode.trim() || undefined,
                                applianceName: apName.trim(),
                                brandModel: apBrand.trim() || null,
                                location: apLocation.trim() || null,
                                purchaseDate: apPurchaseDate || null,
                                purchaseCost: apPurchaseCost === "" ? null : Number(apPurchaseCost),
                                warrantyExpiry: apWarranty || null,
                                serviceFrequency: apServiceFreq,
                                cleaningFrequency: apCleaningFreq,
                                status: apStatus,
                                discardDate: apDiscardDate || null,
                                notes: apNotes.trim() || null,
                            };
                            if (modal.type === "appliance" && modal.editing) {
                                await mutations.updateAppliance.mutateAsync({
                                    id: modal.editing.id,
                                    data: payload,
                                });
                            } else {
                                await mutations.createAppliance.mutateAsync(payload);
                            }
                            onClose();
                        }}
                    >
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label>Appliance Code *</Label>
                                <Input
                                    className="font-mono"
                                    value={apCode}
                                    onChange={e => setApCode(e.target.value)}
                                    placeholder="AP-001"
                                    required
                                />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label>Appliance Name *</Label>
                                <Input
                                    value={apName}
                                    onChange={e => setApName(e.target.value)}
                                    placeholder="e.g. Refrigerator"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Brand / Model</Label>
                                <Input
                                    value={apBrand}
                                    onChange={e => setApBrand(e.target.value)}
                                    placeholder="e.g. Samsung 253L Double Door"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Location</Label>
                                <Input
                                    value={apLocation}
                                    onChange={e => setApLocation(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label>Purchase Date</Label>
                                <Input
                                    type="date"
                                    value={apPurchaseDate}
                                    onChange={e => setApPurchaseDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Purchase Cost (₹)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={apPurchaseCost}
                                    onChange={e => setApPurchaseCost(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Warranty / AMC Expiry</Label>
                                <Input
                                    type="date"
                                    value={apWarranty}
                                    onChange={e => setApWarranty(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label>Service Frequency</Label>
                                <Select
                                    value={apServiceFreq}
                                    onValueChange={v =>
                                        setApServiceFreq(v as ApplianceServiceFrequency)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {APPLIANCE_SERVICE_FREQUENCIES.map(f => (
                                            <SelectItem key={f} value={f}>
                                                {f}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Cleaning Frequency</Label>
                                <Select
                                    value={apCleaningFreq}
                                    onValueChange={v =>
                                        setApCleaningFreq(v as ApplianceCleaningFrequency)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {APPLIANCE_CLEANING_FREQUENCIES.map(f => (
                                            <SelectItem key={f} value={f}>
                                                {f}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Status</Label>
                                <Select
                                    value={apStatus}
                                    onValueChange={v => setApStatus(v as ApplianceStatus)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {APPLIANCE_STATUSES.map(s => (
                                            <SelectItem key={s} value={s}>
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {apStatus === "Discarded" && (
                            <div className="space-y-1">
                                <Label>Discard Date</Label>
                                <Input
                                    type="date"
                                    value={apDiscardDate}
                                    onChange={e => setApDiscardDate(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="space-y-1">
                            <Label>Notes</Label>
                            <Textarea
                                rows={2}
                                value={apNotes}
                                onChange={e => setApNotes(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    mutations.createAppliance.isPending ||
                                    mutations.updateAppliance.isPending
                                }
                            >
                                {modal.type === "appliance" && modal.editing
                                    ? "Save Changes"
                                    : "Add Appliance"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 7. APPLIANCE SERVICE VISIT ADD / EDIT */}
            <Dialog
                open={modal.type === "appliance-service"}
                onOpenChange={open => !open && onClose()}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {modal.type === "appliance-service" && modal.editing
                                ? "Edit Service Visit"
                                : "Log Service / Maintenance Visit"}
                        </DialogTitle>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={async e => {
                            e.preventDefault();
                            if (!svAppId) return;
                            const payload = {
                                serviceDate: svDate,
                                applianceId: Number(svAppId),
                                visitType: svType,
                                vendorTechnician: svVendor.trim() || null,
                                expense: Number(svExpense) || 0,
                                nextServiceDue: svNextDue || null,
                                notes: svNotes.trim() || null,
                            };
                            if (modal.type === "appliance-service" && modal.editing) {
                                await mutations.updateApplianceService.mutateAsync({
                                    id: modal.editing.id,
                                    data: payload,
                                });
                            } else {
                                await mutations.createApplianceService.mutateAsync(payload);
                            }
                            onClose();
                        }}
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Service Date *</Label>
                                <Input
                                    type="date"
                                    value={svDate}
                                    onChange={e => setSvDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Appliance *</Label>
                                <Select value={svAppId} onValueChange={setSvAppId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select appliance..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {appliances.map(a => (
                                            <SelectItem key={a.id} value={String(a.id)}>
                                                {a.applianceCode} — {a.applianceName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Visit Type *</Label>
                                <Select
                                    value={svType}
                                    onValueChange={v => setSvType(v as ApplianceVisitType)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {APPLIANCE_VISIT_TYPES.map(t => (
                                            <SelectItem key={t} value={t}>
                                                {t}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Vendor / Technician</Label>
                                <Input
                                    value={svVendor}
                                    onChange={e => setSvVendor(e.target.value)}
                                    placeholder="e.g. Kent Service Centre"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Expense (₹)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={svExpense}
                                    onChange={e => setSvExpense(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Next Service Due</Label>
                                <Input
                                    type="date"
                                    value={svNextDue}
                                    onChange={e => setSvNextDue(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Notes</Label>
                            <Textarea
                                rows={2}
                                value={svNotes}
                                onChange={e => setSvNotes(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    !svAppId ||
                                    mutations.createApplianceService.isPending ||
                                    mutations.updateApplianceService.isPending
                                }
                            >
                                {modal.type === "appliance-service" && modal.editing
                                    ? "Save Changes"
                                    : "Log Service Visit"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 8. APPLIANCE CLEANING LOG ADD / EDIT */}
            <Dialog
                open={modal.type === "appliance-cleaning"}
                onOpenChange={open => !open && onClose()}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {modal.type === "appliance-cleaning" && modal.editing
                                ? "Edit Cleaning Entry"
                                : "Log Appliance Cleaning"}
                        </DialogTitle>
                    </DialogHeader>
                    <form
                        className="space-y-4"
                        onSubmit={async e => {
                            e.preventDefault();
                            if (!clAppId) return;
                            const payload = {
                                cleaningDate: clDate,
                                applianceId: Number(clAppId),
                                cleaningType: clType,
                                doneBy: clDoneBy.trim() || null,
                                cost: Number(clCost) || 0,
                                notes: clNotes.trim() || null,
                            };
                            if (modal.type === "appliance-cleaning" && modal.editing) {
                                await mutations.updateApplianceCleaning.mutateAsync({
                                    id: modal.editing.id,
                                    data: payload,
                                });
                            } else {
                                await mutations.createApplianceCleaning.mutateAsync(payload);
                            }
                            onClose();
                        }}
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Cleaning Date *</Label>
                                <Input
                                    type="date"
                                    value={clDate}
                                    onChange={e => setClDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Appliance *</Label>
                                <Select value={clAppId} onValueChange={setClAppId}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select appliance..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {appliances.map(a => (
                                            <SelectItem key={a.id} value={String(a.id)}>
                                                {a.applianceCode} — {a.applianceName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Cleaning Type *</Label>
                                <Select
                                    value={clType}
                                    onValueChange={v => setClType(v as ApplianceCleaningType)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {APPLIANCE_CLEANING_TYPES.map(t => (
                                            <SelectItem key={t} value={t}>
                                                {t}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Done By</Label>
                                <Input
                                    value={clDoneBy}
                                    onChange={e => setClDoneBy(e.target.value)}
                                    placeholder="e.g. Pantry Boy / Housekeeping"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Cost (₹)</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={clCost}
                                onChange={e => setClCost(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Notes</Label>
                            <Textarea
                                rows={2}
                                value={clNotes}
                                onChange={e => setClNotes(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    !clAppId ||
                                    mutations.createApplianceCleaning.isPending ||
                                    mutations.updateApplianceCleaning.isPending
                                }
                            >
                                {modal.type === "appliance-cleaning" && modal.editing
                                    ? "Save Changes"
                                    : "Log Cleaning"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
