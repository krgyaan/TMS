import type { MetricDrilldownItem } from "./tender-executive.types";

export interface EmdCashFlowDrilldownItem extends MetricDrilldownItem {
    instrumentId: number;
    instrumentType: string;
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
