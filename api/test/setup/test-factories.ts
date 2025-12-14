import type { DbInstance } from '@db';
import { users } from '@db/schemas/auth/users.schema';
import { teams } from '@db/schemas/master/teams.schema';
import { organizations } from '@db/schemas/master/organizations.schema';
import { items } from '@db/schemas/master/items.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { locations } from '@db/schemas/master/locations.schema';
import { websites } from '@db/schemas/master/websites.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { tenderClients } from '@db/schemas/tendering/tender-info-sheet.schema';
import { tenderTechnicalDocuments } from '@db/schemas/tendering/tender-info-sheet.schema';
import { tenderFinancialDocuments } from '@db/schemas/tendering/tender-info-sheet.schema';
import { industries } from '@db/schemas/master/industries.schema';
import { itemHeadings } from '@db/schemas/master/item-headings.schema';
import { sql } from 'drizzle-orm';
import * as argon2 from 'argon2';

// Use timestamps to ensure unique names across test runs
// This prevents duplicate key violations if cleanup doesn't fully complete
let userCounter = 0;
let teamCounter = 0;
let orgCounter = 0;
let itemCounter = 0;
let statusCounter = 0;
let locationCounter = 0;
let websiteCounter = 0;
let tenderCounter = 0;

// Helper to generate unique names using timestamp + counter
function getUniqueName(prefix: string, counter: number): string {
    return `${prefix}-${Date.now()}-${counter}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Retry a database operation on deadlock errors
 */
async function retryOnDeadlock<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 100
): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            const errorCode = error?.code || error?.cause?.code;
            const errorMsg = error?.message || '';
            const causeMsg = error?.cause?.message || '';
            const fullMessage = `${errorMsg} ${causeMsg}`.toLowerCase();

            const isDeadlock = errorCode === '40P01' || fullMessage.includes('deadlock');

            if (isDeadlock && attempt < maxRetries) {
                // Wait with exponential backoff before retrying
                await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
                lastError = error;
                continue;
            }

            throw error;
        }
    }
    throw lastError;
}

/**
 * Create a test user
 */
export async function createTestUser(
    db: DbInstance,
    overrides?: Partial<typeof users.$inferInsert>
): Promise<typeof users.$inferSelect> {
    userCounter++;
    const hashedPassword = await argon2.hash('TestPassword123!');

    const uniqueSuffix = getUniqueName('user', userCounter);
    const [user] = await db
        .insert(users)
        .values({
            name: `Test User ${userCounter}`,
            username: `testuser${uniqueSuffix}`,
            email: `testuser${uniqueSuffix}@example.com`,
            password: hashedPassword,
            isActive: true,
            ...overrides,
        })
        .returning();

    return user;
}

/**
 * Create a test team
 */
export async function createTestTeam(
    db: DbInstance,
    overrides?: Partial<typeof teams.$inferInsert>
): Promise<typeof teams.$inferSelect> {
    teamCounter++;

    const uniqueName = overrides?.name || getUniqueName('team', teamCounter);
    const [team] = await db
        .insert(teams)
        .values({
            name: uniqueName,
            ...overrides,
        })
        .returning();

    return team;
}

/**
 * Create a test industry (required for organizations)
 */
export async function createTestIndustry(
    db: DbInstance,
    overrides?: Partial<typeof industries.$inferInsert>
): Promise<typeof industries.$inferSelect> {
    const [industry] = await db
        .insert(industries)
        .values({
            name: `Test Industry ${Date.now()}`,
            status: true,
            ...overrides,
        })
        .returning();

    return industry;
}

/**
 * Create a test organization
 */
export async function createTestOrganization(
    db: DbInstance,
    overrides?: Partial<typeof organizations.$inferInsert>
): Promise<typeof organizations.$inferSelect> {
    orgCounter++;

    // Create industry if not provided
    let industryId = overrides?.industryId;
    if (!industryId) {
        const industry = await createTestIndustry(db);
        industryId = industry.id;
    }

    const [org] = await db
        .insert(organizations)
        .values({
            name: `Test Organization ${orgCounter}`,
            acronym: `TOrg${orgCounter}`,
            industryId,
            status: true,
            ...overrides,
        })
        .returning();

    return org;
}

/**
 * Create a test item heading (required for items)
 */
export async function createTestItemHeading(
    db: DbInstance,
    overrides?: Partial<typeof itemHeadings.$inferInsert>
): Promise<typeof itemHeadings.$inferSelect> {
    // Create team if not provided
    let teamId = overrides?.teamId;
    if (!teamId) {
        const team = await createTestTeam(db);
        teamId = team.id;
    }

    const uniqueName = overrides?.name || getUniqueName('heading', Date.now());
    return await retryOnDeadlock(async () => {
        const [heading] = await db
            .insert(itemHeadings)
            .values({
                name: uniqueName,
                teamId,
                status: true,
                ...overrides,
            })
            .returning();
        return heading;
    });
}

/**
 * Create a test item
 */
export async function createTestItem(
    db: DbInstance,
    overrides?: Partial<typeof items.$inferInsert>
): Promise<typeof items.$inferSelect> {
    itemCounter++;

    // Create team if not provided
    let teamId = overrides?.teamId;
    if (!teamId) {
        const team = await createTestTeam(db);
        teamId = team.id;
    }

    // Create heading if not provided
    // Ensure heading uses the same teamId as the item
    let headingId = overrides?.headingId;
    if (!headingId) {
        const heading = await createTestItemHeading(db, { teamId });
        headingId = heading.id;
    }

    return await retryOnDeadlock(async () => {
        const [item] = await db
            .insert(items)
            .values({
                name: `Test Item ${itemCounter}`,
                teamId,
                headingId,
                status: true,
                ...overrides,
            })
            .returning();
        return item;
    });
}

/**
 * Seed required status IDs that match application code expectations
 * This ensures status IDs used in the application code exist in the test database
 */
export async function seedRequiredStatuses(db: DbInstance): Promise<void> {
    // Map of status ID to status name
    const requiredStatuses: Array<{ id: number; name: string; tenderCategory?: string }> = [
        { id: 0, name: 'Default Status', tenderCategory: 'prep' },
        { id: 1, name: 'Initial Status', tenderCategory: 'prep' },
        { id: 2, name: 'Tender Info filled', tenderCategory: 'prep' },
        { id: 3, name: 'Tender Info approved', tenderCategory: 'prep' },
        { id: 4, name: 'RFQ Sent', tenderCategory: 'prep' },
        { id: 5, name: 'EMD Requested', tenderCategory: 'prep' },
        { id: 6, name: 'Price Bid ready', tenderCategory: 'prep' },
        { id: 7, name: 'Price Bid Approved', tenderCategory: 'prep' },
        { id: 8, name: 'Missed', tenderCategory: 'prep' },
        { id: 17, name: 'Bid Submitted', tenderCategory: 'prep' },
        { id: 19, name: 'TQ Received', tenderCategory: 'prep' },
        { id: 20, name: 'TQ replied', tenderCategory: 'prep' },
        { id: 22, name: 'Disqualified (reason)', tenderCategory: 'prep' },
        { id: 23, name: 'RA scheduled', tenderCategory: 'prep' },
        { id: 24, name: 'Lost (Price Bid result to be uploaded)', tenderCategory: 'prep' },
        { id: 25, name: 'Won (PO awaited)', tenderCategory: 'prep' },
        { id: 29, name: 'Tender Info sheet Incomplete', tenderCategory: 'prep' },
        { id: 30, name: 'Physical Docs Submitted', tenderCategory: 'prep' },
        { id: 37, name: 'Qualified', tenderCategory: 'prep' },
        { id: 38, name: 'Not qualified', tenderCategory: 'prep' },
        { id: 39, name: 'Disqualified, TQ missed', tenderCategory: 'prep' },
    ];

    // Insert statuses with specific IDs using raw SQL
    // We use raw SQL because drizzle's insert doesn't easily support setting specific IDs for serial columns
    for (const statusData of requiredStatuses) {
        // Check if status with this ID already exists
        const existing = await db
            .select()
            .from(statuses)
            .where(sql`${statuses.id} = ${statusData.id}`)
            .limit(1);

        if (existing.length > 0) {
            // Update existing status if name or category differs
            try {
                if (existing[0].name !== statusData.name || existing[0].tenderCategory !== (statusData.tenderCategory || 'prep')) {
                    await db
                        .update(statuses)
                        .set({
                            name: statusData.name,
                            tenderCategory: statusData.tenderCategory || 'prep',
                            updatedAt: new Date(),
                        })
                        .where(sql`${statuses.id} = ${statusData.id}`);
                }
            } catch (error: any) {
                // If update fails due to unique constraint on name, skip
                if (error?.code !== '23505') {
                    throw error;
                }
            }
        } else {
            // Insert new status with specific ID using raw SQL
            // Escape single quotes in name for SQL
            const escapedName = statusData.name.replace(/'/g, "''");
            const category = statusData.tenderCategory || 'prep';

            try {
                // For status ID 0, we can't use sequence manipulation (sequences start at 1)
                // For ID 1, we set sequence to 1 (which will be incremented to 2 next, but we override with explicit ID)
                // For ID > 1, set sequence to id - 1
                if (statusData.id === 0) {
                    // Insert ID 0 directly without sequence manipulation
                    await db.execute(sql.raw(`
                        INSERT INTO statuses (id, name, tender_category, status, created_at, updated_at)
                        VALUES (0, '${escapedName}', '${category}', true, NOW(), NOW())
                    `));
                } else {
                    // For IDs >= 1, set sequence appropriately
                    // Set sequence to max(1, id - 1) to ensure it's valid (sequences must be >= 1)
                    const sequenceValue = Math.max(1, statusData.id - 1);
                    await db.execute(sql.raw(`SELECT setval('statuses_id_seq', ${sequenceValue}, false)`));

                    // Insert using raw SQL with specific ID
                    await db.execute(sql.raw(`
                        INSERT INTO statuses (id, name, tender_category, status, created_at, updated_at)
                        VALUES (${statusData.id}, '${escapedName}', '${category}', true, NOW(), NOW())
                    `));
                }
            } catch (error: any) {
                // If insert fails due to unique constraint on name, try to update existing status
                if (error?.code === '23505') {
                    // Status with this name exists but different ID - find and update it
                    const existingByName = await db
                        .select()
                        .from(statuses)
                        .where(sql`${statuses.name} = ${statusData.name}`)
                        .limit(1);

                    if (existingByName.length > 0) {
                        await db
                            .update(statuses)
                            .set({
                                tenderCategory: statusData.tenderCategory || 'prep',
                                updatedAt: new Date(),
                            })
                            .where(sql`${statuses.id} = ${existingByName[0].id}`);
                    }
                } else {
                    // Re-throw other errors
                    throw error;
                }
            }
        }
    }

    // Ensure the sequence is set to a value higher than the highest ID we're using
    const maxStatusId = Math.max(...requiredStatuses.map(s => s.id));
    try {
        await db.execute(sql.raw(`SELECT setval('statuses_id_seq', GREATEST(${maxStatusId}, (SELECT MAX(id) FROM statuses)))`));
    } catch (error: any) {
        // Ignore sequence errors - they're not critical
    }
}

/**
 * Create a test status
 */
export async function createTestStatus(
    db: DbInstance,
    overrides?: Partial<typeof statuses.$inferInsert>
): Promise<typeof statuses.$inferSelect> {
    statusCounter++;

    const uniqueName = overrides?.name || getUniqueName('status', statusCounter);
    const [status] = await db
        .insert(statuses)
        .values({
            name: uniqueName,
            tenderCategory: 'prep',
            status: true,
            ...overrides,
        })
        .returning();

    return status;
}

/**
 * Create a test location
 */
export async function createTestLocation(
    db: DbInstance,
    overrides?: Partial<typeof locations.$inferInsert>
): Promise<typeof locations.$inferSelect> {
    locationCounter++;

    const [location] = await db
        .insert(locations)
        .values({
            name: `Test Location ${locationCounter}`,
            state: 'Test State',
            status: true,
            ...overrides,
        })
        .returning();

    return location;
}

/**
 * Create a test website
 */
export async function createTestWebsite(
    db: DbInstance,
    overrides?: Partial<typeof websites.$inferInsert>
): Promise<typeof websites.$inferSelect> {
    websiteCounter++;

    const [website] = await db
        .insert(websites)
        .values({
            name: `Test Website ${websiteCounter}`,
            url: `https://test${websiteCounter}.example.com`,
            status: true,
            ...overrides,
        })
        .returning();

    return website;
}

/**
 * Create a test tender
 */
export async function createTestTender(
    db: DbInstance,
    overrides?: Partial<typeof tenderInfos.$inferInsert>
): Promise<typeof tenderInfos.$inferSelect> {
    tenderCounter++;

    // Create required dependencies if not provided
    let teamId = overrides?.team;
    if (!teamId) {
        const team = await createTestTeam(db);
        teamId = team.id;
    }

    let itemId = overrides?.item;
    if (!itemId) {
        const item = await createTestItem(db, { teamId });
        itemId = item.id;
    }

    let statusId = overrides?.status;
    if (!statusId) {
        // Use status ID 1 by default (matches application code expectation)
        // Verify it exists, if not, use the first available status
        const status1 = await db
            .select()
            .from(statuses)
            .where(sql`${statuses.id} = 1`)
            .limit(1);

        if (status1.length > 0) {
            statusId = 1;
        } else {
            // Status 1 doesn't exist, get first available status or create one
            const firstStatus = await db
                .select()
                .from(statuses)
                .limit(1);

            if (firstStatus.length > 0) {
                statusId = firstStatus[0].id;
            } else {
                // No statuses exist, this should not happen if seedRequiredStatuses was called
                // Fall back to creating a test status
                const status = await createTestStatus(db);
                statusId = status.id;
            }
        }
    }

    let teamMemberId = overrides?.teamMember;
    if (!teamMemberId) {
        const user = await createTestUser(db);
        teamMemberId = user.id;
    }

    const [tender] = await db
        .insert(tenderInfos)
        .values({
            team: teamId,
            tenderNo: `TENDER-${tenderCounter}-${Date.now()}`,
            tenderName: `Test Tender ${tenderCounter}`,
            item: itemId,
            gstValues: '0.00',
            tenderFees: '0.00',
            emd: '0.00',
            teamMember: teamMemberId,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            status: statusId,
            deleteStatus: 0,
            tlStatus: 0,
            ...overrides,
        })
        .returning();

    return tender;
}

/**
 * Create a test tender info sheet
 */
export async function createTestTenderInfoSheet(
    db: DbInstance,
    tenderId: number,
    overrides?: Partial<typeof tenderInformation.$inferInsert>
): Promise<typeof tenderInformation.$inferSelect> {
    const [infoSheet] = await db
        .insert(tenderInformation)
        .values({
            tenderId,
            teRecommendation: 'YES',
            ...overrides,
        })
        .returning();

    return infoSheet;
}

/**
 * Create test tender clients
 */
export async function createTestTenderClients(
    db: DbInstance,
    tenderId: number,
    clients: Array<{
        clientName: string;
        clientDesignation?: string;
        clientMobile?: string;
        clientEmail?: string;
    }>
): Promise<typeof tenderClients.$inferSelect[]> {
    const inserted = await db
        .insert(tenderClients)
        .values(
            clients.map((client) => ({
                tenderId,
                ...client,
            }))
        )
        .returning();

    return inserted;
}

/**
 * Create test technical documents
 */
export async function createTestTechnicalDocuments(
    db: DbInstance,
    tenderId: number,
    documentNames: string[]
): Promise<typeof tenderTechnicalDocuments.$inferSelect[]> {
    const inserted = await db
        .insert(tenderTechnicalDocuments)
        .values(
            documentNames.map((name) => ({
                tenderId,
                documentName: name,
            }))
        )
        .returning();

    return inserted;
}

/**
 * Create test financial documents
 */
export async function createTestFinancialDocuments(
    db: DbInstance,
    tenderId: number,
    documentNames: string[]
): Promise<typeof tenderFinancialDocuments.$inferSelect[]> {
    const inserted = await db
        .insert(tenderFinancialDocuments)
        .values(
            documentNames.map((name) => ({
                tenderId,
                documentName: name,
            }))
        )
        .returning();

    return inserted;
}

/**
 * Safely execute DELETE statement, ignoring errors for missing tables only
 * Foreign key violations indicate deletion order issues and should NOT be ignored
 */
async function safeDelete(db: DbInstance, tableName: string): Promise<void> {
    try {
        await db.execute(`DELETE FROM ${tableName}`);
    } catch (error: any) {
        // Collect error information from all possible locations
        const errorCode = error?.code || error?.cause?.code;
        const errorMsg = error?.message || '';
        const causeMsg = error?.cause?.message || '';
        const errorStr = error?.toString() || '';
        const fullMessage = `${errorMsg} ${causeMsg} ${errorStr}`.toLowerCase();

        // PostgreSQL error code 42P01 = undefined_table
        // Check for various "table does not exist" error patterns
        const isMissingTableError =
            errorCode === '42P01' ||
            fullMessage.includes('does not exist') ||
            (fullMessage.includes('relation') && fullMessage.includes('does not exist')) ||
            fullMessage.includes('no such table') ||
            fullMessage.includes('undefined table');

        // Only ignore missing table errors - all other errors (including foreign key violations) should be thrown
        // Foreign key violations indicate deletion order issues that need to be fixed
        if (!isMissingTableError) {
            throw error;
        }
        // Silently ignore confirmed missing table errors
    }
}

/**
 * Safely execute TRUNCATE CASCADE statement, ignoring errors for missing tables
 * CASCADE automatically deletes dependent rows, making cleanup more reliable
 */
async function safeTruncate(db: DbInstance, tableName: string): Promise<void> {
    try {
        await db.execute(`TRUNCATE TABLE ${tableName} CASCADE`);
    } catch (error: any) {
        // Collect error information from all possible locations
        const errorCode = error?.code || error?.cause?.code;
        const errorMsg = error?.message || '';
        const causeMsg = error?.cause?.message || '';
        const errorStr = error?.toString() || '';
        const fullMessage = `${errorMsg} ${causeMsg} ${errorStr}`.toLowerCase();

        const isMissingTableError =
            errorCode === '42P01' ||
            fullMessage.includes('does not exist') ||
            (fullMessage.includes('relation') && fullMessage.includes('does not exist')) ||
            fullMessage.includes('no such table') ||
            fullMessage.includes('undefined table');

        if (!isMissingTableError) {
            throw error;
        }
        // Silently ignore missing table errors
    }
}

/**
 * Clean up all test data
 * Deletes tables in reverse dependency order to avoid foreign key constraint violations
 * Uses multiple strategies to ensure complete cleanup:
 * 1. Ordered DELETE statements with retries
 * 2. Final TRUNCATE CASCADE pass for critical tables (with deadlock handling)
 */
export async function cleanupTestData(db: DbInstance): Promise<void> {
    // Strategy 1: Try ordered deletions with retries
    // Increased passes to handle complex dependency chains
    const maxPasses = 5;
    let cleanupSucceeded = false;

    for (let pass = 1; pass <= maxPasses; pass++) {
        try {
            await cleanupTestDataInternal(db);
            cleanupSucceeded = true;
            break;
        } catch (error: any) {
            // Check if this is a foreign key violation - if so, try again
            const errorCode = error?.code || error?.cause?.code;
            const errorMsg = error?.message || '';
            const causeMsg = error?.cause?.message || '';
            const fullMessage = `${errorMsg} ${causeMsg}`.toLowerCase();

            const isForeignKeyError =
                errorCode === '23503' ||
                fullMessage.includes('violates foreign key') ||
                fullMessage.includes('foreign key constraint');

            // If it's a foreign key error and we have more passes, continue
            if (isForeignKeyError && pass < maxPasses) {
                // Wait longer before retrying to allow any transactions to complete
                // Increase delay with each pass to give database more time
                await new Promise(resolve => setTimeout(resolve, 100 * pass));
                continue;
            }

            // If it's not a foreign key error, log and continue to final cleanup
            // Don't throw - we'll try final cleanup anyway
            console.warn(`Cleanup pass ${pass} failed:`, error.message || error);
            break;
        }
    }

    // Strategy 2: Final aggressive cleanup using TRUNCATE CASCADE
    // This ensures everything is deleted even if ordered deletions failed
    // Always run this as a safety net, even if previous cleanup succeeded
    // Run multiple times to handle any remaining dependencies
    for (let truncatePass = 1; truncatePass <= 3; truncatePass++) {
        try {
            await finalCleanupWithTruncate(db);
            // If we get here, cleanup succeeded
            break;
        } catch (error: any) {
            const errorCode = error?.code || error?.cause?.code;
            if (truncatePass === 3) {
                // On final pass, log but don't throw - we've done our best
                if (errorCode !== '42P01') { // Don't log missing table errors
                    console.warn('Final cleanup with TRUNCATE failed after 3 passes:', error.message || error);
                }
            } else {
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 50 * truncatePass));
            }
        }
    }
}

/**
 * Internal cleanup function that performs the actual deletions
 * Uses TRUNCATE CASCADE for critical tables to ensure complete deletion
 */
async function cleanupTestDataInternal(db: DbInstance): Promise<void> {
    // Helper to safely delete with error handling
    const deleteSafely = async (tableName: string) => {
        try {
            await safeDelete(db, tableName);
        } catch (error: any) {
            // Only ignore missing table errors - let foreign key errors propagate for retry
            const errorCode = error?.code || error?.cause?.code;
            if (errorCode === '42P01') {
                // Missing table - ignore
                return;
            }
            // For foreign key errors, throw so retry mechanism can handle them
            throw error;
        }
    };

    // Helper to safely truncate with CASCADE (more aggressive cleanup)
    const truncateSafely = async (tableName: string) => {
        try {
            await safeTruncate(db, tableName);
        } catch (error: any) {
            // Only ignore missing table errors
            const errorCode = error?.code || error?.cause?.code;
            if (errorCode === '42P01') {
                return;
            }
            // For other errors (like deadlocks), fall back to DELETE
            try {
                await safeDelete(db, tableName);
            } catch (deleteError: any) {
                const deleteErrorCode = deleteError?.code || deleteError?.cause?.code;
                if (deleteErrorCode !== '42P01') {
                    throw deleteError;
                }
            }
        }
    };

    // Level 1: Tables with no dependencies (leaf nodes)
    // RFQ response items (depends on rfq_responses and rfq_items)
    await deleteSafely('rfq_response_items');
    await deleteSafely('rfq_response_documents');

    // Level 2: Tables that depend on Level 1
    // RFQ responses (depends on rfqs and vendors)
    await deleteSafely('rfq_responses');

    // Physical docs persons (depends on physical_docs)
    await deleteSafely('physical_docs_persons');

    // Tender results (depends on tender_infos and reverse_auctions)
    await deleteSafely('tender_results');

    // Level 3: Tables that depend on Level 2
    // RFQ items and documents (depends on rfqs)
    await deleteSafely('rfq_items');
    await deleteSafely('rfq_documents');

    // Physical docs (depends on tender_infos)
    await deleteSafely('physical_docs');

    // Reverse auctions (depends on tender_infos)
    await deleteSafely('reverse_auctions');

    // Workflow timer events (depends on wf_step_instances)
    await deleteSafely('wf_timer_events');

    // Level 4: Tables that depend on Level 3
    // RFQs (depends on tender_infos)
    await deleteSafely('rfqs');

    // Workflow step instances (depends on wf_instances and users)
    await deleteSafely('wf_step_instances');

    // Level 5: Payment instrument details (depend on payment_instruments)
    await deleteSafely('instrument_status_history');
    await deleteSafely('instrument_bg_details');
    await deleteSafely('instrument_cheque_details');
    await deleteSafely('instrument_dd_details');
    await deleteSafely('instrument_fdr_details');
    await deleteSafely('instrument_transfer_details');

    // Level 6: Payment instruments (depends on payment_requests)
    await deleteSafely('payment_instruments');

    // Level 7: Payment requests (depends on tender_infos)
    await deleteSafely('payment_requests');

    // Level 8: Tender-related tables (depend on tender_infos)
    // IMPORTANT: Delete tender_status_history FIRST as it references statuses
    // This must be deleted before statuses to avoid foreign key violations
    await deleteSafely('tender_status_history');
    await deleteSafely('tender_financial_documents');
    await deleteSafely('tender_technical_documents');
    await deleteSafely('tender_clients');
    await deleteSafely('tender_information');
    await deleteSafely('tender_incomplete_fields');
    await deleteSafely('tender_queries');
    await deleteSafely('tender_document_checklists');
    await deleteSafely('bid_submissions');

    // Level 9: Tender infos (depends on teams, organizations, items, users, statuses, locations, websites)
    await deleteSafely('tender_infos');

    // Level 10: Projects (depends on organizations, items, locations)
    await deleteSafely('projects');

    // Level 11: Items (depends on item_headings and teams)
    // NOTE: Master data - items are preserved, only test-created items should be cleaned
    // Items are master data and should persist across tests

    // Level 12: Item headings deletion moved to Level 23 to ensure items are deleted first

    // Level 13: Vendor files (depends on vendors)
    await deleteSafely('vendor_files');

    // Level 14: Vendors (depends on vendor_organizations)
    await deleteSafely('vendors');

    // Level 15: Vendor-related tables (depend on vendor_organizations)
    await deleteSafely('vendor_gsts');
    await deleteSafely('vendor_accs');

    // Level 16: Company documents (depends on companies)
    await deleteSafely('company_documents');

    // Level 17: Workflow instances (depends on wf_templates)
    await deleteSafely('wf_instances');

    // Level 18: Employee imprests (depends on users and teams)
    await deleteSafely('employee_imprests');

    // Level 19: Couriers (depends on users)
    await deleteSafely('couriers');

    // Level 20: User-related tables (depend on users)
    await deleteSafely('user_profiles');
    await deleteSafely('user_roles');
    await deleteSafely('user_permissions');
    await deleteSafely('oauth_accounts');
    await deleteSafely('follow_ups');

    // Level 21: Workflow templates and config (depends on users and teams)
    await deleteSafely('wf_templates');
    await deleteSafely('wf_working_hours_config');

    // Level 22: Master data tables
    // IMPORTANT: Master data tables are preserved and NOT deleted
    // Only delete tender_status_history again as a safeguard
    await deleteSafely('tender_status_history');
    // Master data preserved: websites, locations, statuses, organizations, industries
    await deleteSafely('vendor_organizations');
    await deleteSafely('companies');
    await deleteSafely('designations');
    await deleteSafely('client_directory');

    // Level 23: Teams and related master data
    // NOTE: Master data preserved - teams, items, item_headings are NOT deleted
    // Only clean up test-created data that references master data
    await deleteSafely('tender_infos'); // Must be deleted (test data)
    // Master data preserved: items, item_headings, teams
    await deleteSafely('user_profiles'); // References teams via primary_team_id
    await deleteSafely('employee_imprests'); // References teams
    await deleteSafely('wf_templates'); // References teams
    await deleteSafely('wf_working_hours_config'); // References teams

    // Level 24: Final safeguard deletions (don't use TRUNCATE here - that's in finalCleanupWithTruncate)
    // NOTE: Master data preserved - teams and users are NOT deleted
    // Only clean up test-created users if needed (users table contains master data)
    // Teams are master data and should persist
}

/**
 * Final cleanup pass using TRUNCATE CASCADE for critical tables
 * This is called after ordered deletions to ensure complete cleanup
 * Handles deadlocks gracefully by falling back to DELETE
 */
async function finalCleanupWithTruncate(db: DbInstance): Promise<void> {
    // List of critical tables that should be completely empty
    // Order matters - delete dependent tables first
    // NOTE: Master data tables (statuses, teams, items, item_headings, organizations, locations, websites, industries, users) are preserved
    const criticalTables = [
        'tender_status_history',
        'tender_infos',
        'user_profiles',
        'employee_imprests',
        'wf_templates',
        'wf_working_hours_config',
        // Master data preserved: items, item_headings, organizations, statuses, locations, websites, industries, teams, users
    ];

    // Try TRUNCATE CASCADE for each table, fall back to DELETE on deadlock
    // Process tables in reverse order multiple times to handle dependencies
    for (let pass = 1; pass <= 2; pass++) {
        for (const tableName of criticalTables) {
            try {
                // Try TRUNCATE CASCADE first (faster and more thorough)
                await safeTruncate(db, tableName);
            } catch (error: any) {
                const errorCode = error?.code || error?.cause?.code;
                const errorMsg = error?.message || '';
                const causeMsg = error?.cause?.message || '';
                const fullMessage = `${errorMsg} ${causeMsg}`.toLowerCase();

                // If deadlock or foreign key error, fall back to DELETE
                const isDeadlock = errorCode === '40P01' || fullMessage.includes('deadlock');
                const isForeignKeyError = errorCode === '23503' || fullMessage.includes('foreign key');
                const isMissingTable = errorCode === '42P01';

                if (isMissingTable) {
                    // Table doesn't exist - that's fine, continue
                    continue;
                }

                if (isDeadlock) {
                    // For deadlocks, wait and retry
                    if (pass < 2) {
                        await new Promise(resolve => setTimeout(resolve, 100 * pass));
                        continue; // Retry this table on next pass
                    } else {
                        // Final pass - try DELETE as fallback
                        try {
                            await safeDelete(db, tableName);
                        } catch (deleteError: any) {
                            const deleteErrorCode = deleteError?.code || deleteError?.cause?.code;
                            if (deleteErrorCode !== '42P01') {
                                console.warn(`Failed to cleanup ${tableName} after deadlock on pass ${pass}:`, deleteError.message || deleteError);
                            }
                        }
                    }
                } else if (isForeignKeyError) {
                    // Fall back to DELETE
                    try {
                        await safeDelete(db, tableName);
                    } catch (deleteError: any) {
                        // Ignore missing table errors
                        const deleteErrorCode = deleteError?.code || deleteError?.cause?.code;
                        if (deleteErrorCode !== '42P01' && pass === 2) {
                            // Only log on final pass
                            console.warn(`Failed to cleanup ${tableName} on pass ${pass}:`, deleteError.message || deleteError);
                        }
                    }
                } else {
                    // Other errors - try DELETE as last resort
                    try {
                        await safeDelete(db, tableName);
                    } catch (deleteError: any) {
                        const deleteErrorCode = deleteError?.code || deleteError?.cause?.code;
                        if (deleteErrorCode !== '42P01' && pass === 2) {
                            // Only log on final pass
                            console.warn(`Failed to cleanup ${tableName} with DELETE on pass ${pass}:`, deleteError.message || deleteError);
                        }
                    }
                }
            }
        }

        // Small delay between passes to allow database to settle
        if (pass < 2) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
}
