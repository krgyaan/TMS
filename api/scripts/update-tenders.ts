import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql2 from 'mysql2/promise';
import { mysqlTable, bigint, varchar, text } from 'drizzle-orm/mysql-core';
import { Client } from 'pg';
import { eq } from 'drizzle-orm';
import {
    tenderInfos,
    tenderInformation,
} from '@db/schemas/tendering';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
    postgres: process.env.PG_URL || 'postgresql://postgres:gyan@localhost:5432/new_tms',
    mysql: process.env.MYSQL_URL || 'mysql://root:gyan@localhost:3306/mydb',
};

// ============================================================================
// MYSQL SCHEMA (Minimal definition for fetching raw data)
// ============================================================================

const mysqlTenderInformation = mysqlTable('tender_information', {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    tender_id: bigint('tender_id', { mode: 'number' }).notNull(),
    tender_fees: varchar('tender_fees', { length: 200 }),
    emd_opt: varchar('emd_opt', { length: 200 }),
});

// ============================================================================
// UTILITY: NEW PARSER
// ============================================================================

const Parsers = {
    mapPaymentModes(val: unknown): string[] | null {
        if (val == null || val === '') return null;

        const MAP: Record<string, string> = {
            '1': 'POP',
            '2': 'BT',
            '3': 'DD',
            '4': 'BG',
            '5': 'FDR',
            '6': 'NA',
            '7': 'SB',
        };

        let rawItems: string[] = [];

        // Handle Strings (e.g., "1,2" or "1")
        if (typeof val === 'string') {
            // Remove legacy JSON brackets/quotes if they exist and split by comma
            rawItems = val.replace(/[\[\]"]/g, '').split(',');
        }
        // Handle Numbers (e.g., 1)
        else if (typeof val === 'number') {
            rawItems = [String(val)];
        }

        // Map values and filter out invalid ones
        const mappedItems = rawItems
            .map(s => s.trim())
            .map(key => MAP[key] || null) // Map ID to Code
            .filter((item): item is string => item !== null);

        return mappedItems.length > 0 ? mappedItems : null;
    },
};

// ============================================================================
// UPDATE LOGIC
// ============================================================================

async function updateTenders() {
    console.log('\n' + '═'.repeat(60));
    console.log('  TENDER FIXER: Updating Payment Modes');
    console.log('═'.repeat(60));

    // 1. Connect
    const pgClient = new Client({ connectionString: config.postgres });
    await pgClient.connect();
    const pgDb = pgDrizzle(pgClient);

    const mysqlPool = mysql2.createPool(config.mysql);
    const mysqlDb = mysqlDrizzle(mysqlPool);

    try {
        console.log('📡 Fetching raw data from MySQL...');

        // Get all tender_information rows to process
        const rows = await mysqlDb
            .select({
                id: mysqlTenderInformation.id,
                tenderId: mysqlTenderInformation.tender_id,
                tenderFees: mysqlTenderInformation.tender_fees,
                emdOpt: mysqlTenderInformation.emd_opt,
            })
            .from(mysqlTenderInformation);

        console.log(`📋 Found ${rows.length} records to process.`);
        console.log('🔄 Starting updates...');

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            // Progress log every 500 records
            if ((i + 1) % 500 === 0) {
                console.log(`   Processing ${i + 1}/${rows.length}...`);
            }

            try {
                // 1. Parse Data
                const tenderFeeArray = Parsers.mapPaymentModes(row.tenderFees);
                const emdArray = Parsers.mapPaymentModes(row.emdOpt);

                const tenderFeeString = tenderFeeArray ? tenderFeeArray.join(',') : null;
                const emdString = emdArray ? emdArray.join(',') : null;

                // 2. Update 'tender_information' (Detail table)
                // Stores as Array (text[] or json)
                await pgDb
                    .update(tenderInformation)
                    .set({
                        tenderFeeMode: tenderFeeArray, // Passing array
                        emdMode: emdArray,             // Passing array
                    })
                    .where(eq(tenderInformation.id, row.id));

                // 3. Update 'tender_infos' (Summary table)
                // Stores as String ("POP,DD") based on previous schema assumptions
                // We use row.tenderId here because that links to tender_infos.id
                await pgDb
                    .update(tenderInfos)
                    .set({
                        tenderFeeMode: tenderFeeString, // Passing string
                        emdMode: emdString,             // Passing string
                    })
                    .where(eq(tenderInfos.id, row.tenderId));

                successCount++;
            } catch (err) {
                console.error(`❌ Error updating ID ${row.id}:`, err);
                errorCount++;
            }
        }

        console.log('\n' + '═'.repeat(60));
        console.log('  UPDATE SUMMARY');
        console.log('═'.repeat(60));
        console.log(`  ✓ Updated: ${successCount}`);
        console.log(`  ✗ Errors:  ${errorCount}`);
        console.log('═'.repeat(60));

    } catch (err) {
        console.error('Fatal error:', err);
    } finally {
        await pgClient.end();
        await mysqlPool.end();
        console.log('\n🔌 Connections closed.');
    }
}

// Run
updateTenders();
