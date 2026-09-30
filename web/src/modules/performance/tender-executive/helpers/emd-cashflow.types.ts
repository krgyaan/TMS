import type { MetricDrilldownItem } from "./tender-executive.types";

export type EmdLifecycleState = "PAID" | "RETURNED" | "SETTLED";

export interface EmdCashFlowDrilldownItem extends MetricDrilldownItem {
    instrumentId: number;
    instrumentType: string;
    emdState?: EmdLifecycleState;
    paidDate?: string | null;
    returnedAt?: string | null;
    returnDate?: string | null;
    returnDateDerived?: boolean;
    returnUtr?: string | null;
    returnReason?: string | null;
}

export interface EmdMetricBucket {
    count: number;
    value: number;
    drilldown: EmdCashFlowDrilldownItem[];
}

export interface OtherThanTmsEntry {
    requestId: number;
    name: string | null;
    value: number;
    instrumentType: string;
    status: string | null;
    action: number | null;
}

export interface EmdCashFlowResponse {
    from: string;
    to: string;
    paidPriorNotReceived: EmdMetricBucket;
    paidDuring: EmdMetricBucket;
    receivedForPrior: EmdMetricBucket;
    receivedForDuring: EmdMetricBucket;
    pendingAtEnd: EmdMetricBucket;
    otherThanTms: OtherThanTmsEntry[] | null;
}
