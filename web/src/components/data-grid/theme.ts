import { themeQuartz } from "ag-grid-community";

// Centralized AG Grid theme for the whole app
export const myAgTheme = themeQuartz
    .withParams(
        {
            accentColor: "#FF6900",
            fontFamily: "inherit",
            foregroundColor: "#181D1F",
            backgroundColor: "#fff",
            headerFontSize: 12,
            dataFontSize: 10
        },
        "light"
    )
    .withParams(
        {
            accentColor: "#FF6900",
            fontFamily: "inherit",
            foregroundColor: "#F5F5F5",
            backgroundColor: "#18181b",
            headerFontSize: 12,
            dataFontSize: 10
        },
        "dark"
    );

export default myAgTheme;
