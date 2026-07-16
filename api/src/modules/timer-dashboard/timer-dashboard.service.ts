import type { DbInstance } from '@/db';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { TimersService } from '@/modules/timers/timers.service';
import { DRIZZLE } from '@db/database.module';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, sql, eq } from 'drizzle-orm';

@Injectable()
export class TimerDashboardService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly timersService: TimersService,
    ) { }

    async search(by: string, value: string) {
        let tenderId: number;

        switch (by) {
            case 'id': {
                const id = Number.parseInt(value, 10);
                if (Number.isNaN(id)) {
                    throw new BadRequestException('Invalid tender ID');
                }
                const tender = await this.tenderInfosService.findById(id);
                if (!tender) {
                    throw new NotFoundException(`Tender with ID ${id} not found`);
                }
                tenderId = id;
                break;
            }

            case 'tender_no': {
                const searchStr = `%${value}%`;
                const [tender] = await this.db
                    .select({ id: tenderInfos.id, tenderNo: tenderInfos.tenderNo, tenderName: tenderInfos.tenderName })
                    .from(tenderInfos)
                    .where(
                        and(
                            eq(tenderInfos.tlStatus, 1),
                            eq(tenderInfos.deleteStatus, 0),
                            sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`
                        )
                    )
                    .limit(1);
                if (!tender) {
                    throw new NotFoundException(`No tender found with number matching "${value}"`);
                }
                tenderId = tender.id;
                break;
            }

            case 'tender_name': {
                const searchStr = `%${value}%`;
                const [tender] = await this.db
                    .select({ id: tenderInfos.id, tenderNo: tenderInfos.tenderNo, tenderName: tenderInfos.tenderName })
                    .from(tenderInfos)
                    .where(
                        and(
                            eq(tenderInfos.tlStatus, 1),
                            eq(tenderInfos.deleteStatus, 0),
                            sql`${tenderInfos.tenderName} ILIKE ${searchStr}`
                        )
                    )
                    .limit(1);
                if (!tender) {
                    throw new NotFoundException(`No tender found with name matching "${value}"`);
                }
                tenderId = tender.id;
                break;
            }

            default:
                throw new BadRequestException(`Invalid search field: "${by}". Use "id", "tender_no", or "tender_name"`);
        }

        const tender = await this.tenderInfosService.findById(tenderId);
        const timers = await this.timersService.getTimers('TENDER', tenderId);

        return { tender, timers };
    }
}
