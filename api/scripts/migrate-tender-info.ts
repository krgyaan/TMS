import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import { mysqlTable, varchar, bigint, text, date, time, timestamp, decimal, int } from 'drizzle-orm/mysql-core';
import { Client } from 'pg';
import { sql } from 'drizzle-orm';
import {
    tenderInfos,
    tenderInformation,
    tenderClients,
    tenderTechnicalDocuments,
    tenderFinancialDocuments,
} from '@db/schemas/tendering';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface DatabaseConfig {
    postgres: string;
    mysql: string;
}

const config: DatabaseConfig = {
    postgres: process.env.PG_URL || 'postgresql://postgres:gyan@localhost:5432/new_tms',
    mysql: process.env.MYSQL_URL || 'mysql://root:gyan@localhost:3306/mydb',
};

// ============================================================================
// MYSQL SCHEMA DEFINITIONS
// ============================================================================

const mysqlTenderInfos = mysqlTable('tender_infos', {
    id: int('id').primaryKey().autoincrement(),
    team: varchar('team', { length: 10 }).notNull(),
    tender_no: varchar('tender_no', { length: 255 }).notNull(),
    organisation: varchar('organisation', { length: 255 }),
    tender_name: varchar('tender_name', { length: 255 }).notNull(),
    item: varchar('item', { length: 255 }).notNull(),
    gst_values: decimal('gst_values', { precision: 15, scale: 2 }).notNull(),
    tender_fees: decimal('tender_fees', { precision: 15, scale: 2 }).notNull(),
    emd: decimal('emd', { precision: 15, scale: 2 }).notNull(),
    team_member: int('team_member'),
    due_date: date('due_date').notNull(),
    due_time: time('due_time').notNull(),
    remarks: varchar('remarks', { length: 200 }),
    status: int('status').notNull(),
    location: int('location'),
    website: int('website'),
    deleteStatus: varchar('deleteStatus', { length: 1 }).notNull().default('0'),
    tlStatus: varchar('tlStatus', { length: 1 }).notNull().default('0'),
    tlRemarks: varchar('tlRemarks', { length: 200 }),
    rfq_to: varchar('rfq_to', { length: 255 }),
    oem_who_denied: varchar('oem_who_denied', { length: 255 }),
    client_mobile: varchar('client_mobile', { length: 20 }),
    client_organisation: varchar('client_organisation', { length: 255 }),
    client_designation: varchar('client_designation', { length: 255 }),
    courier_address: text('courier_address'),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

const mysqlTenderInformation = mysqlTable('tender_information', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    tender_id: bigint('tender_id', { mode: 'number' }).notNull(),
    is_rejectable: varchar('is_rejectable', { length: 10 }),
    reject_reason: varchar('reject_reason', { length: 10 }),
    reject_remarks: text('reject_remarks'),
    tender_fees: varchar('tender_fees', { length: 200 }),
    emd_req: varchar('emd_req', { length: 255 }),
    emd_opt: varchar('emd_opt', { length: 200 }),
    rev_auction: varchar('rev_auction', { length: 10 }),
    pt_supply: varchar('pt_supply', { length: 255 }),
    pt_ic: varchar('pt_ic', { length: 255 }),
    pbg: varchar('pbg', { length: 10 }),
    pbg_duration: varchar('pbg_duration', { length: 10 }),
    bid_valid: varchar('bid_valid', { length: 10 }),
    comm_eval: varchar('comm_eval', { length: 10 }),
    maf_req: varchar('maf_req', { length: 10 }),
    supply: varchar('supply', { length: 255 }),
    installation: varchar('installation', { length: 255 }),
    ldperweek: varchar('ldperweek', { length: 10 }),
    maxld: varchar('maxld', { length: 10 }),
    phyDocs: varchar('phyDocs', { length: 10 }),
    dead_date: date('dead_date'),
    dead_time: time('dead_time'),
    tech_eligible: varchar('tech_eligible', { length: 10 }),
    order1: varchar('order1', { length: 255 }),
    order2: varchar('order2', { length: 255 }),
    order3: varchar('order3', { length: 255 }),
    aat: varchar('aat', { length: 100 }),
    aat_amt: varchar('aat_amt', { length: 255 }),
    wc: varchar('wc', { length: 100 }),
    wc_amt: varchar('wc_amt', { length: 255 }),
    sc: varchar('sc', { length: 100 }),
    sc_amt: varchar('sc_amt', { length: 255 }),
    nw: varchar('nw', { length: 100 }),
    nw_amt: varchar('nw_amt', { length: 255 }),
    pqr_eligible: int('pqr_eligible'),
    fin_eligible: int('fin_eligible'),
    te_remark: text('te_remark'),
    rej_remark: varchar('rej_remark', { length: 1000 }),
    created_at: timestamp('created_at'),
    updated_at: timestamp('updated_at'),
});

// ============================================================================
// TYPES
// ============================================================================

interface TenderInformationCache {
    tenderId: number;
    emdMode: string | null;
    tenderFeeMode: string | null;
    pqrEligible: number | null;
    finEligible: number | null;
    courierAddress: string | null;
}

interface MigrationStats {
    tenderInfos: { success: number; errors: number };
    tenderInformation: { success: number; errors: number };
    tenderClients: { success: number; errors: number };
    technicalDocs: { success: number; errors: number };
    financialDocs: { success: number; errors: number };
}

interface MigrationContext {
    pgDb: ReturnType<typeof pgDrizzle>;
    mysqlDb: ReturnType<typeof mysqlDrizzle>;
    tenderIds: Set<number>; // Track migrated tender IDs
    infoCache: Map<number, TenderInformationCache>;
    stats: MigrationStats;
    clientIdCounter: number; // Counter for client IDs
    techDocIdCounter: number; // Counter for technical doc IDs
    finDocIdCounter: number; // Counter for financial doc IDs
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const Parsers = {
    decimal(val: string | number | null | undefined): string | null {
        if (val === null || val === undefined || val === '') return null;
        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '').trim());
        return isNaN(num) ? null : num.toFixed(2);
    },

    integer(val: string | number | null | undefined): number | null {
        if (val === null || val === undefined || val === '') return null;
        const num = typeof val === 'number' ? val : parseInt(String(val).trim(), 10);
        return isNaN(num) ? null : num;
    },

    date(val: string | Date | null | undefined): Date | null {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    },

    dateTime(dateVal: string | Date | null, timeVal: string | null): Date | null {
        if (!dateVal) return null;
        const dateStr = typeof dateVal === 'string' ? dateVal : dateVal.toISOString().split('T')[0];
        const timeStr = timeVal || '00:00:00';
        const combined = new Date(`${dateStr}T${timeStr}`);
        return isNaN(combined.getTime()) ? new Date(dateVal) : combined;
    },

    string(val: string | null | undefined, maxLength?: number): string | null {
        if (val === null || val === undefined) return null;
        const str = String(val).trim();
        if (str === '') return null;
        return maxLength ? str.substring(0, maxLength) : str;
    },

    commaSeparated(val: string | null | undefined): string | null {
        if (!val || val.trim() === '') return null;
        const items = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
        return items.length > 0 ? items.join(',') : null;
    },

    toStringArray(val: unknown): string[] | null {
        if (val == null) return null;
        if (Array.isArray(val)) {
            const arr = val.map(v => (v == null ? '' : String(v).trim())).filter(v => v.length > 0);
            return arr.length > 0 ? arr : null;
        }
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (trimmed === '') return null;
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    const arr = parsed.map(v => (v == null ? '' : String(v).trim())).filter(v => v.length > 0);
                    return arr.length > 0 ? arr : null;
                }
            } catch { /* fall back to CSV */ }
            const arr = trimmed.split(',').map(s => s.trim()).filter(s => s.length > 0);
            return arr.length > 0 ? arr : null;
        }
        const s = String(val).trim();
        return s ? [s] : null;
    },

    intToYesNo(val: number | null | undefined): string | null {
        if (val === 1) return 'Yes';
        if (val === 0) return 'No';
        return null;
    },

    extractDays(val: string | null | undefined): number | null {
        if (!val) return null;
        return this.integer(val.replace(/\D/g, ''));
    },

    isInstallationInclusive(val: string | null | undefined): boolean {
        if (!val) return false;
        return val.toLowerCase().includes('inclusive');
    },

    hasValue(val: string | number | null | undefined): boolean {
        if (val === null || val === undefined || val === '') return false;
        const parsed = this.decimal(val);
        return parsed !== null && parseFloat(parsed) > 0;
    },
};

// ============================================================================
// DATA TRANSFORMERS
// ============================================================================

class TenderInfoTransformer {
    constructor(private ctx: MigrationContext) { }

    transform(row: typeof mysqlTenderInfos.$inferSelect) {
        const infoData = this.ctx.infoCache.get(row.id);

        return {
            tender: this.transformTenderInfo(row, infoData),
            client: this.transformClient(row),
        };
    }

    private transformTenderInfo(
        row: typeof mysqlTenderInfos.$inferSelect,
        infoData: TenderInformationCache | undefined
    ) {
        const tenderFeesValue = Parsers.decimal(row.tender_fees) ?? '0';
        const emdValue = Parsers.decimal(row.emd) ?? '0';

        return {
            // ✅ PRESERVE OLD ID
            id: row.id,

            // Direct mappings
            team: Parsers.integer(row.team) ?? 1,
            tenderNo: row.tender_no,
            organization: row.organisation ? Parsers.integer(row.organisation) : null,
            tenderName: row.tender_name,
            item: Parsers.integer(row.item) ?? 1,
            gstValues: Parsers.decimal(row.gst_values) ?? '0',

            tenderFees: tenderFeesValue,
            tenderFeeAmount: tenderFeesValue,

            emd: emdValue,
            emdAmount: emdValue,

            teamMember: row.team_member ?? 1,
            dueDate: Parsers.dateTime(row.due_date, row.due_time) ?? new Date(),
            remarks: Parsers.string(row.remarks, 200),
            status: row.status ?? 1,
            location: row.location ?? null,
            website: row.website ?? null,
            courierAddress: row.courier_address ?? null,
            deleteStatus: row.deleteStatus === '1' ? 1 : 0,
            tlStatus: Parsers.integer(row.tlStatus) ?? 0,
            tlRemarks: Parsers.string(row.tlRemarks, 200),
            rfqTo: Parsers.string(row.rfq_to, 255),
            oemNotAllowed: row.oem_who_denied ?? null,
            tenderFeeMode: infoData ? Parsers.commaSeparated(infoData.tenderFeeMode) : null,
            emdMode: infoData ? Parsers.commaSeparated(infoData.emdMode) : null,
            approvePqrSelection: infoData ? Parsers.intToYesNo(infoData.pqrEligible) : null,
            approveFinanceDocSelection: infoData ? Parsers.intToYesNo(infoData.finEligible) : null,
            createdAt: Parsers.date(row.created_at) ?? new Date(),
            updatedAt: Parsers.date(row.updated_at) ?? new Date(),
        };
    }

    private transformClient(row: typeof mysqlTenderInfos.$inferSelect) {
        if (!row.client_mobile && !row.client_organisation && !row.client_designation) {
            return null;
        }

        return {
            clientName: row.client_organisation ?? null,
            clientDesignation: row.client_designation ?? null,
            clientMobile: row.client_mobile ?? null,
            clientEmail: null,
            createdAt: Parsers.date(row.created_at) ?? new Date(),
            updatedAt: Parsers.date(row.updated_at) ?? new Date(),
        };
    }
}

class TenderInformationTransformer {
    transform(
        row: typeof mysqlTenderInformation.$inferSelect,
        tenderId: number, // Now using preserved tender ID
        infoData: TenderInformationCache | undefined
    ) {
        return {
            // ✅ PRESERVE OLD ID
            id: row.id,

            tenderId: tenderId,

            teRecommendation: row.is_rejectable ?? 'Yes',
            teRejectionReason: Parsers.integer(row.reject_reason),
            teRejectionRemarks: row.reject_remarks ?? null,

            processingFeeRequired: 'No',
            processingFeeAmount: null,
            processingFeeMode: null,

            tenderFeeRequired: 'Yes',
            tenderFeeMode: Parsers.toStringArray(row.tender_fees),

            emdRequired: row.emd_req ?? null,
            emdMode: Parsers.toStringArray(row.emd_opt),

            reverseAuctionApplicable: row.rev_auction ?? null,
            paymentTermsSupply: Parsers.integer(row.pt_supply),
            paymentTermsInstallation: Parsers.integer(row.pt_ic),
            bidValidityDays: Parsers.integer(row.bid_valid),
            commercialEvaluation: row.comm_eval ?? null,
            mafRequired: row.maf_req ?? null,

            deliveryTimeSupply: Parsers.extractDays(row.supply),
            deliveryTimeInstallationInclusive: Parsers.isInstallationInclusive(row.installation),
            deliveryTimeInstallationDays: Parsers.extractDays(row.installation),

            pbgRequired: 'Yes',
            pbgMode: null,
            pbgPercentage: Parsers.decimal(row.pbg),
            pbgDurationMonths: Parsers.integer(row.pbg_duration),

            sdRequired: 'No',
            sdMode: null,
            sdPercentage: null,
            sdDurationMonths: null,

            ldRequired: 'Yes',
            ldPercentagePerWeek: Parsers.decimal(row.ldperweek),
            maxLdPercentage: Parsers.decimal(row.maxld),

            physicalDocsRequired: row.phyDocs ?? null,
            physicalDocsDeadline: Parsers.dateTime(row.dead_date, row.dead_time),

            techEligibilityAge: Parsers.integer(row.tech_eligible),

            wo1Required: Parsers.hasValue(row.order1) ? 'Yes' : null,
            orderValue1: Parsers.decimal(row.order1),
            wo1Custom: null,

            wo2Required: Parsers.hasValue(row.order2) ? 'Yes' : null,
            orderValue2: Parsers.decimal(row.order2),
            wo2Custom: null,

            wo3Required: Parsers.hasValue(row.order3) ? 'Yes' : null,
            orderValue3: Parsers.decimal(row.order3),
            wo3Custom: null,

            avgAnnualTurnoverType: row.aat ?? null,
            avgAnnualTurnoverValue: Parsers.decimal(row.aat_amt),

            workingCapitalType: row.wc ?? null,
            workingCapitalValue: Parsers.decimal(row.wc_amt),

            solvencyCertificateType: row.sc ?? null,
            solvencyCertificateValue: Parsers.decimal(row.sc_amt),

            netWorthType: row.nw ?? null,
            netWorthValue: Parsers.decimal(row.nw_amt),

            courierAddress: infoData?.courierAddress ?? null,

            teFinalRemark: row.te_remark ?? null,
            tlRejectionRemarks: row.rej_remark ?? null,

            createdAt: Parsers.date(row.created_at) ?? new Date(),
            updatedAt: Parsers.date(row.updated_at) ?? new Date(),
        };
    }
}

// ============================================================================
// MIGRATORS
// ============================================================================

class TenderInfoMigrator {
    private transformer: TenderInfoTransformer;

    constructor(private ctx: MigrationContext) {
        this.transformer = new TenderInfoTransformer(ctx);
    }

    async migrate(): Promise<void> {
        console.log('Migrating tender_infos...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlTenderInfos);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlTenderInfos.$inferSelect): Promise<void> {
        try {
            const { tender, client } = this.transformer.transform(row);

            const infoData = this.ctx.infoCache.get(row.id);
            if (infoData) {
                infoData.courierAddress = row.courier_address ?? null;
            }

            // ✅ Insert with preserved ID
            await this.ctx.pgDb.insert(tenderInfos).values(tender);

            // ✅ Track the ID
            this.ctx.tenderIds.add(row.id);

            // Insert client if exists
            if (client) {
                this.ctx.clientIdCounter++;
                await this.ctx.pgDb.insert(tenderClients).values({
                    id: this.ctx.clientIdCounter, // ✅ Use counter for new records
                    tenderId: row.id, // ✅ Use preserved tender ID
                    ...client,
                });
                this.ctx.stats.tenderClients.success++;
            }

            this.ctx.stats.tenderInfos.success++;
        } catch (err) {
            console.error(`Error migrating tender_infos id=${row.id}:`, err);
            this.ctx.stats.tenderInfos.errors++;
        }
    }

    private logStats(): void {
        const { success, errors } = this.ctx.stats.tenderInfos;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors}`);
    }
}

class TenderInformationMigrator {
    private transformer = new TenderInformationTransformer();

    constructor(private ctx: MigrationContext) { }

    async migrate(): Promise<void> {
        console.log('Migrating tender_information...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlTenderInformation);

        for (const row of rows) {
            await this.migrateRow(row);
        }

        this.logStats();
    }

    private async migrateRow(row: typeof mysqlTenderInformation.$inferSelect): Promise<void> {
        try {
            const tenderId = Number(row.tender_id);

            // ✅ Check if tender exists (using preserved IDs)
            if (!this.ctx.tenderIds.has(tenderId)) {
                console.warn(`  ⚠ No tender found for tender_id=${tenderId}, skipping`);
                return;
            }

            const infoData = this.ctx.infoCache.get(tenderId);
            const data = this.transformer.transform(row, tenderId, infoData);

            // ✅ Insert with preserved ID
            await this.ctx.pgDb.insert(tenderInformation).values(data as any);
            this.ctx.stats.tenderInformation.success++;
        } catch (err) {
            console.error(`Error migrating tender_information id=${row.id}:`, err);
            this.ctx.stats.tenderInformation.errors++;
        }
    }

    private logStats(): void {
        const { success, errors } = this.ctx.stats.tenderInformation;
        console.log(`  ✓ Migrated: ${success} | ✗ Errors: ${errors}`);
    }
}

class DocumentMigrator {
    constructor(private ctx: MigrationContext) { }

    async migrateTechnicalDocs(): Promise<void> {
        console.log('Creating technical documents...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlTenderInformation);

        for (const row of rows) {
            if (row.pqr_eligible !== 1) continue;

            const tenderId = Number(row.tender_id);
            if (!this.ctx.tenderIds.has(tenderId)) continue;

            try {
                this.ctx.techDocIdCounter++;
                await this.ctx.pgDb.insert(tenderTechnicalDocuments).values({
                    id: this.ctx.techDocIdCounter, // ✅ Use counter
                    tenderId: tenderId, // ✅ Use preserved tender ID
                    documentName: 'PQR Documents Required',
                    createdAt: Parsers.date(row.created_at) ?? new Date(),
                    updatedAt: Parsers.date(row.updated_at) ?? new Date(),
                });
                this.ctx.stats.technicalDocs.success++;
            } catch {
                this.ctx.stats.technicalDocs.errors++;
            }
        }

        console.log(`  ✓ Created: ${this.ctx.stats.technicalDocs.success}`);
    }

    async migrateFinancialDocs(): Promise<void> {
        console.log('Creating financial documents...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlTenderInformation);

        for (const row of rows) {
            if (row.fin_eligible !== 1) continue;

            const tenderId = Number(row.tender_id);
            if (!this.ctx.tenderIds.has(tenderId)) continue;

            try {
                this.ctx.finDocIdCounter++;
                await this.ctx.pgDb.insert(tenderFinancialDocuments).values({
                    id: this.ctx.finDocIdCounter, // ✅ Use counter
                    tenderId: tenderId, // ✅ Use preserved tender ID
                    documentName: 'Financial Documents Required',
                    createdAt: Parsers.date(row.created_at) ?? new Date(),
                    updatedAt: Parsers.date(row.updated_at) ?? new Date(),
                });
                this.ctx.stats.financialDocs.success++;
            } catch {
                this.ctx.stats.financialDocs.errors++;
            }
        }

        console.log(`  ✓ Created: ${this.ctx.stats.financialDocs.success}`);
    }
}

// ============================================================================
// CACHE LOADER
// ============================================================================

class TenderInformationCacheLoader {
    constructor(private ctx: MigrationContext) { }

    async load(): Promise<void> {
        console.log('Pre-loading tender_information data...');
        const rows = await this.ctx.mysqlDb.select().from(mysqlTenderInformation);

        for (const row of rows) {
            const tenderId = Number(row.tender_id);
            this.ctx.infoCache.set(tenderId, {
                tenderId,
                emdMode: row.emd_opt ?? null,
                tenderFeeMode: row.tender_fees ?? null,
                pqrEligible: row.pqr_eligible ?? null,
                finEligible: row.fin_eligible ?? null,
                courierAddress: null,
            });
        }

        console.log(`  ✓ Cached: ${this.ctx.infoCache.size} records`);
    }
}

// ============================================================================
// SEQUENCE RESETTER
// ============================================================================

class SequenceResetter {
    constructor(private ctx: MigrationContext) { }

    async reset(): Promise<void> {
        console.log('Resetting PostgreSQL sequences...');

        const sequences = [
            { table: 'tender_infos', column: 'id' },
            { table: 'tender_information', column: 'id' },
            { table: 'tender_clients', column: 'id' },
            { table: 'tender_technical_documents', column: 'id' },
            { table: 'tender_financial_documents', column: 'id' },
        ];

        for (const seq of sequences) {
            try {
                await this.ctx.pgDb.execute(sql`
                    SELECT setval(
                        pg_get_serial_sequence(${seq.table}, ${seq.column}),
                        COALESCE((SELECT MAX(${sql.identifier(seq.column)}) FROM ${sql.identifier(seq.table)}), 1),
                        true
                    )
                `);
                console.log(`  ✓ ${seq.table} sequence reset`);
            } catch (err) {
                console.error(`  ✗ Error resetting ${seq.table} sequence:`, err);
            }
        }
    }
}

// ============================================================================
// MIGRATION ORCHESTRATOR
// ============================================================================

class MigrationOrchestrator {
    private pgClient: Client;
    private mysqlPool: mysql2.Pool;
    private ctx!: MigrationContext;

    constructor(private dbConfig: DatabaseConfig) {
        this.pgClient = new Client({ connectionString: dbConfig.postgres });
        this.mysqlPool = mysql2.createPool(dbConfig.mysql);
    }

    async run(): Promise<void> {
        try {
            this.printHeader();
            await this.connect();
            this.initializeContext();
            await this.executeMigration();
            this.printSummary();
        } finally {
            await this.disconnect();
        }
    }

    private printHeader(): void {
        console.log('\n' + '═'.repeat(60));
        console.log('  TENDER MIGRATION: MySQL → PostgreSQL');
        console.log('  (Preserving Original IDs)');
        console.log('═'.repeat(60));
    }

    private async connect(): Promise<void> {
        console.log('\n📡 Connecting to databases...');
        await this.pgClient.connect();
        console.log('  ✓ PostgreSQL connected');
        console.log('  ✓ MySQL pool ready');
    }

    private initializeContext(): void {
        this.ctx = {
            pgDb: pgDrizzle(this.pgClient as any),
            mysqlDb: mysqlDrizzle(this.mysqlPool as any),
            tenderIds: new Set(), // ✅ Changed from idMap to Set
            infoCache: new Map(),
            stats: {
                tenderInfos: { success: 0, errors: 0 },
                tenderInformation: { success: 0, errors: 0 },
                tenderClients: { success: 0, errors: 0 },
                technicalDocs: { success: 0, errors: 0 },
                financialDocs: { success: 0, errors: 0 },
            },
            clientIdCounter: 0, // ✅ Added counters
            techDocIdCounter: 0,
            finDocIdCounter: 0,
        };
    }

    private async executeMigration(): Promise<void> {
        const steps = [
            {
                name: 'Pre-load tender_information cache',
                fn: () => new TenderInformationCacheLoader(this.ctx).load(),
            },
            {
                name: 'Migrate tender_infos + tender_clients',
                fn: () => new TenderInfoMigrator(this.ctx).migrate(),
            },
            {
                name: 'Migrate tender_information',
                fn: () => new TenderInformationMigrator(this.ctx).migrate(),
            },
            {
                name: 'Create technical documents',
                fn: () => new DocumentMigrator(this.ctx).migrateTechnicalDocs(),
            },
            {
                name: 'Create financial documents',
                fn: () => new DocumentMigrator(this.ctx).migrateFinancialDocs(),
            },
            {
                name: 'Reset PostgreSQL sequences', // ✅ Added step
                fn: () => new SequenceResetter(this.ctx).reset(),
            },
        ];

        console.log('\n📋 Starting migration...\n');

        for (let i = 0; i < steps.length; i++) {
            console.log(`[${i + 1}/${steps.length}] ${steps[i].name}`);
            await steps[i].fn();
            console.log('');
        }
    }

    private printSummary(): void {
        const { stats, tenderIds, infoCache } = this.ctx;

        console.log('═'.repeat(60));
        console.log('  MIGRATION SUMMARY');
        console.log('═'.repeat(60));
        console.log('');
        console.log('  Table                    Success    Errors');
        console.log('  ─────────────────────────────────────────────');
        console.log(`  tender_infos             ${this.pad(stats.tenderInfos.success)}       ${stats.tenderInfos.errors}`);
        console.log(`  tender_information       ${this.pad(stats.tenderInformation.success)}       ${stats.tenderInformation.errors}`);
        console.log(`  tender_clients           ${this.pad(stats.tenderClients.success)}       ${stats.tenderClients.errors}`);
        console.log(`  technical_documents      ${this.pad(stats.technicalDocs.success)}       ${stats.technicalDocs.errors}`);
        console.log(`  financial_documents      ${this.pad(stats.financialDocs.success)}       ${stats.financialDocs.errors}`);
        console.log('  ─────────────────────────────────────────────');
        console.log(`  Tender IDs Preserved:    ${tenderIds.size}`);
        console.log(`  Cache Entries Used:      ${infoCache.size}`);
        console.log('');
        console.log('═'.repeat(60));
        console.log('  ✅ Migration completed successfully!');
        console.log('═'.repeat(60));
    }

    private pad(num: number): string {
        return num.toString().padStart(5);
    }

    private async disconnect(): Promise<void> {
        console.log('\n🔌 Closing connections...');
        await this.pgClient.end();
        await this.mysqlPool.end();
        console.log('  ✓ All connections closed');
    }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main(): Promise<void> {
    const orchestrator = new MigrationOrchestrator(config);
    await orchestrator.run();
}

main()
    .then(() => {
        console.log('\n👋 Exiting with code 0\n');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n❌ Migration failed:', err);
        console.error('\n👋 Exiting with code 1\n');
        process.exit(1);
    });
