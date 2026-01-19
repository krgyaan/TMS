import { STAGE_CONFIG } from "../../config/stage-config";

export type StagePerformance = {
    tenderId: number;
    stageKey: string;

    applicable: boolean;

    completed: boolean;
    onTime: boolean | null;

    startTime: Date | null;
    endTime: Date | null;
    deadline: Date | null;
};

export type PerformanceRole = "executive" | "team_leader";

export interface PerformanceScope {
    role: PerformanceRole;
    tenderUserIds: number[];
    timerUserIds: number[];
    stages: typeof STAGE_CONFIG;
}

export type TenderOutcomeStatus = "Result Awaited" | "Won" | "Lost" | "Missed" | "Not Bid";
