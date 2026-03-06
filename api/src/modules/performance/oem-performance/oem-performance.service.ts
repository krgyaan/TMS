// src/modules/oem-performance/oem-performance.service.ts

import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE } from "@/db/database.module";
import type { DbInstance } from "@/db";

import { vendorOrganizations } from "@/db/schemas/vendors/vendor-organizations.schema";
import { tenderInfos } from "@/db/schemas/tendering/tenders.schema";

import { eq, and, gte, lte, sql } from "drizzle-orm";

@Injectable()
export class OemPerformanceService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: DbInstance
    ) {}

    async getPerformance(filters: { oem?: string; from?: string; to?: string }) {
        const { oem, from, to } = filters;

        const oems = await this.db.select().from(vendorOrganizations);

        let tendersQuery = this.db.select().from(tenderInfos);

        if (from && to) {
            tendersQuery = tendersQuery.where(and(gte(tenderInfos.dueDate, new Date(from)), lte(tenderInfos.dueDate, new Date(to))));
        }

        const tenders = await tendersQuery;

        const notAllowedTenders = this.getNotAllowedTenders(tenders, oem);
        const rfqsSentToOem = this.getRfqsSentToOem(tenders, oem);
        const assignedApprovedSummary = this.getAssignedAndApprovedSummary(tenders, oem);

        const bidedTenders = await this.getTendersByOem(filters);

        const summary = {
            ...assignedApprovedSummary,
            ...this.calculateSummary(bidedTenders),
        };

        return {
            oems,
            notAllowedTenders,
            rfqsSentToOem,
            summary,
        };
    }

    // ---------------------------------------------------

    getNotAllowedTenders(tenders: any[], selectedOem?: string) {
        if (!selectedOem) return [];

        return tenders
            .filter(tender => {
                if (!tender.oemNotAllowed) return false;

                const denied = tender.oemNotAllowed.split(",");
                return denied.map(v => v.trim()).includes(selectedOem);
            })
            .map(tender => ({
                id: tender.id,
                team: tender.team,
                tender_no: tender.tenderNo,
                tender_name: tender.tenderName,
                due_date: tender.dueDate,
                gst_values: Number(tender.gstValues),
            }));
    }

    // ---------------------------------------------------

    getRfqsSentToOem(tenders: any[], selectedOem?: string) {
        if (!selectedOem) return [];

        return tenders
            .filter(tender => {
                if (!tender.rfqTo) return false;

                const sent = tender.rfqTo.split(",");
                return sent.map(v => v.trim()).includes(selectedOem);
            })
            .map(tender => ({
                id: tender.id,
                team: tender.team,
                tender_no: tender.tenderNo,
                tender_name: tender.tenderName,
                due_date: tender.dueDate,
                gst_values: Number(tender.gstValues),
            }));
    }

    // ---------------------------------------------------

    getAssignedAndApprovedSummary(tenders: any[], selectedOem?: string) {
        if (!selectedOem) return {};

        const assigned = tenders.filter(tender => {
            if (!tender.rfqTo) return false;

            const sent = tender.rfqTo.split(",");
            return sent.map(v => v.trim()).includes(selectedOem);
        });

        const approved = assigned.filter(t => t.tlStatus === 1);

        const sumValues = (arr: any[]) => arr.reduce((sum, t) => sum + Number(t.gstValues), 0);

        return {
            tenders_assigned: {
                count: assigned.length,
                value: sumValues(assigned),
                tender: assigned.map(t => t.tenderName),
            },
            tenders_approved: {
                count: approved.length,
                value: sumValues(approved),
                tender: approved.map(t => t.tenderName),
            },
        };
    }

    // ---------------------------------------------------

    async getTendersByOem(filters: { oem?: string; from?: string; to?: string }) {
        const { oem, from, to } = filters;

        const query = this.db.execute(sql`
      SELECT
        bs.id,
        bs.tender_id,
        bs.status as bid_status,
        ti.tender_name,
        ti.gst_values,
        ti.status as tender_status,
        ti.rfq_to
      FROM bid_submissions bs
      JOIN tender_infos ti ON bs.tender_id = ti.id
    `);

        const result: any[] = (await query) as any[];

        let filtered = result;

        if (oem) {
            filtered = filtered.filter(t =>
                t.rfq_to
                    ?.split(",")
                    .map(v => v.trim())
                    .includes(oem)
            );
        }

        if (from && to) {
            const fromDate = new Date(from);
            const toDate = new Date(to);

            filtered = filtered.filter(t => new Date(t.bid_submissions_date) >= fromDate && new Date(t.bid_submissions_date) <= toDate);
        }

        return filtered;
    }

    // ---------------------------------------------------

    calculateSummary(tenders: any[]) {
        const summary = {
            tenders_bid: { tender: [], count: 0, value: 0 },
            tenders_missed: { tender: [], count: 0, value: 0 },
            tenders_disqualified: { tender: [], count: 0, value: 0 },
            tender_results_awaited: { tender: [], count: 0, value: 0 },
            tenders_won: { tender: [], count: 0, value: 0 },
            tenders_lost: { tender: [], count: 0, value: 0 },
        };

        for (const tender of tenders) {
            switch (tender.tender_status) {
                case 8:
                case 16:
                    this.add(summary.tenders_missed, tender);
                    break;

                case 21:
                case 22:
                    this.add(summary.tenders_disqualified, tender);
                    break;

                case 17:
                    this.add(summary.tender_results_awaited, tender);
                    break;

                case 24:
                    this.add(summary.tenders_lost, tender);
                    break;

                case 25:
                case 26:
                case 27:
                case 28:
                    this.add(summary.tenders_won, tender);
                    break;
            }

            if (tender.bid_status === "Bid Submitted") {
                this.add(summary.tenders_bid, tender);
            }
        }

        return summary;
    }

    private add(summaryItem: any, tender: any) {
        summaryItem.count++;
        summaryItem.value += Number(tender.gst_values);
        summaryItem.tender.push(tender.tender_name);
    }
}
