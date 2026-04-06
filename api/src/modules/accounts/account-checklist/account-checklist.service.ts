// src/modules/accounts/checklist/checklist.service.ts
import { Inject, Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { eq, and, desc, or, gte, lte, isNull, inArray, sql } from "drizzle-orm";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";
import { accountChecklist } from "@/db/schemas/accounts/account-checklist";
import { accountChecklistReport } from "@/db/schemas/accounts/account-checklist-report";
import { users } from "@/db/schemas/auth/users.schema";

import type { CreateChecklistDto, UpdateChecklistInput, ResponsibilityRemarkDto, GetTasksDto, AccountabilityRemarkDto } from "./account-checklist.controller";

import { MailerService } from "@/mailer/mailer.service";
import { GoogleService } from "@/modules/integrations/google/google.service";
import { MailAudienceService } from "@/core/mail/mail-audience.service";


// Helper types
export interface GroupedChecklists {
    [key: string]: any[];
}

interface TaskReport {
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

export interface DayResult {
    tasks: TaskReport[];
    accountability_tasks: TaskReport[];
    total: number;
    completed: number;
    percentage: number;
}

@Injectable()
export class AccountChecklistService {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger,

        @Inject(DRIZZLE)
        private readonly db: DbInstance,

        private readonly mailerService: MailerService,
        private readonly googleService: GoogleService,
        private readonly mailAudience: MailAudienceService
    ) {}

    /**
     * Get all checklists with user details, filtered by role
     */
    async findAll(userId: number, userRole: string) {
        this.logger.info("Fetching checklists", { userId, userRole });

        try {
            let query = this.db
                .select({
                    id: accountChecklist.id,
                    taskName: accountChecklist.taskName,
                    frequency: accountChecklist.frequency,
                    frequencyCondition: accountChecklist.frequencyCondition,
                    responsibility: accountChecklist.responsibility,
                    accountability: accountChecklist.accountability,
                    description: accountChecklist.description,
                    createdAt: accountChecklist.createdAt,
                    updatedAt: accountChecklist.updatedAt,
                    responsibleUserName: sql<string>`responsible_user.name`,
                    responsibleUserEmail: sql<string>`responsible_user.email`,
                    accountableUserName: sql<string>`accountable_user.name`,
                    accountableUserEmail: sql<string>`accountable_user.email`,
                })
                .from(accountChecklist)
                .leftJoin(
                    sql`${users} as responsible_user`,
                    sql`responsible_user.id = ${accountChecklist.responsibility}::bigint`
                )
                .leftJoin(
                    sql`${users} as accountable_user`,
                    sql`accountable_user.id = ${accountChecklist.accountability}::bigint`
                );

            const normalizedRole = userRole?.toLowerCase() || "";
            const isAdminView = ["admin", "super user", "coordinator"].includes(normalizedRole);

            // Apply role-based filtering
            if (!isAdminView) {
                query = query.where(
                    or(
                        eq(accountChecklist.responsibility, String(userId)),
                        eq(accountChecklist.accountability, String(userId))
                    )
                ) as any;
            }

            const checklists = await query;

            this.logger.debug("Checklists fetched", { count: checklists.length });

            return checklists;
        } catch (error: any) {
            this.logger.error("Failed to fetch checklists", {
                error: error.message,
                userId,
                userRole,
            });
            throw error;
        }
    }

    /**
     * Get grouped checklists for index view
     */
    async getIndexData(userId: number, userRole: string) {
        this.logger.info("Getting index data", { userId, userRole });

        const checklists = await this.findAll(userId, userRole);

        let groupedChecklists: GroupedChecklists = {};
        
        const normalizedRole = userRole?.toLowerCase() || "";
        const isAdminView = ["admin", "super user", "coordinator"].includes(normalizedRole);
        
        if (isAdminView) {
            // Group by responsibility
            checklists.forEach(checklist => {
                const key = checklist.responsibility;
                if (!groupedChecklists[key]) {
                    groupedChecklists[key] = [];
                }
                groupedChecklists[key].push(checklist);
            });
        } else {
            // Group by frequency
            checklists.forEach(checklist => {
                const key = checklist.frequency;
                if (!groupedChecklists[key]) {
                    groupedChecklists[key] = [];
                }
                groupedChecklists[key].push(checklist);
            });
        }

        // Get user tasks if not admin/coordinator
        let userTasksResponsibility: any[] = [];
        let userTasksAccountability: any[] = [];

        if (!isAdminView) {
            // Get incomplete responsibility tasks
            userTasksResponsibility = await this.db
                .select(
                    {
                        id: accountChecklistReport.id,
                        dueDate: accountChecklistReport.dueDate,
                        respCompletedAt: accountChecklistReport.respCompletedAt,
                        accCompletedAt: accountChecklistReport.accCompletedAt,
                        respRemark: accountChecklistReport.respRemark,
                        respResultFile: accountChecklistReport.respResultFile,
                        responsibleUserName: sql<string>`responsible_user.name`,
                        accountableUserName: sql<string>`accountable_user.name`,

                        createdAt: accountChecklist.createdAt, 
                        updatedAt: accountChecklist.updatedAt,  

                        checklistId: accountChecklist.id,
                        description: accountChecklist.description,
                        taskName: accountChecklist.taskName,
                        frequency: accountChecklist.frequency,
                    }
                )
                .from(accountChecklistReport)
                .leftJoin(
                    accountChecklist,
                    eq(accountChecklistReport.checklistId, accountChecklist.id)
                )
                .leftJoin(
                    sql`${users} as responsible_user`,
                    sql`responsible_user.id = ${accountChecklist.responsibility}::bigint`
                )
                .leftJoin(
                    sql`${users} as accountable_user`,
                    sql`accountable_user.id = ${accountChecklist.accountability}::bigint`
                )
                .where(
                    and(
                        eq(accountChecklistReport.responsibleUserId, userId),
                        isNull(accountChecklistReport.respCompletedAt)
                    )
                )
                .orderBy(desc(accountChecklistReport.dueDate));

            // Get incomplete accountability tasks
            userTasksAccountability = await this.db
                .select(                    {
                        id: accountChecklistReport.id,
                        dueDate: accountChecklistReport.dueDate,
                        respCompletedAt: accountChecklistReport.respCompletedAt,
                        accCompletedAt: accountChecklistReport.accCompletedAt,
                        respRemark: accountChecklistReport.respRemark,
                        respResultFile: accountChecklistReport.respResultFile,
                        responsibleUserName: sql<string>`responsible_user.name`,
                        accountableUserName: sql<string>`accountable_user.name`,

                        createdAt: accountChecklist.createdAt, 
                        updatedAt: accountChecklist.updatedAt,  

                        checklistId: accountChecklist.id,
                        description: accountChecklist.description,
                        taskName: accountChecklist.taskName,
                        frequency: accountChecklist.frequency,
                    })
                .from(accountChecklistReport)
                .leftJoin(
                    accountChecklist,
                    eq(accountChecklistReport.checklistId, accountChecklist.id)
                )
                .leftJoin(
                    sql`${users} as responsible_user`,
                    sql`responsible_user.id = ${accountChecklist.responsibility}::bigint`
                )
                .leftJoin(
                    sql`${users} as accountable_user`,
                    sql`accountable_user.id = ${accountChecklist.accountability}::bigint`
                )
                .where(
                    and(
                        eq(accountChecklistReport.accountableUserId, userId),
                        isNull(accountChecklistReport.accCompletedAt)
                    )
                )
                .orderBy(desc(accountChecklistReport.dueDate));
        }

        return {
            checklists,
            groupedChecklists,
            userTasksResponsibility,
            userTasksAccountability,
            userId,
            userRole,
        };
    }

    /**
     * Create a new checklist
     */
    async create(data: CreateChecklistDto) {
        this.logger.info("Creating checklist", { data });

        try {
            const values = {
                taskName: data.taskName,
                frequency: data.frequency,
                frequencyCondition: data.frequencyCondition ?? null,
                responsibility: data.responsibility,
                accountability: data.accountability,
                description: data.description ?? null,
            };

            const [checklist] = await this.db
                .insert(accountChecklist)
                .values(values)
                .returning();

            this.logger.info("Checklist created successfully", {
                checklistId: checklist.id,
            });

            return checklist;
        } catch (error: any) {
            this.logger.error("Failed to create checklist", {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    /**
     * Find a single checklist by ID
     */
    async findOne(id: number) {
        this.logger.debug("Finding checklist", { checklistId: id });

        const [checklist] = await this.db
            .select()
            .from(accountChecklist)
            .where(eq(accountChecklist.id, id))
            .limit(1);

        if (!checklist) {
            this.logger.warn("Checklist not found", { checklistId: id });
            throw new NotFoundException("Checklist not found");
        }

        return checklist;
    }

    /**
     * Update a checklist
     */
    async update(id: number, data: UpdateChecklistInput) {
        this.logger.info("Updating checklist", { checklistId: id });

        try {
            const existing = await this.findOne(id);

            const updateData: any = {
                updatedAt: new Date(),
            };

            if (data.taskName !== undefined) updateData.taskName = data.taskName;
            if (data.frequency !== undefined) updateData.frequency = data.frequency;
            if (data.frequencyCondition !== undefined) 
                updateData.frequencyCondition = data.frequencyCondition;
            if (data.responsibility !== undefined) 
                updateData.responsibility = data.responsibility;
            if (data.accountability !== undefined) 
                updateData.accountability = data.accountability;
            if (data.description !== undefined) 
                updateData.description = data.description;

            const [updated] = await this.db
                .update(accountChecklist)
                .set(updateData)
                .where(eq(accountChecklist.id, id))
                .returning();

            this.logger.info("Checklist updated successfully", { checklistId: id });

            return updated;
        } catch (error: any) {
            this.logger.error("Failed to update checklist", {
                checklistId: id,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Delete a checklist
     */
    async delete(id: number) {
        this.logger.warn("Deleting checklist", { checklistId: id });

        try {
            await this.findOne(id);

            await this.db
                .delete(accountChecklist)
                .where(eq(accountChecklist.id, id));

            this.logger.warn("Checklist deleted", { checklistId: id });

            return { success: true };
        } catch (error: any) {
            this.logger.error("Failed to delete checklist", {
                checklistId: id,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Store responsibility remark
     */
    async storeResponsibilityRemark(
        id: number,
        data: ResponsibilityRemarkDto,
        file: Express.Multer.File | undefined,
        userId: number
    ) {
        this.logger.info("Storing responsibility remark", {
            reportId: id,
            userId,
            hasFile: !!file,
        });

        try {
            let fileName: string | null = null;

            if (file) {
                fileName = file.filename;
            }

            // Find the report
            const [report] = await this.db
                .select()
                .from(accountChecklistReport)
                .where(
                    and(
                        eq(accountChecklistReport.id, id),
                        eq(accountChecklistReport.responsibleUserId, userId),
                        isNull(accountChecklistReport.respCompletedAt)
                    )
                )
                .orderBy(accountChecklistReport.dueDate)
                .limit(1);

            if (!report) {
                throw new NotFoundException("Report not found or already completed");
            }

            const now = new Date();
            const dueDate = new Date(report.dueDate!);
            const timerSeconds = Math.floor((now.getTime() - dueDate.getTime()) / 1000);

            const [updated] = await this.db
                .update(accountChecklistReport)
                .set({
                    respRemark: data.respRemark,
                    respResultFile: fileName,
                    respCompletedAt: now,
                    respTimer: timerSeconds.toString(),
                    updatedAt: now,
                })
                .where(eq(accountChecklistReport.id, id))
                .returning();

            this.logger.info("Responsibility remark saved successfully", {
                reportId: id,
            });

            return updated;
        } catch (error: any) {
            this.logger.error("Failed to save responsibility remark", {
                reportId: id,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Store accountability remark
     */
    async storeAccountabilityRemark(
        id: number,
        data: AccountabilityRemarkDto,
        file: Express.Multer.File | undefined,
        userId: number
    ) {
        this.logger.info("Storing accountability remark", {
            reportId: id,
            userId,
            hasFile: !!file,
        });

        try {
            let fileName: string | null = null;

            if (file) {
                fileName = file.filename;
            }

            // Find the report
            const [report] = await this.db
                .select()
                .from(accountChecklistReport)
                .where(
                    and(
                        eq(accountChecklistReport.id, id),
                        eq(accountChecklistReport.accountableUserId, userId),
                        isNull(accountChecklistReport.accCompletedAt)
                    )
                )
                .orderBy(accountChecklistReport.dueDate)
                .limit(1);

            if (!report) {
                throw new NotFoundException("Report not found or already completed");
            }

            const now = new Date();
            const dueDate = new Date(report.dueDate!);
            const timerSeconds = Math.floor((now.getTime() - dueDate.getTime()) / 1000);

            const [updated] = await this.db
                .update(accountChecklistReport)
                .set({
                    accRemark: data.accRemark,
                    accResultFile: fileName,
                    accCompletedAt: now,
                    accTimer: timerSeconds.toString(),
                    updatedAt: now,
                })
                .where(eq(accountChecklistReport.id, id))
                .returning();

            this.logger.info("Accountability remark saved successfully", {
                reportId: id,
            });

            return updated;
        } catch (error: any) {
            this.logger.error("Failed to save accountability remark", {
                reportId: id,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Get tasks for a specific user and month
     */
    async getTasks(data: GetTasksDto) {
        this.logger.info("Getting tasks", { data });

        try {
            console.log({"task data": data});
            const userId = String(data.user);
            const month = data.month;
            
            const startDate = new Date(`${month}-01`);
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
            endDate.setDate(0); // Last day of month

            const checklists = await this.getRelevantChecklists(userId, endDate);

            if (checklists.length === 0) {
                return this.buildEmptyMonthResult(startDate);
            }

            const reports = await this.getReportsGroupedByDate(
                checklists.map(c => c.id),
                startDate,
                endDate
            );

            const result = await this.buildDayWiseResult(
                checklists,
                reports,
                userId,
                startDate
            );

            return result;
        } catch (error: any) {
            this.logger.error("Failed to get tasks", {
                error: error.message,
                data,
            });
            throw error;
        }
    }

    /**
     * Get checklists relevant to the user up to the end date
     */
    private async getRelevantChecklists(userId: string, endDate: Date) {
        return await this.db
            .select()
            .from(accountChecklist)
            .where(
                and(
                    or(
                        eq(accountChecklist.responsibility, userId),
                        eq(accountChecklist.accountability, userId)
                    ),
                    lte(accountChecklist.createdAt, endDate)
                )
            );
    }

    /**
     * Get reports for the checklists grouped by date
     */
    private async getReportsGroupedByDate(
        checklistIds: number[],
        startDate: Date,
        endDate: Date
    ) {
        const reports = await this.db
            .select()
            .from(accountChecklistReport)
            .where(
                and(
                    inArray(accountChecklistReport.checklistId, checklistIds),
                    gte(accountChecklistReport.dueDate, startDate),
                    lte(accountChecklistReport.dueDate, endDate)
                )
            );

        // Group by date
        const grouped: { [key: string]: any[] } = {};
        reports.forEach(report => {
            const dateKey = report.dueDate!.toISOString().split('T')[0];
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(report);
        });

        return grouped;
    }

    /**
     * Build empty month result
     */
    private buildEmptyMonthResult(startDate: Date): { [key: string]: DayResult } {
        const result: { [key: string]: DayResult } = {};
        const daysInMonth = new Date(
            startDate.getFullYear(),
            startDate.getMonth() + 1,
            0
        ).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(startDate);
            date.setDate(day);
            const dateKey = date.toISOString().split('T')[0];

            result[dateKey] = {
                tasks: [],
                accountability_tasks: [],
                total: 0,
                completed: 0,
                percentage: 0,
            };
        }

        return result;
    }

    /**
     * Build day-wise result for the month
     */
    private async buildDayWiseResult(
        checklists: any[],
        reports: { [key: string]: any[] },
        userId: string,
        startDate: Date
    ): Promise<{ [key: string]: DayResult }> {
        const result: { [key: string]: DayResult } = {};
        const daysInMonth = new Date(
            startDate.getFullYear(),
            startDate.getMonth() + 1,
            0
        ).getDate();

        // Get user details for checklists
        const userIds = new Set<string>();
        checklists.forEach(c => {
            userIds.add(c.responsibility);
            userIds.add(c.accountability);
        });

        const userDetails = await this.db
            .select()
            .from(users)
            .where(
                inArray(users.id, Array.from(userIds).map(id => parseInt(id)))
            );

        const userMap = new Map(userDetails.map(u => [u.id.toString(), u]));

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(startDate);
            date.setDate(day);
            const dateKey = date.toISOString().split('T')[0];
            const dailyReports = reports[dateKey] || [];

            const dailyTasks: TaskReport[] = [];
            const accountabilityTasks: TaskReport[] = [];

            for (const checklist of checklists) {
                // Skip if checklist didn't exist on this day
                if (new Date(checklist.createdAt!) > date) {
                    continue;
                }

                const frequency = checklist.frequency.toLowerCase();
                let addTask = false;

                if (frequency === "daily") {
                    addTask = true;
                } else if (frequency === "weekly") {
                    const weeklyDay = checklist.frequencyCondition;
                    if (weeklyDay !== null && date.getDay() === weeklyDay) {
                        addTask = true;
                    }
                } else if (frequency === "monthly") {
                    const monthlyDay = checklist.frequencyCondition;
                    if (monthlyDay && date.getDate() === monthlyDay) {
                        addTask = true;
                    }
                }

                if (!addTask) {
                    continue;
                }

                const report = dailyReports.find(
                    r => r.checklistId === checklist.id
                );

                const isResponsible = checklist.responsibility === userId;
                const isAccountable = checklist.accountability === userId;

                let completedAt: string | null = null;
                let remark: string | null = null;
                let file: string | null = null;

                if (report) {
                    if (isResponsible) {
                        completedAt = report.respCompletedAt 
                            ? report.respCompletedAt.toISOString().substring(11, 19)
                            : null;
                        remark = report.respRemark;
                        file = report.respResultFile;
                    } else if (isAccountable) {
                        completedAt = report.accCompletedAt
                            ? report.accCompletedAt.toISOString().substring(11, 19)
                            : null;
                        remark = report.accRemark;
                        file = report.accResultFile;
                    }
                }

                const responsibleUser = userMap.get(checklist.responsibility);
                const accountableUser = userMap.get(checklist.accountability);

                dailyTasks.push({
                    id: checklist.id,
                    task_name: checklist.taskName,
                    frequency: checklist.frequency,
                    responsible_user: responsibleUser?.name,
                    responsible_user_id: checklist.responsibility,
                    accountable_user: accountableUser?.name,
                    accountable_user_id: checklist.accountability,
                    completed_at: completedAt,
                    remark,
                    result_file: file,
                });
            }

            // For accountability tasks, use previous day's dailyTasks
            if (day > 1) {
                const prevDate = new Date(date);
                prevDate.setDate(prevDate.getDate() - 1);
                const prevDateKey = prevDate.toISOString().split('T')[0];
                const prevTasks = result[prevDateKey]?.tasks || [];

                prevTasks.forEach(task => {
                    if (task.accountable_user_id === userId) {
                        accountabilityTasks.push(task);
                    }
                });
            }

            const total = dailyTasks.length;
            const completed = dailyTasks.filter(t => t.completed_at).length;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

            result[dateKey] = {
                tasks: dailyTasks,
                accountability_tasks: accountabilityTasks,
                total,
                completed,
                percentage,
            };
        }

        return result;
    }

    /**
     * Generate checklist tasks (daily at 01:00)
     */
    async generateChecklistTasks() {
        this.logger.info("🟢 generateChecklistTasks started");
        
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday
        const dayOfMonth = today.getDate();

        this.logger.info(`📆 Today: ${today.toDateString()}, Day of week: ${dayOfWeek}, Day of month: ${dayOfMonth}`);

        // Only run on Mon-Sat (skip Sunday)
        if (dayOfWeek === 0) {
            this.logger.info("⛔ Today is Sunday. Skipping task creation.");
            return;
        }

        // 8:00 PM today
        const dueDateResp = new Date(today);
        dueDateResp.setHours(20, 0, 0, 0);

        const startOfDay = new Date(dueDateResp);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dueDateResp);
        endOfDay.setHours(23, 59, 59, 999);

        const checklists = await this.db.select().from(accountChecklist);
        this.logger.info(`📋 Total checklists found: ${checklists.length}`);

        let created = 0;

        for (const checklist of checklists) {
            let shouldInsert = false;
            let reason = "";

            if (checklist.frequency === "Daily" || checklist.frequency === "daily") {
                shouldInsert = true;
                reason = "Daily";
            } else if (checklist.frequency === "Weekly" || checklist.frequency === "weekly") {
                if (checklist.frequencyCondition !== null && dayOfWeek === checklist.frequencyCondition) {
                    shouldInsert = true;
                    reason = "Weekly (matches today)";
                } else {
                    reason = "Weekly (does not match today)";
                }
            } else if (checklist.frequency === "Monthly" || checklist.frequency === "monthly") {
                if (checklist.frequencyCondition !== null && dayOfMonth === checklist.frequencyCondition) {
                    shouldInsert = true;
                    reason = "Monthly (matches today)";
                } else {
                    reason = "Monthly (does not match today)";
                }
            } else {
                reason = "frequency does not match today";
            }

            this.logger.info(`Checklist #${checklist.id} [${checklist.taskName}] frequency: ${checklist.frequency} | Reason: ${reason}`);

            if (shouldInsert) {
                const [exists] = await this.db
                    .select({ id: accountChecklistReport.id })
                    .from(accountChecklistReport)
                    .where(
                        and(
                            eq(accountChecklistReport.checklistId, checklist.id),
                            eq(accountChecklistReport.responsibleUserId, Number(checklist.responsibility)),
                            eq(accountChecklistReport.accountableUserId, Number(checklist.accountability)),
                            gte(accountChecklistReport.dueDate, startOfDay),
                            lte(accountChecklistReport.dueDate, endOfDay)
                        )
                    )
                    .limit(1);

                if (!exists) {
                    await this.db.insert(accountChecklistReport).values({
                        checklistId: checklist.id,
                        responsibleUserId: Number(checklist.responsibility),
                        accountableUserId: Number(checklist.accountability),
                        dueDate: dueDateResp,
                    });
                    created++;
                    this.logger.info(`  -> Created checklist task for users ${checklist.responsibility} (resp) & ${checklist.accountability} (acct) due ${dueDateResp}`);
                } else {
                    this.logger.info(`  -> Checklist task already exists due ${dueDateResp}`);
                }
            } else {
                this.logger.info(`  -> Skipped: ${reason}`);
            }
        }
        this.logger.info(`Checklist tasks generated: ${created}`);
    }

    /**
     * Enqueue EOD checklist reports (called by cron job)
     */
    async enqueueEodMails(queue: import("bullmq").Queue) {
        this.logger.info("Starting enqueue EOD checklist reports");

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const todayReports = await this.db
                .select()
                .from(accountChecklistReport)
                .leftJoin(
                    accountChecklist,
                    eq(accountChecklistReport.checklistId, accountChecklist.id)
                )
                .where(
                    and(
                        gte(accountChecklistReport.dueDate, today),
                        lte(accountChecklistReport.dueDate, tomorrow)
                    )
                );

            // Group by accountable user
            const grouped: {
                [accountableId: string]: {
                    [responsibleId: string]: any[];
                };
            } = {};

            todayReports.forEach(({ account_checklist_report, account_checklist }) => {
                if (!account_checklist) return;

                const accountableId = account_checklist_report.accountableUserId!.toString();
                const responsibleId = account_checklist_report.responsibleUserId!.toString();

                if (!grouped[accountableId]) {
                    grouped[accountableId] = {};
                }
                if (!grouped[accountableId][responsibleId]) {
                    grouped[accountableId][responsibleId] = [];
                }

                // Push serializable data to avoid Date issues with BullMQ
                grouped[accountableId][responsibleId].push({
                    task_name: account_checklist.taskName,
                    completed_at: account_checklist_report.respCompletedAt || account_checklist_report.accCompletedAt,
                    remark: account_checklist_report.respRemark || account_checklist_report.accRemark,
                });
            });

            // Enqueue
            for (const [accountableId, responsibleGroups] of Object.entries(grouped)) {
                await queue.add(
                    "send-checklist-mail",
                    {
                        accountableId: parseInt(accountableId),
                        responsibleGroups,
                        date: new Date().toDateString() // Pass date string
                    },
                    {
                        attempts: 3,
                        backoff: { type: "exponential", delay: 10000 },
                    }
                );
            }

            // Also enqueue the admin compilation mail
            await queue.add(
                "send-checklist-admin-mail",
                {
                    grouped,
                    date: new Date().toDateString()
                },
                {
                    attempts: 3,
                    backoff: { type: "exponential", delay: 10000 },
                }
            );

            this.logger.info("EOD checklist reports enqueued successfully");
        } catch (error: any) {
            this.logger.error("Failed to enqueue EOD checklist reports", {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    /**
     * Process Job from Queue
     */
    async processChecklistMail(jobData: any, jobName: string) {
        this.logger.info(`Processing Checklist Mail: ${jobName}`, { jobData });
        
        if (jobName === "send-checklist-mail") {
            const { accountableId, responsibleGroups, date } = jobData;
            
            const [accountableUser] = await this.db
                .select()
                .from(users)
                .where(eq(users.id, accountableId))
                .limit(1);

            if (!accountableUser || !accountableUser.email) {
                this.logger.warn("Accountable user not found or email missing", { accountableId });
                return;
            }

            const adminEmails = ['goyal@volksenergie.in', 'arathi@volksenergie.in', 'imran@volksenergie.in', 'accounts@jsa.net.in'];

            for (const [responsibleIdStr, tasks] of Object.entries(responsibleGroups)) {
                const responsibleId = parseInt(responsibleIdStr);
                const [responsibleUser] = await this.db
                    .select()
                    .from(users)
                    .where(eq(users.id, responsibleId))
                    .limit(1);

                if (!responsibleUser) continue;

                // Format tasks for the template
                const formattedTasks = (tasks as any[]).map(t => ({
                    task_name: t.task_name,
                    accountable_user: accountableUser.name,
                    completed_at: t.completed_at,
                    remark: t.remark,
                }));

                const singleTablesPayload = [{
                    responsible_user: responsibleUser.name,
                    tasks: formattedTasks,
                }];

                const cc = responsibleId === 44
                    ? ['md@comfortinnkarnal.com', 'kainaat@volksenergie.in', 'accounts@jsa.net.in']
                    : adminEmails;

                this.logger.info(`Sending ${responsibleUser.name}'s report to accountable user: ${accountableUser.email}`);

                let googleConnection = await this.googleService.getSanitizedGoogleConnection(responsibleId);

                if (!googleConnection) {
                    const fallbackUserId = process.env.FALLBACK_MAIL_USER_ID;
                    if (fallbackUserId) {
                        googleConnection = await this.googleService.getSanitizedGoogleConnection(parseInt(fallbackUserId));
                    }
                }

                if (googleConnection) {
                    try {
                        await this.mailerService.sendMail(
                            {
                                name: "checklist-report",
                                basePath: "modules/accounts/account-checklist/mails",
                            },
                            {
                                date,
                                tables: singleTablesPayload,
                            },
                            {
                                to: [accountableUser.email],
                                cc,
                                bcc:["abhigaur.test@gmail.com"],
                                subject: `Account Checklist Report - ${date}`,
                            },
                            googleConnection
                        );
                        this.logger.info("Email sent for single checklist report");
                    } catch(e: any) {
                        this.logger.error("Error sending mail inside loop", { error: e.message });
                    }
                } else {
                    this.logger.warn(`No Google Connection found for user ${responsibleId} and no fallback`);
                }
            }
        } else if (jobName === "send-checklist-admin-mail") {
            const { grouped, date } = jobData;
            const adminEmails = ['goyal@volksenergie.in', 'arathi@volksenergie.in', 'imran@volksenergie.in', 'accounts@jsa.net.in'];

            const allTasks: any[] = [];

            for (const [accIdStr, respGroups] of Object.entries(grouped)) {
                let accName = "";
                const accId = parseInt(accIdStr);
                const [accUser] = await this.db.select().from(users).where(eq(users.id, accId)).limit(1);
                if (accUser) accName = accUser.name;

                for (const [respIdStr, tasks] of Object.entries(respGroups as any)) {
                    let respName = "";
                    const respId = parseInt(respIdStr);
                    const [respUser] = await this.db.select().from(users).where(eq(users.id, respId)).limit(1);
                    if (respUser) respName = respUser.name;

                    for (const t of (tasks as any[])) {
                        allTasks.push({
                            task_name: t.task_name,
                            responsible_user: respName,
                            accountable_user: accName,
                            completed_at: t.completed_at,
                            remark: t.remark,
                        });
                    }
                }
            }

            if (allTasks.length > 0) {
                const fallbackUserId = process.env.FALLBACK_MAIL_USER_ID;
                if (!fallbackUserId) {
                    this.logger.warn("No fallback user ID to send admin consolidated mail");
                    return;
                }
                
                const googleConnection = await this.googleService.getSanitizedGoogleConnection(parseInt(fallbackUserId));
                
                if (googleConnection) {
                    try {
                        await this.mailerService.sendMail(
                            {
                                name: "checklist-report",
                                basePath: "modules/accounts/account-checklist/mails",
                            },
                            {
                                date,
                                tables: [{ responsible_user: 'All', tasks: allTasks }],
                            },
                            {
                                to: adminEmails,
                                bcc:["abhigaur.test@gmail.com"],
                                subject: `Account Checklist Consolidated Report - ${date}`,
                            },
                            googleConnection
                        );
                        this.logger.info("Admin consolidated email sent");
                    } catch(e: any) {
                        this.logger.error("Error sending admin consolidated mail", { error: e.message });
                    }
                } else {
                    this.logger.warn("No Google Connection fallback found for admin email");
                }
            }
        }
    }
}