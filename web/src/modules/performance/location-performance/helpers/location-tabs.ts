export const LOCATION_TABS = [
    { key: "tenders_assigned", label: "Assigned", description: "All tenders assigned in this period." },
    { key: "tenders_approved", label: "Approved", description: "Tenders approved by the team lead." },
    { key: "tenders_bid", label: "Bid", description: "Tenders where a bid has been submitted." },
    { key: "tenders_missed", label: "Missed", description: "Tenders that were missed for submission." },
    { key: "tenders_disqualified", label: "Disqualified", description: "Tenders that were disqualified." },
    { key: "tender_results_awaited", label: "Results Awaited", description: "Tenders awaiting final results." },
    { key: "tenders_won", label: "Won", description: "Tenders that were won." },
    { key: "tenders_lost", label: "Lost", description: "Tenders that were lost." },
    { key: "tenders_cancelled", label: "Cancelled", description: "Tenders that were cancelled." },
    { key: "emd_paid", label: "EMD Paid", description: "Tenders where the EMD has been paid." },
    { key: "emd_returned", label: "EMD Returned", description: "Tenders where the EMD has been returned." },
] as const;

export type LocationTabKey = (typeof LOCATION_TABS)[number]["key"];

export const DEFAULT_LOCATION_TAB: LocationTabKey = "tenders_assigned";
