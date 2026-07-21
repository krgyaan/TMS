import { paths } from "@/app/routes/paths";
import { dateCol } from "@/components/data-grid";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrmsAssetsAll } from "@/hooks/api/useHrmsAssets";
import type { ColDef } from "ag-grid-community";
import { BadgeCheck, Eye, MonitorSmartphone, PcCase, Pencil, Plus } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ASSET_STATUS } from "./constants";

export default function AssetListPage() {
  const navigate = useNavigate();
  const { data: assets, isLoading } = useHrmsAssetsAll();
  const tableData = assets || [];

  const rowActions: ActionItem<any>[] = [
    {
      label: "View Details",
      onClick: (row) => navigate(paths.hrms.assets.show(row.id)),
      icon: <Eye className="h-4 w-4" />,
    },
    {
      label: "Edit",
      onClick: (row) => navigate(paths.hrms.assets.edit(row.id)),
      icon: <Pencil className="h-4 w-4" />,
    },
    {
      label: "Status",
      onClick: (row) => navigate(paths.hrms.assets.status(row.id)),
      icon: <BadgeCheck className="h-4 w-4" />,
    },
  ];

  const getStatusBadge = (status: string | null | undefined) => {
    if (!status || status.toLowerCase() === "assigned") {
      return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Assigned</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const colDefs = useMemo<ColDef<any>[]>(
    () => [
      {
        field: "assetCode",
        headerName: "Asset Code",
        width: 150,
        sortable: true,
        filter: true
      },
      {
        field: "brand",
        headerName: "Asset Details",
        width: 250,
        sortable: true,
        filter: true,
        cellRenderer: (params: any) => (
          <div className="flex flex-col justify-center h-full py-1">
            <div className="font-semibold leading-tight text-gray-900 dark:text-gray-100">
              {params.data.assetType} • {params.data.brand} {params.data.model}
            </div>
            <div className="text-xs text-muted-foreground leading-tight mt-0.5">
              {params.data.serialNumber ? `SN: ${params.data.serialNumber}` : "No Serial"}
            </div>
          </div>
        ),
      },
      {
        field: "assignedByName",
        headerName: "Assigned By",
        width: 150,
        sortable: true,
        filter: true,
        cellRenderer: (params: any) => <span className="font-medium">{params.value ?? "—"}</span>,
      },
      {
        field: "assignedTo",
        headerName: "Assigned To",
        width: 150,
        sortable: true,
        filter: true,
        cellRenderer: (params: any) => <span className="font-medium">{params.value ?? "—"}</span>,
      },
      dateCol<any>("assignedDate", { includeTime: false }, { headerName: "Assigned Date", width: 150 }),
      {
        field: "assetCategoryLabel",
        headerName: "Category",
        width: 130,
        sortable: true,
        filter: true,
        cellRenderer: (params: any) => <span>{params.value ?? "—"}</span>,
      },
      {
        field: "assetConditionLabel",
        headerName: "Condition",
        width: 110,
        sortable: true,
        filter: true,
        cellRenderer: (params: any) => {
          const val = params.value;
          if (!val) return <span className="text-muted-foreground">—</span>;
          return <Badge variant="secondary">{val}</Badge>;
        },
      },
      {
        field: "assetStatus",
        headerName: "Status",
        width: 130,
        sortable: true,
        filter: true,
        cellRenderer: (params: any) => getStatusBadge(ASSET_STATUS[params.value]),
      },
      {
        headerName: "",
        filter: false,
        cellRenderer: createActionColumnRenderer(rowActions),
        sortable: false,
        pinned: "right",
        width: 57,
      },
    ],
    [],
  );

  if (isLoading && !tableData.length) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[500px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <MonitorSmartphone className="h-6 w-6 text-primary" />
              Assets Administration
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              View and manage all company assets and user assignments.
            </CardDescription>
          </div>
          <Button onClick={() => navigate(paths.hrms.assets.create)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Assign New Asset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        {tableData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg bg-muted/30">
            <PcCase className="h-12 w-12 mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium">No assets deployed</p>
            <p className="text-sm text-muted-foreground mt-1">Assign your first asset to an employee to get started.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(paths.hrms.assets.create)}>
              Assign Asset
            </Button>
          </div>
        ) : (
          <DataTable
            data={tableData}
            columnDefs={colDefs}
            loading={isLoading}
            manualPagination={false}
            gridOptions={{
              defaultColDef: { editable: false, filter: true, sortable: true, resizable: true },
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
