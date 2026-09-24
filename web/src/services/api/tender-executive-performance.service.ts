import { BaseApiService } from "./base.service";
import type {
    ExecutiveScoring,
    PerformanceOutcomes,
    PerformanceQuery,
    PerformanceSummary,
    PerformanceTrends,
    StageMatrixResponse,
    StageQuery,
    TenderListRow,
} from "@/modules/performance/tender-executive/helpers/tender-executive.types";

class TenderExecutivePerformanceApiService extends BaseApiService {
    constructor() {
        super("/performance/tender-executive");
    }

    getPerformanceSummary(params: PerformanceQuery): Promise<PerformanceSummary> {
        return this.get<PerformanceSummary>("/summary", { params });
    }

    getPerformanceOutcomes(params: PerformanceQuery): Promise<PerformanceOutcomes> {
        return this.get<PerformanceOutcomes>("/outcomes", { params });
    }

    getStageMatrix(params: PerformanceQuery): Promise<StageMatrixResponse> {
        return this.get<StageMatrixResponse>("/stage-matrix", { params });
    }

    getTenderList(params: PerformanceQuery): Promise<TenderListRow[]> {
        return this.get<TenderListRow[]>("/tenders", { params });
    }

    getPerformanceTrends(params: PerformanceQuery): Promise<PerformanceTrends> {
        return this.get<PerformanceTrends>("/trends", { params });
    }

    getExecutiveScoring(params: PerformanceQuery): Promise<ExecutiveScoring> {
        return this.get<ExecutiveScoring>("/scoring", { params });
    }

    getExecutiveBacklog(params: StageQuery): Promise<ExecutiveScoring> {
        return this.get<ExecutiveScoring>("/stage-backlog", { params });
    }

    getStageBacklogV2(params: ExecutiveScoring): Promise<ExecutiveScoring> {
        return this.get<ExecutiveScoring>("/stage-backlog", { params });
    }

    getEmdBalance(params: StageQuery): Promise<ExecutiveScoring> {
        return this.get<ExecutiveScoring>("/emd-balance", { params });
    }

    getEmdCashFlow(params: { view: "user" | "team"; userId?: number; teamId?: number; fromDate: string; toDate: string }) {
        return this.get("/emd-cashflow", { params });
    }
}

export const tenderExecutivePerformanceService = new TenderExecutivePerformanceApiService();
