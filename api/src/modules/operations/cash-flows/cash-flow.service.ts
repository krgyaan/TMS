import { Injectable, Inject } from '@nestjs/common';
import type { DbInstance } from '@/db';
import { DRIZZLE } from '@/db/database.module';
import { projectCashFlows } from '@/db/schemas/operations/project-cash-flows.schema';
import { eq, sql, and } from 'drizzle-orm';
import { CreateCashFlowDto } from './dto/cash-flow.dto';

@Injectable()
export class CashFlowService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DbInstance,
  ) {}

  async create(entry: CreateCashFlowDto) {
    return this.createInTransaction(this.db, entry);
  }

  async createInTransaction(tx: DbInstance, entry: CreateCashFlowDto) {
    const result = await tx
      .insert(projectCashFlows)
      .values({
        projectId: entry.projectId,
        eventType: entry.eventType,
        amount: entry.amount?.toString(),
        direction: entry.direction ?? 'outflow',
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        referenceNo: entry.referenceNo,
        tdsPercentage: entry.tdsPercentage?.toString(),
        tdsAmount: entry.tdsAmount?.toString(),
        gstAmount: entry.gstAmount?.toString(),
        remark: entry.remark,
        createdBy: entry.createdBy,
      })
      .returning();

    return result[0];
  }

  async createBulk(entries: CreateCashFlowDto[]) {
    const results: any[] = [];
    for (const entry of entries) {
      const row = await this.create(entry);
      results.push(row);
    }
    return results;
  }

  async getByProject(
    projectId: number,
    filters?: { eventType?: string; from?: Date; to?: Date }
  ) {
    const conditions: any[] = [sql`${projectCashFlows.projectId} = ${projectId}`];

    if (filters?.eventType) {
      conditions.push(sql`${projectCashFlows.eventType} = ${filters.eventType}`);
    }
    if (filters?.from) {
      conditions.push(sql`${projectCashFlows.createdAt} >= ${filters.from}`);
    }
    if (filters?.to) {
      conditions.push(sql`${projectCashFlows.createdAt} <= ${filters.to}`);
    }

    const rows = await this.db
      .select({
        id: projectCashFlows.id,
        projectId: projectCashFlows.projectId,
        eventType: projectCashFlows.eventType,
        amount: projectCashFlows.amount,
        direction: projectCashFlows.direction,
        referenceType: projectCashFlows.referenceType,
        referenceId: projectCashFlows.referenceId,
        referenceNo: projectCashFlows.referenceNo,
        tdsPercentage: projectCashFlows.tdsPercentage,
        tdsAmount: projectCashFlows.tdsAmount,
        gstAmount: projectCashFlows.gstAmount,
        remark: projectCashFlows.remark,
        createdAt: projectCashFlows.createdAt,
        createdBy: projectCashFlows.createdBy,
      })
      .from(projectCashFlows)
      .where(and(...conditions))
      .orderBy(projectCashFlows.createdAt);

    return rows;
  }

  async getSummary(projectId: number) {
    const rows = await this.db
      .select({
        totalOutflow: sql<number>`COALESCE(SUM(CASE WHEN direction = 'outflow' THEN amount ELSE 0 END), 0)`,
        totalInflow: sql<number>`COALESCE(SUM(CASE WHEN direction = 'inflow' THEN amount ELSE 0 END), 0)`,
        totalTds: sql<number>`COALESCE(SUM(CASE WHEN event_type = 'tds_deducted' THEN tds_amount ELSE 0 END), 0)`,
        totalGst: sql<number>`COALESCE(SUM(CASE WHEN event_type = 'gst_booked' THEN gst_amount ELSE 0 END), 0)`,
        netCashFlow: sql<number>`
          COALESCE(
            SUM(CASE WHEN direction = 'outflow' THEN amount ELSE 0 END) -
            SUM(CASE WHEN event_type = 'tds_deducted' THEN tds_amount ELSE 0 END) -
            SUM(CASE WHEN event_type = 'gst_booked' THEN gst_amount ELSE 0 END),
            0
          )
        `,
      })
      .from(projectCashFlows)
      .where(sql`${projectCashFlows.projectId} = ${projectId}`);

    return rows[0];
  }

  async createEmdCashFlow(
    projectId: number,
    tenderId: number,
    emdAmount: number,
    createdBy: number,
    tenderNo: string
  ) {
    return this.create({
      projectId,
      eventType: 'emd_outflow',
      amount: emdAmount.toString(),
      direction: 'outflow',
      referenceType: 'tender',
      referenceId: tenderId,
      referenceNo: tenderNo,
      remark: `EMD outflow for tender ${tenderNo}`,
      createdBy,
    });
  }

  async updateEmdCashFlowAmount(tenderId: number, newAmount: number) {
    const result = await this.db
      .update(projectCashFlows)
      .set({
        amount: newAmount.toString(),
        remark:
          newAmount === 0
            ? 'EMD voided - tender removed/changed from project'
            : 'EMD amount updated',
      })
      .where(
        and(
          eq(projectCashFlows.referenceType, 'tender'),
          eq(projectCashFlows.referenceId, tenderId),
          eq(projectCashFlows.eventType, 'emd_outflow')
        )
      )
      .returning();

    return result[0];
  }

  async getEmdByTenderId(tenderId: number) {
    const rows = await this.db
      .select()
      .from(projectCashFlows)
      .where(
        and(
          eq(projectCashFlows.referenceType, 'tender'),
          eq(projectCashFlows.referenceId, tenderId),
          eq(projectCashFlows.eventType, 'emd_outflow')
        )
      )
      .limit(1);

    return rows[0];
  }
}