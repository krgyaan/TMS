import type { CustomCellRendererProps } from "ag-grid-react";

const ICON_BASE = "https://www.ag-grid.com/example-assets/icons/";

export function BooleanIconCell<TData = any, TValue = boolean>(
  params: CustomCellRendererProps<TData, TValue>
) {
  const value = Boolean(params.value);

  return (
    <span
      style={{
        display: "flex",
        justifyContent: "center",
        height: "100%",
        alignItems: "center",
      }}
    >
      <img
        alt={value ? "True" : "False"}
        src={`${ICON_BASE}${value ? "tick-in-circle" : "cross-in-circle"}.png`}
        style={{ width: "auto", height: "auto" }}
      />
    </span>
  );
}

export default BooleanIconCell;

