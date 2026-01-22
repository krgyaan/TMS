export type TenderKpiBucket = "ALLOCATED" | "APPROVED" | "REJECTED" | "PENDING" | "BID" | "MISSED" | "DISQUALIFIED" | "RESULT_AWAITED" | "LOST" | "WON";

function mapStatusToKpi(statusCode: number): TenderKpiBucket {
    // WON
    if ([25, 26, 27, 28].includes(statusCode)) return "WON";

    // LOST
    if ([18, 21, 22, 24].includes(statusCode)) return "LOST";

    // DISQUALIFIED
    if ([33, 38, 39, 41].includes(statusCode)) return "DISQUALIFIED";

    // MISSED (subset of DNB)
    if ([8, 16, 36].includes(statusCode)) return "MISSED";

    // REJECTED (Other DNB)
    if ([9, 10, 11, 12, 13, 14, 15, 31, 32, 34, 35].includes(statusCode)) return "REJECTED";

    // BID DONE, RESULT NOT YET
    if ([17, 19, 20, 23, 37, 40].includes(statusCode)) return "RESULT_AWAITED";

    // PRE-BID PENDING
    if ([1, 2, 3, 4, 5, 6, 7, 29, 30].includes(statusCode)) return "PENDING";

    // Fallback
    return "ALLOCATED";
}
