import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ColDef, RowSelectionOptions } from "ag-grid-community";
import { useFetchJson } from "@/hooks/usFetchJson";
import { dateCol, currencyCol, logoCol, booleanIconCol } from "@/components/data-grid";
import DataTable from "@/components/ui/data-table";

interface IRow {
  mission: string;
  company: string;
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
    logoCol("company", { width: 130 }),
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enquiries</CardTitle>
        <CardDescription>All enquiries listed</CardDescription>
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
          height="100%"
        />
      </CardContent>
    </Card>
  );
};

export default index
