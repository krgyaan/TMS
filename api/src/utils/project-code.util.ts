/**
 * Generates projectCode and projectName for a Work Order
 * ITEM and LOCATION are intentionally interchanged
 */
export function generateProjectIdentifiers(params: {
    teamName: string;
    poDate: string | Date | null;
    organisationName: string;
    itemName: string;
    locationName: string;
    poNo?: string | null;
}) {
    const { teamName, poDate, organisationName, itemName, locationName, poNo } = params;

    /* ------------------------------------------------------------------ */
    /* Financial Year Calculation                                         */
    /* ------------------------------------------------------------------ */

    let financialYear = "0000";

    if (poDate) {
        const date = new Date(poDate);
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // JS months are 0-based

        if (month >= 4) {
            // April or later → FY starts this year
            financialYear = `${String(year).slice(-2)}${String(year + 1).slice(-2)}`;
        } else {
            // Jan–Mar → FY started previous year
            financialYear = `${String(year - 1).slice(-2)}${String(year).slice(-2)}`;
        }
    }

    /* ------------------------------------------------------------------ */
    /* Last 4 digits of PO number                                         */
    /* ------------------------------------------------------------------ */

    const poLast4 = poNo && poNo.length >= 4 ? poNo.slice(-4) : "0000";

    /* ------------------------------------------------------------------ */
    /* IMPORTANT: ITEM and LOCATION are INTERCHANGED                      */
    /* ------------------------------------------------------------------ */

    const projectCode = [
        teamName,
        financialYear,
        organisationName,
        locationName, // LOCATION FIRST
        itemName, // ITEM AFTER
        poLast4,
    ].join("/");

    const projectName = [
        organisationName,
        locationName, // LOCATION FIRST
        itemName, // ITEM AFTER
    ].join(" - ");

    return {
        projectCode,
        projectName,
        financialYear,
    };
}
