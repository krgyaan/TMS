import type { CustomCellRendererProps } from "ag-grid-react";

// Generic type that requires tenderNo and tenderName
type TenderNameData = {
    tenderNo: string;
    tenderName: string;
};

export function TenderNameCell<TData extends TenderNameData>(
    params: CustomCellRendererProps<TData>
) {
    const data = params.data;

    if (!data) return null;

    return (
        <div className="flex flex-col gap-0.5">
            <p className="text-xs">{data.tenderName}</p>
            <p className="text-xs text-[10px] text-muted-foreground truncate">{data.tenderNo}</p>
        </div>
    );
}

export default TenderNameCell;
