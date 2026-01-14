import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, between } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '@db';
import { businessCalendar, appSettings } from '@db/schemas/workflow/workflows.schema';

interface WorkingHours {
    start: string; // "10:00"
    end: string;   // "18:30"
    isWorking: boolean;
}

interface WorkingHoursConfig {
    monday: WorkingHours;
    tuesday: WorkingHours;
    wednesday: WorkingHours;
    thursday: WorkingHours;
    friday: WorkingHours;
    saturday: WorkingHours;
    sunday: WorkingHours;
}

@Injectable()
export class BusinessCalendarService {
    private workingHoursCache: WorkingHoursConfig | null = null;
    private holidayCache: Map<string, boolean> = new Map();
    private cacheExpiry: Date | null = null;

    constructor(
        @Inject('DATABASE_CONNECTION')
        private readonly db: PostgresJsDatabase<typeof schema>,
    ) { }

    /**
     * Get working hours configuration
     */
    async getWorkingHours(): Promise<WorkingHoursConfig> {
        // Return cached if valid
        if (this.workingHoursCache && this.cacheExpiry && this.cacheExpiry > new Date()) {
            return this.workingHoursCache;
        }

        // Load from database
        const settings = await this.db
            .select({ value: appSettings.value })
            .from(appSettings)
            .where(eq(appSettings.key, 'working_hours'))
            .limit(1);

        if (settings.length === 0) {
            // Default working hours if not set
            this.workingHoursCache = {
                monday: { start: '10:00', end: '18:30', isWorking: true },
                tuesday: { start: '10:00', end: '18:30', isWorking: true },
                wednesday: { start: '10:00', end: '18:30', isWorking: true },
                thursday: { start: '10:00', end: '18:30', isWorking: true },
                friday: { start: '10:00', end: '18:30', isWorking: true },
                saturday: { start: '10:00', end: '17:30', isWorking: true },
                sunday: { start: '00:00', end: '00:00', isWorking: false },
            };
        } else {
            this.workingHoursCache = settings[0].value as WorkingHoursConfig;
        }

        // Cache for 1 hour
        this.cacheExpiry = new Date(Date.now() + 60 * 60 * 1000);

        return this.workingHoursCache;
    }

    /**
     * Check if a date is a holiday
     */
    async isHoliday(date: Date): Promise<boolean> {
        const dateStr = this.getDateString(date);

        // Check cache
        if (this.holidayCache.has(dateStr)) {
            return this.holidayCache.get(dateStr)!;
        }

        // Query database
        const holiday = await this.db
            .select({ isHoliday: businessCalendar.isHoliday })
            .from(businessCalendar)
            .where(eq(businessCalendar.date, date))
            .limit(1);

        const result = holiday.length > 0 && holiday[0].isHoliday;
        this.holidayCache.set(dateStr, result);

        return result;
    }

    /**
     * Check if a date is a weekend
     */
    isWeekend(date: Date): boolean {
        const day = date.getDay();
        return day === 0; // Sunday (Saturday is half-day)
    }

    /**
     * Check if a date is a working day
     */
    async isWorkingDay(date: Date): Promise<boolean> {
        // Check weekend
        if (this.isWeekend(date)) {
            return false;
        }

        // Check holiday
        const holiday = await this.isHoliday(date);
        if (holiday) {
            return false;
        }

        return true;
    }

    /**
     * Get working hours for a specific day
     */
    async getWorkingHoursForDay(date: Date): Promise<WorkingHours> {
        const config = await this.getWorkingHours();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[date.getDay()] as keyof WorkingHoursConfig;

        return config[dayName];
    }

    /**
     * Calculate business hours between two dates
     */
    async calculateBusinessHours(startDate: Date, endDate: Date): Promise<number> {
        if (endDate <= startDate) {
            return 0;
        }

        let totalMs = 0;
        const currentDate = new Date(startDate);

        // Load holidays for the date range
        await this.loadHolidaysForRange(startDate, endDate);

        while (currentDate < endDate) {
            const dayStart = new Date(currentDate);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);

            // Check if working day
            const isWorking = await this.isWorkingDay(currentDate);

            if (isWorking) {
                const workingHours = await this.getWorkingHoursForDay(currentDate);

                if (workingHours.isWorking) {
                    // Parse working hours
                    const [startHour, startMinute] = workingHours.start.split(':').map(Number);
                    const [endHour, endMinute] = workingHours.end.split(':').map(Number);

                    // Set day boundaries
                    const workStart = new Date(currentDate);
                    workStart.setHours(startHour, startMinute, 0, 0);

                    const workEnd = new Date(currentDate);
                    workEnd.setHours(endHour, endMinute, 0, 0);

                    // Calculate effective time for this day
                    const effectiveStart = currentDate > workStart ? currentDate : workStart;
                    const effectiveEnd = endDate < workEnd ? endDate : workEnd;

                    if (effectiveStart < effectiveEnd) {
                        totalMs += effectiveEnd.getTime() - effectiveStart.getTime();
                    }
                }
            }

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(0, 0, 0, 0);
        }

        return totalMs;
    }

    /**
     * Add business hours to a date
     */
    async addBusinessHours(startDate: Date, durationMs: number): Promise<Date> {
        let remainingMs = durationMs;
        const currentDate = new Date(startDate);

        while (remainingMs > 0) {
            // Check if working day
            const isWorking = await this.isWorkingDay(currentDate);

            if (isWorking) {
                const workingHours = await this.getWorkingHoursForDay(currentDate);

                if (workingHours.isWorking) {
                    // Parse working hours
                    const [startHour, startMinute] = workingHours.start.split(':').map(Number);
                    const [endHour, endMinute] = workingHours.end.split(':').map(Number);

                    // Set day boundaries
                    const workStart = new Date(currentDate);
                    workStart.setHours(startHour, startMinute, 0, 0);

                    const workEnd = new Date(currentDate);
                    workEnd.setHours(endHour, endMinute, 0, 0);

                    // If current time is before work start, jump to work start
                    if (currentDate < workStart) {
                        currentDate.setTime(workStart.getTime());
                    }

                    // Calculate available time today
                    const availableMs = workEnd.getTime() - currentDate.getTime();

                    if (availableMs <= 0) {
                        // Already past working hours, move to next day
                        currentDate.setDate(currentDate.getDate() + 1);
                        currentDate.setHours(startHour, startMinute, 0, 0);
                        continue;
                    }

                    if (remainingMs <= availableMs) {
                        // Can finish today
                        currentDate.setTime(currentDate.getTime() + remainingMs);
                        remainingMs = 0;
                    } else {
                        // Need more days
                        remainingMs -= availableMs;
                        currentDate.setDate(currentDate.getDate() + 1);
                        currentDate.setHours(startHour, startMinute, 0, 0);
                    }
                } else {
                    // Not a working day according to config
                    currentDate.setDate(currentDate.getDate() + 1);
                    currentDate.setHours(0, 0, 0, 0);
                }
            } else {
                // Holiday or weekend, skip to next day
                currentDate.setDate(currentDate.getDate() + 1);
                currentDate.setHours(0, 0, 0, 0);
            }
        }

        return currentDate;
    }

    /**
     * Load holidays for a date range into cache
     */
    private async loadHolidaysForRange(startDate: Date, endDate: Date): Promise<void> {
        const holidays = await this.db
            .select({
                date: businessCalendar.date,
                isHoliday: businessCalendar.isHoliday,
            })
            .from(businessCalendar)
            .where(
                and(
                    sql`${businessCalendar.date} >= ${startDate}`,
                    sql`${businessCalendar.date} <= ${endDate}`,
                    eq(businessCalendar.isHoliday, true)
                )
            );

        for (const h of holidays) {
            this.holidayCache.set(this.getDateString(h.date), h.isHoliday);
        }
    }

    /**
     * Helper to get date string (YYYY-MM-DD)
     */
    private getDateString(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    /**
     * Clear cache (for testing or manual refresh)
     */
    clearCache(): void {
        this.workingHoursCache = null;
        this.holidayCache.clear();
        this.cacheExpiry = null;
    }
}
