import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ColDef, RowSelectionOptions } from "ag-grid-community";
import { useFetchJson } from "@/hooks/usFetchJson";
import { dateCol, currencyCol, booleanIconCol } from "@/components/data-grid";
import DataTable from "@/components/ui/data-table";
import { Plus } from "lucide-react";

interface IRow {
  mission: string;
  location: string;
  date: string;
  time: string;
  rocket: string;
  price: number;
  successful: boolean;
}

const rowSelection: RowSelectionOptions = {
  mode: "multiRow",
  headerCheckbox: false,
};

const index = () => {
  const { data, loading } = useFetchJson<IRow>(
    "https://www.ag-grid.com/example-assets/space-mission-data.json",
  );

  const [colDefs] = useState<ColDef[]>([
    { field: "mission", width: 150 },
    { field: "location", width: 225 },
    dateCol("date"),
    currencyCol(
      "price",
      { locale: "en-IN", currency: "INR", maximumFractionDigits: 0 },
      { width: 130 },
    ),
    booleanIconCol("successful", { width: 120 }),
    { field: "rocket" },
  ]);

  const handleAddLead = () => {
    console.log("Add Lead clicked");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Leads</CardTitle>
            <CardDescription>All leads listed</CardDescription>
          </div>
          <Button onClick={handleAddLead} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Leads
          </Button>
        </div>
      </CardHeader>
      <CardContent className="h-screen px-0">
        <DataTable
          data={data || []}
          loading={loading}
          columnDefs={colDefs}
          gridOptions={{
            defaultColDef: { editable: true, filter: true },
            rowSelection,
            pagination: true,
          }}
          enablePagination={true}
          enableRowSelection={true}
          selectionType="multiple"
          onSelectionChanged={(rows) => console.log("Row Selected!", rows)}
        />
      </CardContent>
    </Card>
  );
};

export default index;