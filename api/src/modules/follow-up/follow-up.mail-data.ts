import { DbInstance } from "@/db";
import { sql } from "drizzle-orm";
import { FollowUpDetailsDto } from "./zod/update-follow-up.dto";
import { FollowupMailBase, FollowupMailPayload } from "./zod/mail.dto";
import { FollowupMailTemplates } from "./follow-up.mail";
import sanitizeHtml from "sanitize-html";

type InstrumentType = "DD" | "FDR" | "BG" | "Cheque" | "Bank Transfer" | "Portal Payment" | "Surety Bond";

export class FollowupMailDataBuilder {
    constructor(private db: DbInstance) {}

    async build(followupId: number): Promise<FollowupMailPayload | null> {
        const fu = await this.getBaseFollowup(followupId);
        const to = await this.getRecipients(followupId);
        if (!to.length || !fu.assignedToId) return null;

        const cc = this.resolveCc(fu.area);

        const since = this.computeSince(fu.startFrom);

        const cleanDetails = sanitizeHtml(fu.details, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "table", "tbody", "tr", "td"]),
            allowedAttributes: {
                "*": ["style", "href", "src"],
            },
        });

        const baseContext = {
            for: fu.followupFor,
            name: fu.partyName,
            details: cleanDetails,
            reminder: fu.reminderCount,
            since,
        };

        const instrument = fu.emdId ? await this.resolveInstrumentData(Number(fu.emdId)) : null;

        const template = instrument?.template ?? FollowupMailTemplates.DEFAULT;

        const context = {
            ...baseContext,
            ...(instrument?.context ?? {}),
        };

        return {
            template,
            context,
            to,
            cc,
            subject: `Follow Up for ${fu.followupFor ?? fu.partyName}`,
            attachments: fu.attachments?.length ? { files: fu.attachments, baseDir: "accounts" } : undefined,
            assignedToUserId: fu.assignedToId,
        };
    }

    private async getBaseFollowup(id: number): Promise<FollowupMailBase> {
        const rows = await this.db.execute(sql`
            SELECT
            id,
            party_name      as "partyName",
            followup_for    as "followupFor",
            details,
            reminder_count  as "reminderCount",
            area,
            assigned_to_id  as "assignedToId",
            attachments,
            emd_id          as "emdId",
            start_from as "startFrom"
            FROM follow_ups
            WHERE id = ${id}
        `);

        const r: any = rows.rows[0];

        return {
            id: Number(r.id),
            partyName: r.partyName,
            followupFor: r.followupFor,
            details: r.details,
            reminderCount: Number(r.reminderCount ?? 1),
            area: r.area,
            assignedToId: r.assignedToId ? Number(r.assignedToId) : null,
            attachments: r.attachments ?? [],
            emdId: r.emdId ? Number(r.emdId) : null,
            startFrom: r.startFrom,
        };
    }

    // private resolveCc(area: string) {
    //     if (area === "DC team") {
    //         return ["sajid@volksenergie.in", "shivani.yadav@volksenergie.in", "goyal@volksenergie.in", "kainaat@volksenergie.in"];
    //     }

    //     if (area === "AC Team") {
    //         return ["priyanka@volksenergie.in", "ahkamul@volksenergie.in", "arathi@volksenergie.in"];
    //     }

    //     return ["admin@volksenergie.in", "coordinator@volksenergie.in"];
    // }

    private resolveCc(area: string) {
        return ["abhigaur.test@gmail.com"];
    }

    // private async getRecipients(id: number): Promise<string[]> {
    //     const rows = await this.db.execute(sql`
    //         SELECT email
    //         FROM follow_up_persons
    //         WHERE follow_up_id = ${id}
    //         AND email IS NOT NULL
    //     `);

    //     return rows.rows.map((r: any) => r.email as string);
    // }

    private async getRecipients(id: number): Promise<string[]> {
        return ["abhijeetgaur.dev@gmail.com" as string];
    }

    private async resolveInstrumentData(instrumentId: number) {
        const rows = await this.db.execute(sql`
        SELECT id, instrument_type, request_id, amount
        FROM payment_instruments
        WHERE id = ${instrumentId}
    `);

        const instrument = rows.rows[0] as {
            id: number;
            instrument_type: InstrumentType;
            request_id: number;
            amount: string;
        };

        if (!instrument) return null;

        const resolvers: Record<InstrumentType, (id: number, reqId: number, amount: string) => Promise<any>> = {
            DD: this.ddResolver.bind(this),
            Cheque: this.chqResolver.bind(this),
            BG: this.bgResolver.bind(this),
            "Bank Transfer": this.btResolver.bind(this),
            "Portal Payment": this.popResolver.bind(this),
            FDR: async () => null,
            "Surety Bond": async () => null,
        };

        return resolvers[instrument.instrument_type](instrument.id, instrument.request_id, instrument.amount);
    }
    //RESOLVERS TO BE IMPLEMENTED TO GET THE DATA WE ARE LOOKING FORRRRR
    private async ddResolver(instrumentId: number, _: number, amount: string) {
        const rows = await this.db.execute(sql`
        SELECT
            d.dd_no,
            d.dd_date,
            pr.tender_no,
            pr.project_name,
            pr.status
        FROM instrument_dd_details d
        JOIN payment_instruments pi ON pi.id = d.instrument_id
        JOIN payment_requests pr ON pr.id = pi.request_id
        WHERE d.instrument_id = ${instrumentId}
    `);

        const r: any = rows.rows[0];

        return {
            template: FollowupMailTemplates.DD,
            context: {
                ddNo: r.dd_no,
                date: r.dd_date,
                amount,
                tenderNo: r.tender_no,
                projectName: r.project_name,
                status: r.status,
            },
        };
    }

    private async chqResolver(instrumentId: number, _: number, amount: string) {
        const rows = await this.db.execute(sql`
        SELECT
            c.cheque_no,
            c.cheque_date,
            pr.status
        FROM instrument_cheque_details c
        JOIN payment_instruments pi ON pi.id = c.instrument_id
        JOIN payment_requests pr ON pr.id = pi.request_id
        WHERE c.instrument_id = ${instrumentId}
    `);

        const r: any = rows.rows[0];

        return {
            template: FollowupMailTemplates.CHQ,
            context: {
                chequeNo: r.cheque_no,
                date: r.cheque_date,
                amount,
                status: r.status,
            },
        };
    }

    private async bgResolver(instrumentId: number, _: number, amount: string) {
        const rows = await this.db.execute(sql`
        SELECT
            b.bg_no,
            b.validity_date,
            b.claim_expiry_date,
            b.beneficiary_name,
            b.bg_soft_copy,
            pr.tender_no,
            pr.project_name,
            pr.status
        FROM instrument_bg_details b
        JOIN payment_instruments pi ON pi.id = b.instrument_id
        JOIN payment_requests pr ON pr.id = pi.request_id
        WHERE b.instrument_id = ${instrumentId}
    `);

        const r: any = rows.rows[0];

        return {
            template: FollowupMailTemplates.BG,
            context: {
                bgNo: r.bg_no,
                amount,
                bgValidity: r.validity_date,
                bgClaimExpiry: r.claim_expiry_date,
                favour: r.beneficiary_name,
                attachment: r.bg_soft_copy,
                tenderNo: r.tender_no,
                projectName: r.project_name,
                status: r.status,
            },
        };
    }

    private async btResolver(instrumentId: number, _: number, amount: string) {
        const rows = await this.db.execute(sql`
        SELECT
            t.transaction_date,
            t.utr_num,
            pr.tender_no,
            pr.project_name,
            pr.status
        FROM instrument_transfer_details t
        JOIN payment_instruments pi ON pi.id = t.instrument_id
        JOIN payment_requests pr ON pr.id = pi.request_id
        WHERE t.instrument_id = ${instrumentId}
    `);

        const r: any = rows.rows[0];

        return {
            template: FollowupMailTemplates.BT,
            context: {
                date: r.transaction_date,
                utr: r.utr_num,
                amount,
                tenderNo: r.tender_no,
                projectName: r.project_name,
                status: r.status,
            },
        };
    }

    private async popResolver(instrumentId: number, _: number, amount: string) {
        const rows = await this.db.execute(sql`
        SELECT
            t.transaction_date,
            t.utr_num,
            pr.tender_no,
            pr.project_name,
            pr.status
        FROM instrument_transfer_details t
        JOIN payment_instruments pi ON pi.id = t.instrument_id
        JOIN payment_requests pr ON pr.id = pi.request_id
        WHERE t.instrument_id = ${instrumentId}
    `);

        const r: any = rows.rows[0];

        return {
            template: FollowupMailTemplates.POP,
            context: {
                date: r.transaction_date,
                utr: r.utr_num,
                amount,
                tenderNo: r.tender_no,
                projectName: r.project_name,
                status: r.status,
            },
        };
    }

    //HELPERS
    private computeSince(startFrom: string) {
        const start = new Date(startFrom);
        const today = new Date();

        start.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        return Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000));
    }
}
