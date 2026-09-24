export interface EmdMetricBucket {
    count: number;
    value: number;
    drilldown: {
        tenderId: number;
        tenderNo?: string;
        tenderName?: string;
        instrumentType: string;
        amount: number;
        requestedAt: string;
        returnedAt?: string | null;
    }[];
}

export interface EmdCashFlowResponse {
    paid: {
        prior: EmdMetricBucket;
        during: EmdMetricBucket;
    };
    received: {
        priorPaid: EmdMetricBucket;
        duringPaid: EmdMetricBucket;
    };
}
