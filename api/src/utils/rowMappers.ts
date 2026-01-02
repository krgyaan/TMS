import type { PhysicalDocDashboardRow } from "@/modules/tendering/physical-docs/physical-docs.service";

export const RowMappers = {
    /**
     * Map physical docs joined row → formatted dashboard response
     */
    mapPhysicalDocRow(row: any): PhysicalDocDashboardRow {
        return {
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
            statusName: row.statusName || "",
            dueDate: row.dueDate,
            teamMemberName: row.teamMemberName || "",
            courierAddress: row.courierAddress || "",
            physicalDocsRequired: row.physicalDocsRequired || "No",
            physicalDocsDeadline: row.physicalDocsDeadline || null,
            physicalDocs: row.physicalDocs,
            courierNo: row.courierNo || null,
            status: row.status || null,
            latestStatus: row.latestStatus || null,
            latestStatusName: row.latestStatusName || null,
            statusRemark: row.statusRemark || null,
            courierDate: row.courierDate || null,
        };
    },
};
