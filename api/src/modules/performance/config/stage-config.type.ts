export type StageType = "timer" | "existence";

export type StageConfig = {
    stageKey: string;

    /** timer_name in timer table (if timer-based) */
    timerName?: string;

    /** timer-based or table-existence-based */
    type: StageType;

    /**
     * Determines whether this stage is applicable
     * based on tender_infos row
     */
    isApplicable: (tender: any) => boolean;

    /**
     * Resolve expected deadline for on-time evaluation
     * Returns null if on-time logic does not apply
     */
    resolveDeadline: (tender: any) => Date | null;

    tlStage: boolean;
};
