import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, gte, lte } from 'drizzle-orm';
import { businessCalendar } from '@db/schemas/workflow/workflows.schema';
import { DRIZZLE } from '@/db/database.module';
import type { DbInstance } from '@db';

@Injectable()
export class BusinessCalendarService {
    private readonly logger = new Logger(BusinessCalendarService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) { }

    /**
     * Check if a date is a business day
     */
    async isBusinessDay(date: Date): Promise<boolean> {
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        // Check if date is in business calendar
        const [result] = await this.db
            .select()
            .from(businessCalendar)
            .where(eq(businessCalendar.date, dateOnly))
            .limit(1);

        if (result) {
            return !result.isHoliday && !result.isWeekend;
        }

        // Default: weekends are not business days
        return date.getDay() !== 0 && date.getDay() !== 6;
    }

    /**
     * Add business hours to a date
     */
    async addBusinessHours(startDate: Date, hoursToAddMs: number): Promise<Date> {
        let currentDate = new Date(startDate);
        let remainingMs = hoursToAddMs;

        // Assuming 8-hour workdays (9 AM to 5 PM)
        const WORKDAY_START_HOUR = 9;
        const WORKDAY_END_HOUR = 17;
        const WORKDAY_HOURS = WORKDAY_END_HOUR - WORKDAY_START_HOUR;
        const WORKDAY_MS = WORKDAY_HOURS * 60 * 60 * 1000;

        while (remainingMs > 0) {
            // Check if current day is a business day
            const isBusinessDay = await this.isBusinessDay(currentDate);

            if (isBusinessDay) {
                // Calculate workday start and end
                const workdayStart = new Date(currentDate);
                workdayStart.setHours(WORKDAY_START_HOUR, 0, 0, 0);

                const workdayEnd = new Date(currentDate);
                workdayEnd.setHours(WORKDAY_END_HOUR, 0, 0, 0);

                // If current time is before workday start, move to workday start
                if (currentDate < workdayStart) {
                    currentDate = workdayStart;
                }

                // If current time is after workday end, move to next day
                if (currentDate >= workdayEnd) {
                    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
                    currentDate.setHours(WORKDAY_START_HOUR, 0, 0, 0);
                    continue;
                }

                // Calculate how much time we can add today
                const timeLeftToday = workdayEnd.getTime() - currentDate.getTime();
                const msToAddToday = Math.min(remainingMs, timeLeftToday);

                // Add time
                currentDate = new Date(currentDate.getTime() + msToAddToday);
                remainingMs -= msToAddToday;
            }

            // If we still have time to add, move to next day
            if (remainingMs > 0) {
                currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
                currentDate.setHours(WORKDAY_START_HOUR, 0, 0, 0);
            }
        }

        return currentDate;
    }

    /**
     * Calculate business hours between two dates
     */
    async calculateBusinessHours(startDate: Date, endDate: Date): Promise<number> {
        let currentDate = new Date(startDate);
        let businessHours = 0;

        // Assuming 8-hour workdays (9 AM to 5 PM)
        const WORKDAY_START_HOUR = 9;
        const WORKDAY_END_HOUR = 17;

        while (currentDate < endDate) {
            const isBusinessDay = await this.isBusinessDay(currentDate);

            if (isBusinessDay) {
                // Calculate workday start and end
                const workdayStart = new Date(currentDate);
                workdayStart.setHours(WORKDAY_START_HOUR, 0, 0, 0);

                const workdayEnd = new Date(currentDate);
                workdayEnd.setHours(WORKDAY_END_HOUR, 0, 0, 0);

                // Calculate effective start and end for this day
                const effectiveStart = currentDate < workdayStart ? workdayStart : currentDate;
                const effectiveEnd = endDate < workdayEnd ? endDate : workdayEnd;

                if (effectiveStart < effectiveEnd) {
                    businessHours += (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60);
                }
            }

            // Move to next day
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
        }

        return businessHours;
    }
}
