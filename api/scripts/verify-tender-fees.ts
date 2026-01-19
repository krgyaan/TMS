import { Client } from 'pg';

const CONFIG = {
    postgres: process.env.PG_URL || 'postgresql://postgres:gyan@localhost:5432/new_tms'
};

async function verify() {
    const client = new Client({ connectionString: CONFIG.postgres });
    await client.connect();

    console.log('\n🔎 TENDER FEE MIGRATION VERIFICATION\n');

    // 1. Check how many requests are now labeled 'Tender Fee'
    const resPurpose = await client.query(`
        SELECT COUNT(*) as count FROM payment_requests WHERE purpose = 'Tender Fee'
    `);
    console.log(`Updated 'Tender Fee' Requests: ${resPurpose.rows[0].count}`);

    // 2. Check Instruments by Source Table (using the legacy_data JSON we added)
    const resPop = await client.query(`
        SELECT COUNT(*) as count FROM payment_instruments
        WHERE legacy_data->>'source_table' = 'pop_tender_fees'
    `);
    console.log(`Migrated Portal Fees:          ${resPop.rows[0].count}`);

    const resDd = await client.query(`
        SELECT COUNT(*) as count FROM payment_instruments
        WHERE legacy_data->>'source_table' = 'dd_tender_fees'
    `);
    console.log(`Migrated DD Fees:              ${resDd.rows[0].count}`);

    const resBt = await client.query(`
        SELECT COUNT(*) as count FROM payment_instruments
        WHERE legacy_data->>'source_table' = 'bt_tender_fees'
    `);
    console.log(`Migrated BT Fees:              ${resBt.rows[0].count}`);

    await client.end();
}

verify().catch(console.error);
