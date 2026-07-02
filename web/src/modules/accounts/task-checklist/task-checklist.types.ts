// src/modules/accounts/checklist/checklist.types.ts

export interface Checklist {
    id: number;
    taskName: string;
    frequency: string;
    frequencyCondition: number | null;
    responsibility: string;
    accountability: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    responsibleUserName?: string;
    responsibleUserEmail?: string;
    accountableUserName?: string;
    accountableUserEmail?: string;
}

export interface ChecklistReport {
    id: number;
    checklistId: number;
    responsibleUserId: number;
    accountableUserId: number;
    dueDate: string;
    respCompletedAt: string | null;
    accCompletedAt: string | null;
    respRemark: string | null;
    respResultFile: string | null;
    accRemark: string | null;
    accResultFile: string | null;
    respTimer: string;
    accTimer: string;
    createdAt: string;
    updatedAt: string;
    checklist?: Checklist;
}

export interface ChecklistIndexData {
    checklists: Checklist[];
    groupedChecklists: { [key: string]: Checklist[] };
    userTasksResponsibility: ChecklistReport[];
    userTasksAccountability: ChecklistReport[];
    userId: string;
    userRole: string;
}

export interface CreateChecklistInput {
    taskName: string;
    frequency: string;
    frequencyCondition?: number;
    responsibility: string;
    accountability: string;
    description?: string;
}

export interface UpdateChecklistInput extends Partial<CreateChecklistInput> {}

export interface ResponsibilityRemarkInput {
    respRemark: string;
}

export interface AccountabilityRemarkInput {
    accRemark: string;
}

export interface GetTasksInput {
    user: string;
    month: string;
}

export interface DayResult {
    tasks: TaskReport[];
    accountability_tasks: TaskReport[];
    total: number;
    completed: number;
    percentage: number;
}

export interface TaskReport {
    id: number;
    task_name: string;
    frequency: string;
    responsible_user?: string;
    responsible_user_id: string;
    accountable_user?: string;
    accountable_user_id: string;
    completed_at?: string | null;
    remark?: string | null;
    result_file?: string | null;
}

export const FREQUENCY_OPTIONS = ["Daily", "Weekly", "Monthly", "Quarterly", "Annual"] as const;
export type FrequencyType = (typeof FREQUENCY_OPTIONS)[number];

export const WEEKDAYS = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
];