import { BaseApiService } from "./base.service";
import type { EmdCashFlowResponse } from "@/modules/performance/tender-executive/helpers/emd-cashflow.types";
import type {
    PerformanceOutcomes,
    PerformanceQuery,
    StageBacklogV2Response,
    StageMatrixResponse,
    StageQuery,
} from "@/modules/performance/tender-executive/helpers/tender-executive.types";

class TenderExecutivePerformanceApiService extends BaseApiService {
    constructor() {
        super("/performance/tender-executive");
    }

    getPerformanceOutcomes(params: PerformanceQuery): Promise<PerformanceOutcomes> {
        return this.get<PerformanceOutcomes>("/outcomes", { params });
    }

    getStageMatrix(params: PerformanceQuery): Promise<StageMatrixResponse> {
        return this.get<StageMatrixResponse>("/stage-matrix", { params });
    }

    getStageBacklogV2(params: StageQuery): Promise<StageBacklogV2Response> {
        return this.get<StageBacklogV2Response>("/stage-backlog", { params });
    }

    getEmdCashFlow(params: StageQuery): Promise<EmdCashFlowResponse> {
        return this.get<EmdCashFlowResponse>("/emd-cashflow", { params });
    }
}

export const tenderExecutivePerformanceService = new TenderExecutivePerformanceApiService();
