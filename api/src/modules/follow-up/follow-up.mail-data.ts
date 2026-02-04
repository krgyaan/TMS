import { DbInstance } from "@/db";
import { sql } from "drizzle-orm";
import { FollowUpDetailsDto } from "./zod/update-follow-up.dto";
import { FollowupMailBase, FollowupMailPayload } from "./zod/mail.dto";
import { FollowupMailTemplates } from "./follow-up.mail";

export class FollowupMailDataBuilder {
    constructor(private db: DbInstance) {}

    async build(followupId: number): Promise<FollowupMailPayload | null> {
        const fu = await this.getBaseFollowup(followupId);
        const to = await this.getRecipients(followupId);
        if (!to.length || !fu.assignedToId) return null;

        const cc = this.resolveCc(fu.area);

        const since = this.computeSince(fu.startFrom);

        const baseContext = {
            for: fu.followupFor,
            name: fu.partyName,
            details: fu.details,
            reminder: fu.reminderCount,
            since,
        };

        const instrument = await this.resolveInstrumentData(fu.emdId, followupId);

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

    private async getRecipients(id: number): Promise<string[]> {
        const rows = await this.db.execute(sql`
            SELECT email
            FROM follow_up_persons
            WHERE follow_up_id = ${id}
            AND email IS NOT NULL
        `);

        return rows.rows.map((r: any) => r.email as string);
    }

    private async resolveInstrumentData(emdId: number | null, id: number) {
        if (!emdId) return null;

        const resolvers = {
            1: this.ddResolver.bind(this),
            3: this.chqResolver.bind(this),
            4: this.bgResolver.bind(this),
            5: this.btResolver.bind(this),
            6: this.popResolver.bind(this),
        };

        return resolvers[emdId]?.(id) ?? null;
    }

    //RESOLVERS TO BE IMPLEMENTED TO GET THE DATA WE ARE LOOKING FORRRRR
    private async ddResolver(id: number) {
        const rows = await this.db.execute(sql`
      SELECT dd.dd_no, dd.dd_amt, dd.dd_date,
             t.tender_no, t.project_name, s.name as status
      FROM dd_table dd
      JOIN emds e ON e.id = dd.emd_id
      JOIN tenders t ON t.id = e.tender_id
      JOIN statuses s ON s.id = t.status_id
      WHERE dd.followup_id = ${id}
    `);

        return rows.rows[0];
    }

    private async chqResolver(id: number) {
        const rows = await this.db.execute(sql`
      SELECT dd.dd_no, dd.dd_amt, dd.dd_date,
             t.tender_no, t.project_name, s.name as status
      FROM dd_table dd
      JOIN emds e ON e.id = dd.emd_id
      JOIN tenders t ON t.id = e.tender_id
      JOIN statuses s ON s.id = t.status_id
      WHERE dd.followup_id = ${id}
    `);

        return rows.rows[0];
    }

    private async bgResolver(id: number) {
        const rows = await this.db.execute(sql`
      SELECT dd.dd_no, dd.dd_amt, dd.dd_date,
             t.tender_no, t.project_name, s.name as status
      FROM dd_table dd
      JOIN emds e ON e.id = dd.emd_id
      JOIN tenders t ON t.id = e.tender_id
      JOIN statuses s ON s.id = t.status_id
      WHERE dd.followup_id = ${id}
    `);
    }

    private async btResolver(id: number) {
        const rows = await this.db.execute(sql`
      SELECT dd.dd_no, dd.dd_amt, dd.dd_date,
             t.tender_no, t.project_name, s.name as status
      FROM dd_table dd
      JOIN emds e ON e.id = dd.emd_id
      JOIN tenders t ON t.id = e.tender_id
      JOIN statuses s ON s.id = t.status_id
      WHERE dd.followup_id = ${id}
    `);
    }

    private async popResolver(id: number) {
        const rows = await this.db.execute(sql`
      SELECT dd.dd_no, dd.dd_amt, dd.dd_date,
             t.tender_no, t.project_name, s.name as status
      FROM dd_table dd
      JOIN emds e ON e.id = dd.emd_id
      JOIN tenders t ON t.id = e.tender_id
      JOIN statuses s ON s.id = t.status_id
      WHERE dd.followup_id = ${id}
    `);

        return rows.rows[0];
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
