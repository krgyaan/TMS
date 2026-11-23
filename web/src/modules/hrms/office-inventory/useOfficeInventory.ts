import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { officeInventoryApi } from "./officeInventory.service";
import type {
    OfficeInventoryItemPayload,
    OfficeInventoryPurchasePayload,
    OfficeInventoryConsumptionPayload,
    OfficeEquipmentPayload,
    OfficeEquipmentLogPayload,
    OfficeAppliancePayload,
    OfficeApplianceServicePayload,
    OfficeApplianceCleaningPayload,
} from "./types";

export const OI_KEY = ["hrms", "office-inventory"] as const;

function getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === "object") {
        const anyErr = err as { response?: { data?: { message?: string | string[] } }; message?: string };
        const msg = anyErr.response?.data?.message;
        if (Array.isArray(msg)) return msg.join(", ");
        if (typeof msg === "string" && msg) return msg;
        if (anyErr.message) return anyErr.message;
    }
    return fallback;
}

export function useOfficeItems() {
    return useQuery({
        queryKey: [...OI_KEY, "items"],
        queryFn: () => officeInventoryApi.listItems(),
    });
}

export function useOfficePurchases() {
    return useQuery({
        queryKey: [...OI_KEY, "purchases"],
        queryFn: () => officeInventoryApi.listPurchases(),
    });
}

export function useOfficeConsumptions() {
    return useQuery({
        queryKey: [...OI_KEY, "consumptions"],
        queryFn: () => officeInventoryApi.listConsumptions(),
    });
}

export function useOfficeEquipment() {
    return useQuery({
        queryKey: [...OI_KEY, "equipment"],
        queryFn: () => officeInventoryApi.listEquipment(),
    });
}

export function useOfficeEquipmentLogs() {
    return useQuery({
        queryKey: [...OI_KEY, "equipment-logs"],
        queryFn: () => officeInventoryApi.listEquipmentLogs(),
    });
}

export function useOfficeAppliances() {
    return useQuery({
        queryKey: [...OI_KEY, "appliances"],
        queryFn: () => officeInventoryApi.listAppliances(),
    });
}

export function useOfficeApplianceServices() {
    return useQuery({
        queryKey: [...OI_KEY, "appliance-services"],
        queryFn: () => officeInventoryApi.listApplianceServices(),
    });
}

export function useOfficeApplianceCleanings() {
    return useQuery({
        queryKey: [...OI_KEY, "appliance-cleanings"],
        queryFn: () => officeInventoryApi.listApplianceCleanings(),
    });
}

export function useWeeklyReport(startDate: string, category: string) {
    return useQuery({
        queryKey: [...OI_KEY, "weekly-report", startDate, category],
        queryFn: () => officeInventoryApi.getWeeklyReport(startDate, category),
    });
}

export function useMonthlyReport(startDate: string, category: string) {
    return useQuery({
        queryKey: [...OI_KEY, "monthly-report", startDate, category],
        queryFn: () => officeInventoryApi.getMonthlyReport(startDate, category),
    });
}

export function useWeeklyTasks() {
    return useQuery({
        queryKey: [...OI_KEY, "weekly-tasks"],
        queryFn: () => officeInventoryApi.getWeeklyTasks(),
    });
}

export function useOfficeInventoryMutations() {
    const qc = useQueryClient();
    const invalidateAll = () => qc.invalidateQueries({ queryKey: OI_KEY });

    const createItem = useMutation({
        mutationFn: (payload: OfficeInventoryItemPayload) => officeInventoryApi.createItem(payload),
        onSuccess: () => {
            toast.success("Item added to Item Master");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to add item")),
    });

    const updateItem = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<OfficeInventoryItemPayload> }) =>
            officeInventoryApi.updateItem(id, data),
        onSuccess: () => {
            toast.success("Item updated");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to update item")),
    });

    const deleteItem = useMutation({
        mutationFn: (id: number) => officeInventoryApi.deleteItem(id),
        onSuccess: () => {
            toast.success("Item deleted");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to delete item")),
    });

    const createPurchase = useMutation({
        mutationFn: (payload: OfficeInventoryPurchasePayload) =>
            officeInventoryApi.createPurchase(payload),
        onSuccess: () => {
            toast.success("Purchase logged");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to log purchase")),
    });

    const updatePurchase = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<OfficeInventoryPurchasePayload> }) =>
            officeInventoryApi.updatePurchase(id, data),
        onSuccess: () => {
            toast.success("Purchase updated");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to update purchase")),
    });

    const deletePurchase = useMutation({
        mutationFn: (id: number) => officeInventoryApi.deletePurchase(id),
        onSuccess: () => {
            toast.success("Purchase deleted");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to delete purchase")),
    });

    const createConsumption = useMutation({
        mutationFn: (payload: OfficeInventoryConsumptionPayload) =>
            officeInventoryApi.createConsumption(payload),
        onSuccess: () => {
            toast.success("Consumption logged");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to log consumption")),
    });

    const updateConsumption = useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: number;
            data: Partial<OfficeInventoryConsumptionPayload>;
        }) => officeInventoryApi.updateConsumption(id, data),
        onSuccess: () => {
            toast.success("Consumption updated");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to update consumption")),
    });

    const deleteConsumption = useMutation({
        mutationFn: (id: number) => officeInventoryApi.deleteConsumption(id),
        onSuccess: () => {
            toast.success("Consumption deleted");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to delete consumption")),
    });

    const createEquipment = useMutation({
        mutationFn: (payload: OfficeEquipmentPayload) => officeInventoryApi.createEquipment(payload),
        onSuccess: () => {
            toast.success("Equipment added");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to add equipment")),
    });

    const updateEquipment = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<OfficeEquipmentPayload> }) =>
            officeInventoryApi.updateEquipment(id, data),
        onSuccess: () => {
            toast.success("Equipment updated");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to update equipment")),
    });

    const deleteEquipment = useMutation({
        mutationFn: (id: number) => officeInventoryApi.deleteEquipment(id),
        onSuccess: () => {
            toast.success("Equipment deleted");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to delete equipment")),
    });

    const createEquipmentLog = useMutation({
        mutationFn: (payload: OfficeEquipmentLogPayload) =>
            officeInventoryApi.createEquipmentLog(payload),
        onSuccess: () => {
            toast.success("Equipment movement logged");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to log equipment movement")),
    });

    const updateEquipmentLog = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<OfficeEquipmentLogPayload> }) =>
            officeInventoryApi.updateEquipmentLog(id, data),
        onSuccess: () => {
            toast.success("Equipment movement updated");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to update equipment movement")),
    });

    const deleteEquipmentLog = useMutation({
        mutationFn: (id: number) => officeInventoryApi.deleteEquipmentLog(id),
        onSuccess: () => {
            toast.success("Equipment movement deleted");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to delete equipment movement")),
    });

    const createAppliance = useMutation({
        mutationFn: (payload: OfficeAppliancePayload) => officeInventoryApi.createAppliance(payload),
        onSuccess: () => {
            toast.success("Appliance added");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to add appliance")),
    });

    const updateAppliance = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<OfficeAppliancePayload> }) =>
            officeInventoryApi.updateAppliance(id, data),
        onSuccess: () => {
            toast.success("Appliance updated");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to update appliance")),
    });

    const deleteAppliance = useMutation({
        mutationFn: (id: number) => officeInventoryApi.deleteAppliance(id),
        onSuccess: () => {
            toast.success("Appliance deleted");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to delete appliance")),
    });

    const createApplianceService = useMutation({
        mutationFn: (payload: OfficeApplianceServicePayload) =>
            officeInventoryApi.createApplianceService(payload),
        onSuccess: () => {
            toast.success("Service visit logged");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to log service visit")),
    });

    const updateApplianceService = useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: number;
            data: Partial<OfficeApplianceServicePayload>;
        }) => officeInventoryApi.updateApplianceService(id, data),
        onSuccess: () => {
            toast.success("Service visit updated");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to update service visit")),
    });

    const deleteApplianceService = useMutation({
        mutationFn: (id: number) => officeInventoryApi.deleteApplianceService(id),
        onSuccess: () => {
            toast.success("Service visit deleted");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to delete service visit")),
    });

    const createApplianceCleaning = useMutation({
        mutationFn: (payload: OfficeApplianceCleaningPayload) =>
            officeInventoryApi.createApplianceCleaning(payload),
        onSuccess: () => {
            toast.success("Cleaning logged");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to log cleaning")),
    });

    const updateApplianceCleaning = useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: number;
            data: Partial<OfficeApplianceCleaningPayload>;
        }) => officeInventoryApi.updateApplianceCleaning(id, data),
        onSuccess: () => {
            toast.success("Cleaning log updated");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to update cleaning log")),
    });

    const deleteApplianceCleaning = useMutation({
        mutationFn: (id: number) => officeInventoryApi.deleteApplianceCleaning(id),
        onSuccess: () => {
            toast.success("Cleaning log deleted");
            invalidateAll();
        },
        onError: e => toast.error(getErrorMessage(e, "Failed to delete cleaning log")),
    });

    return {
        createItem,
        updateItem,
        deleteItem,
        createPurchase,
        updatePurchase,
        deletePurchase,
        createConsumption,
        updateConsumption,
        deleteConsumption,
        createEquipment,
        updateEquipment,
        deleteEquipment,
        createEquipmentLog,
        updateEquipmentLog,
        deleteEquipmentLog,
        createAppliance,
        updateAppliance,
        deleteAppliance,
        createApplianceService,
        updateApplianceService,
        deleteApplianceService,
        createApplianceCleaning,
        updateApplianceCleaning,
        deleteApplianceCleaning,
    };
}
