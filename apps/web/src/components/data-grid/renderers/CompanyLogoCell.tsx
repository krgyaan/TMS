import type { CustomCellRendererProps } from "ag-grid-react";

const LOGO_BASE = "https://www.ag-grid.com/example-assets/space-company-logos/";

export function CompanyLogoCell<TData = any, TValue = string>(
  params: CustomCellRendererProps<TData, TValue>
) {
  const value = (params.value as unknown as string) || "";

  return (
    <span
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        alignItems: "center",
      }}
    >
      {value ? (
        <img
          alt={`${value} Logo`}
          src={`${LOGO_BASE}${value.toLowerCase()}.png`}
          style={{
            display: "block",
            width: 25,
            height: "auto",
            maxHeight: "50%",
            marginRight: 12,
            filter: "brightness(1.1)",
          }}
        />
      ) : null}
      <p
        style={{
          textOverflow: "ellipsis",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </p>
    </span>
  );
}

export default CompanyLogoCell;

