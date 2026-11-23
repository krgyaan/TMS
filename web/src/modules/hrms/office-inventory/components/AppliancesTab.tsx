import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type {
    OfficeAppliance,
    OfficeApplianceCleaning,
    OfficeApplianceService,
} from "../types";
import { formatCurrency, formatDateDisplay } from "../utils";

interface AppliancesTabProps {
    subTab: "register" | "services" | "cleanings";
    onSubTabChange: (sub: "register" | "services" | "cleanings") => void;
    appliances: OfficeAppliance[];
    services: OfficeApplianceService[];
    cleanings: OfficeApplianceCleaning[];
    search: string;
    onEditAppliance: (row: OfficeAppliance) => void;
    onDeleteAppliance: (row: OfficeAppliance) => void;
    onEditService: (row: OfficeApplianceService) => void;
    onDeleteService: (row: OfficeApplianceService) => void;
    onEditCleaning: (row: OfficeApplianceCleaning) => void;
    onDeleteCleaning: (row: OfficeApplianceCleaning) => void;
}

export function AppliancesTab({
    subTab,
    onSubTabChange,
    appliances,
    services,
    cleanings,
    search,
    onEditAppliance,
    onDeleteAppliance,
    onEditService,
    onDeleteService,
    onEditCleaning,
    onDeleteCleaning,
}: AppliancesTabProps) {
    const q = search.trim().toLowerCase();

    const filteredAppliances = useMemo(
        () =>
            appliances.filter(a => {
                if (!q) return true;
                return (
                    a.applianceCode.toLowerCase().includes(q) ||
                    a.applianceName.toLowerCase().includes(q) ||
                    (a.brandModel || "").toLowerCase().includes(q) ||
                    (a.location || "").toLowerCase().includes(q) ||
                    a.status.toLowerCase().includes(q)
                );
            }),
        [appliances, q]
    );

    const filteredServices = useMemo(
        () =>
            services.filter(s => {
                if (!q) return true;
                return (
                    s.applianceCode.toLowerCase().includes(q) ||
                    s.applianceName.toLowerCase().includes(q) ||
                    s.visitType.toLowerCase().includes(q) ||
                    (s.vendorTechnician || "").toLowerCase().includes(q) ||
                    (s.notes || "").toLowerCase().includes(q)
                );
            }),
        [services, q]
    );

    const filteredCleanings = useMemo(
        () =>
            cleanings.filter(c => {
                if (!q) return true;
                return (
                    c.applianceCode.toLowerCase().includes(q) ||
                    c.applianceName.toLowerCase().includes(q) ||
                    c.cleaningType.toLowerCase().includes(q) ||
                    (c.doneBy || "").toLowerCase().includes(q) ||
                    (c.notes || "").toLowerCase().includes(q)
                );
            }),
        [cleanings, q]
    );

    const statusBadge = (status: string) => {
        if (status === "In Service") return "bg-emerald-50 text-emerald-700";
        if (status === "Under Repair") return "bg-amber-50 text-amber-700";
        return "bg-gray-100 text-gray-600";
    };

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onSubTabChange("register")}
                        className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                            subTab === "register"
                                ? "bg-[#111827] text-white"
                                : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                        }`}
                    >
                        Appliance Register ({appliances.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => onSubTabChange("services")}
                        className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                            subTab === "services"
                                ? "bg-[#111827] text-white"
                                : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                        }`}
                    >
                        Service / Maintenance Visits ({services.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => onSubTabChange("cleanings")}
                        className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                            subTab === "cleanings"
                                ? "bg-[#111827] text-white"
                                : "bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]"
                        }`}
                    >
                        Cleaning Log ({cleanings.length})
                    </button>
                </div>
            </div>

            {subTab === "register" && (
                <div className="overflow-x-auto rounded-[10px] border border-[#E5E7EB] bg-white">
                    <table className="w-full min-w-[1120px] border-collapse text-left">
                        <thead>
                            <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[13px] font-semibold text-[#111827]">
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Appliance</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Service Freq</th>
                                <th className="px-4 py-3">Cleaning Freq</th>
                                <th className="px-4 py-3 text-right">Services / Expense</th>
                                <th className="px-4 py-3">Last Service</th>
                                <th className="px-4 py-3">Cleanings / Last</th>
                                <th className="px-4 py-3">Next Cleaning Due</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB] text-[13.5px]">
                            {filteredAppliances.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-[#6B7280]">
                                        No pantry appliances registered yet.
                                    </td>
                                </tr>
                            ) : (
                                filteredAppliances.map(app => (
                                    <tr key={app.id} className="hover:bg-[#FAFAFA]">
                                        <td className="px-4 py-3 font-mono text-[13px] font-medium">
                                            {app.applianceCode}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-[#111827]">
                                                {app.applianceName}
                                            </div>
                                            <div className="text-xs text-[#6B7280]">
                                                {[app.brandModel, app.location]
                                                    .filter(Boolean)
                                                    .join(" · ") || "—"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${statusBadge(
                                                    app.status
                                                )}`}
                                            >
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{app.serviceFrequency}</td>
                                        <td className="px-4 py-3">{app.cleaningFrequency}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="font-medium">
                                                {app.serviceVisitsCount} visit
                                                {app.serviceVisitsCount === 1 ? "" : "s"}
                                            </div>
                                            <div className="text-xs text-[#6B7280]">
                                                {formatCurrency(app.totalMaintenanceExpense)}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            {formatDateDisplay(app.lastServiceDate)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">
                                                {app.cleaningsCount} done
                                            </div>
                                            <div className="text-xs text-[#6B7280]">
                                                {app.lastCleanedDate
                                                    ? formatDateDisplay(app.lastCleanedDate)
                                                    : "Never"}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            {app.nextCleaningDue ? (
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                                                        app.isCleaningOverdue
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-[#F3F4F6] text-[#111827]"
                                                    }`}
                                                >
                                                    {formatDateDisplay(app.nextCleaningDue)}
                                                    {app.isCleaningOverdue ? " (Overdue)" : ""}
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => onEditAppliance(app)}
                                                className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] hover:bg-[#F3F4F6]"
                                                title="Edit appliance"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDeleteAppliance(app)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] text-red-600 hover:bg-red-50"
                                                title="Delete appliance"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {subTab === "services" && (
                <div className="overflow-x-auto rounded-[10px] border border-[#E5E7EB] bg-white">
                    <table className="w-full min-w-[880px] border-collapse text-left">
                        <thead>
                            <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[13px] font-semibold text-[#111827]">
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Appliance</th>
                                <th className="px-4 py-3">Visit Type</th>
                                <th className="px-4 py-3">Vendor / Technician</th>
                                <th className="px-4 py-3 text-right">Expense (₹)</th>
                                <th className="px-4 py-3">Next Service Due</th>
                                <th className="px-4 py-3">Notes</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB] text-[13.5px]">
                            {filteredServices.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-[#6B7280]">
                                        No service visits logged yet.
                                    </td>
                                </tr>
                            ) : (
                                filteredServices.map(s => (
                                    <tr key={s.id} className="hover:bg-[#FAFAFA]">
                                        <td className="whitespace-nowrap px-4 py-3">
                                            {formatDateDisplay(s.serviceDate)}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-[13px] font-medium">
                                            {s.applianceCode}
                                        </td>
                                        <td className="px-4 py-3 font-medium">{s.applianceName}</td>
                                        <td className="px-4 py-3">{s.visitType}</td>
                                        <td className="px-4 py-3">{s.vendorTechnician || "—"}</td>
                                        <td className="px-4 py-3 text-right font-semibold">
                                            {formatCurrency(s.expense)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3">
                                            {formatDateDisplay(s.nextServiceDue)}
                                        </td>
                                        <td className="max-w-[200px] truncate px-4 py-3 text-[#6B7280]">
                                            {s.notes || "—"}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => onEditService(s)}
                                                className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] hover:bg-[#F3F4F6]"
                                                title="Edit service visit"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDeleteService(s)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] text-red-600 hover:bg-red-50"
                                                title="Delete service visit"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {subTab === "cleanings" && (
                <div className="overflow-x-auto rounded-[10px] border border-[#E5E7EB] bg-white">
                    <table className="w-full min-w-[780px] border-collapse text-left">
                        <thead>
                            <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[13px] font-semibold text-[#111827]">
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Appliance</th>
                                <th className="px-4 py-3">Cleaning Type</th>
                                <th className="px-4 py-3">Done By</th>
                                <th className="px-4 py-3 text-right">Cost (₹)</th>
                                <th className="px-4 py-3">Notes</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB] text-[13.5px]">
                            {filteredCleanings.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-[#6B7280]">
                                        No appliance cleanings logged yet.
                                    </td>
                                </tr>
                            ) : (
                                filteredCleanings.map(c => (
                                    <tr key={c.id} className="hover:bg-[#FAFAFA]">
                                        <td className="whitespace-nowrap px-4 py-3">
                                            {formatDateDisplay(c.cleaningDate)}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-[13px] font-medium">
                                            {c.applianceCode}
                                        </td>
                                        <td className="px-4 py-3 font-medium">{c.applianceName}</td>
                                        <td className="px-4 py-3">{c.cleaningType}</td>
                                        <td className="px-4 py-3">{c.doneBy || "—"}</td>
                                        <td className="px-4 py-3 text-right">
                                            {formatCurrency(c.cost)}
                                        </td>
                                        <td className="max-w-[220px] truncate px-4 py-3 text-[#6B7280]">
                                            {c.notes || "—"}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => onEditCleaning(c)}
                                                className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] hover:bg-[#F3F4F6]"
                                                title="Edit cleaning log"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDeleteCleaning(c)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] text-red-600 hover:bg-red-50"
                                                title="Delete cleaning log"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
