import { useMemo, useState } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type {
    ColDef,
    RowSelectionOptions,
    ValueFormatterParams,
} from "ag-grid-community";

import type { CustomCellRendererProps } from "ag-grid-react";
import { AgGridReact } from "ag-grid-react";
import { useFetchJson } from "@/hooks/usFetchJson";
import { themeQuartz } from 'ag-grid-community';

const myTheme = themeQuartz
    .withParams(
        {
            accentColor: "#FF6900",
            fontFamily: "inherit",
            foregroundColor: "#181D1F",
            backgroundColor: "#fff",
            headerFontSize: 14,
        },
        "light"
    )
    .withParams(
        {
            accentColor: "#FF6900",
            fontFamily: "inherit",
            foregroundColor: "#F5F5F5",
            backgroundColor: "#18181b",
            headerFontSize: 14,
        },
        "dark"
    );


// Custom Cell Renderer (Display logos based on cell value)
const CompanyLogoRenderer = (params: CustomCellRendererProps) => (
    <span
        style={{
            display: "flex",
            height: "100%",
            width: "100%",
            alignItems: "center",
        }}
    >
        {params.value && (
            <img
                alt={`${params.value} Flag`}
                src={`https://www.ag-grid.com/example-assets/space-company-logos/${params.value.toLowerCase()}.png`}
                style={{
                    display: "block",
                    width: "25px",
                    height: "auto",
                    maxHeight: "50%",
                    marginRight: "12px",
                    filter: "brightness(1.1)",
                }}
            />
        )}
        <p
            style={{
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
            }}
        >
            {params.value}
        </p>
    </span>
);

/* Custom Cell Renderer (Display tick / cross in 'Successful' column) */
const MissionResultRenderer = (params: CustomCellRendererProps) => (
    <span
        style={{
            display: "flex",
            justifyContent: "center",
            height: "100%",
            alignItems: "center",
        }}
    >
        {
            <img
                alt={`${params.value}`}
                src={`https://www.ag-grid.com/example-assets/icons/${params.value ? "tick-in-circle" : "cross-in-circle"}.png`}
                style={{ width: "auto", height: "auto" }}
            />
        }
    </span>
);

/* Format Date Cells */
const dateFormatter = (params: ValueFormatterParams): string => {
    return new Date(params.value).toLocaleDateString("en-us", {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

// Row Data Interface
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
    // Row Data: The data to be displayed.
    const { data, loading } = useFetchJson<IRow>(
        "https://www.ag-grid.com/example-assets/space-mission-data.json",
    );

    // Column Definitions: Defines & controls grid columns.
    const [colDefs] = useState<ColDef[]>([
        {
            field: "mission",
            width: 150,
        },
        {
            field: "company",
            width: 130,
            cellRenderer: CompanyLogoRenderer,
        },
        {
            field: "location",
            width: 225,
        },
        {
            field: "date",
            valueFormatter: dateFormatter,
        },
        {
            field: "price",
            width: 130,
            valueFormatter: (params: ValueFormatterParams) => {
                if (typeof params.value !== "number") return "";
                return params.value.toLocaleString("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                });
            },
        },
        {
            field: "successful",
            width: 120,
            cellRenderer: MissionResultRenderer,
        },
        { field: "rocket" },
    ]);

    // Apply settings across all columns
    const defaultColDef = useMemo<ColDef>(() => {
        return {
            filter: true,
            editable: true,
        };
    }, []);

    // Container: Defines the grid's theme & dimensions.
    return (
        <Card className="">
            <CardHeader>
                <CardTitle>
                    Tenders
                </CardTitle>
                <CardDescription>
                    All tenders listed
                </CardDescription>
                <CardAction>
                    <Button variant={"default"} onClick={() => alert("Adding...")}>Add New</Button>
                </CardAction>
            </CardHeader>
            <CardContent className="h-screen px-0">
                <AgGridReact
                    theme={myTheme}
                    rowData={data}
                    loading={loading}
                    columnDefs={colDefs}
                    defaultColDef={defaultColDef}
                    pagination={true}
                    rowSelection={rowSelection}
                    onSelectionChanged={(event) => console.log("Row Selected!")}
                    onCellValueChanged={(event) =>
                        console.log(`New Cell Value: ${event.value}`)
                    }
                />
            </CardContent>
        </Card>
    );
};


export default index
