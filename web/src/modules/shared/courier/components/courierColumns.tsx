import type { ColDef } from "ag-grid-community";

import { Badge } from "@/components/ui/badge";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { formatDate, formatDateTime } from "@/hooks/useFormatedDate";

import {
    COURIER_STATUS_BADGE,
    COURIER_STATUS_LABELS,
} from "@/modules/shared/courier/helpers/courier.constants";
import type { CourierDashboardRow, CourierTab } from "@/modules/shared/courier/helpers/courier.types";

interface CreateCourierColumnsParams {
    activeTab: CourierTab;
    actions: ActionItem<CourierDashboardRow>[];
}

export function createCourierColumns({ activeTab, actions }: CreateCourierColumnsParams): ColDef<CourierDashboardRow>[] {
    const reqNoCol: ColDef<CourierDashboardRow> = {
        field: "id",
        colId: "id",
        headerName: "Req No",
        width: 90,
        filter: true,
    };

    const requestDateCol: ColDef<CourierDashboardRow> = {
        field: "createdAt",
        colId: "createdAt",
        headerName: "Request Date",
        width: 130,
        valueGetter: params => formatDate(params.data?.createdAt),
        filter: true,
    };

    const fromCol: ColDef<CourierDashboardRow> = {
        headerName: "From (Name)",
        colId: "empFromUser.name",
        width: 160,
        valueGetter: params => params.data?.empFromUser?.name ?? "—",
        filter: true,
    };

    const toCol: ColDef<CourierDashboardRow> = {
        field: "toName",
        colId: "toName",
        headerName: "To (Name)",
        width: 160,
        filter: true,
    };

    const organizationCol: ColDef<CourierDashboardRow> = {
        field: "toOrg",
        colId: "toOrg",
        headerName: "Organization",
        width: 170,
        filter: true,
    };

    const expectedDeliveryCol: ColDef<CourierDashboardRow> = {
        field: "delDate",
        colId: "delDate",
        headerName: "Expected Delivery",
        width: 145,
        valueGetter: params => formatDate(params.data?.delDate),
        filter: true,
    };

    const providerCol: ColDef<CourierDashboardRow> = {
        field: "courierProvider",
        colId: "courierProvider",
        headerName: "Provider",
        width: 140,
        valueGetter: params => params.data?.courierProvider ?? "—",
        filter: true,
    };

    const pickupCol: ColDef<CourierDashboardRow> = {
        field: "pickupDate",
        colId: "pickupDate",
        headerName: "Pickup Date",
        width: 155,
        valueGetter: params => formatDateTime(params.data?.pickupDate),
        filter: true,
    };

    const docketCol: ColDef<CourierDashboardRow> = {
        field: "docketNo",
        colId: "docketNo",
        headerName: "Docket No",
        width: 130,
        valueGetter: params => params.data?.docketNo ?? "—",
        filter: true,
    };

    const deliveryDateCol: ColDef<CourierDashboardRow> = {
        field: "deliveryDate",
        colId: "deliveryDate",
        headerName: "Delivery Date",
        width: 155,
        valueGetter: params => formatDateTime(params.data?.deliveryDate),
        filter: true,
    };

    const statusCol: ColDef<CourierDashboardRow> = {
        field: "status",
        colId: "status",
        headerName: "Status",
        width: 200,
        valueGetter: params =>
            params.data ? COURIER_STATUS_LABELS[params.data.status] ?? `Status ${params.data.status}` : "—",
        cellRenderer: (params: any) => {
            const status = params.data?.status as number | null | undefined;

            if (status === null || status === undefined) {
                return "—";
            }

            return (
                <Badge
                    variant={COURIER_STATUS_BADGE[status]}
                >
                    {COURIER_STATUS_LABELS[status] ?? `Status ${status}`}
                </Badge>
            );
        },
        filter: true,
    };

    const actionsCol: ColDef<CourierDashboardRow> = {
        headerName: "Actions",
        colId: "actions",
        filter: false,
        sortable: false,
        pinned: "right",
        width: 90,
        cellRenderer: createActionColumnRenderer(actions),
    };

    const baseColumns: ColDef<CourierDashboardRow>[] = [
        reqNoCol,
        requestDateCol,
        fromCol,
        toCol,
        organizationCol,
    ];

    switch (activeTab) {
        case "pending":
            return [...baseColumns, expectedDeliveryCol, actionsCol, statusCol];

        case "dispatched":
            return [
                ...baseColumns,
                expectedDeliveryCol,
                providerCol,
                pickupCol,
                docketCol,
                statusCol,
                actionsCol,
            ];

        case "not_delivered":
            return [
                ...baseColumns,
                expectedDeliveryCol,
                providerCol,
                pickupCol,
                docketCol,
                statusCol,
                actionsCol,
            ];

        case "delivered":
            return [
                ...baseColumns,
                providerCol,
                pickupCol,
                docketCol,
                deliveryDateCol,
                statusCol,
                actionsCol,
            ];

        case "rejected":
            return [...baseColumns, providerCol, docketCol, statusCol, actionsCol];

        default:
            return [...baseColumns, expectedDeliveryCol, actionsCol];
    }
}
