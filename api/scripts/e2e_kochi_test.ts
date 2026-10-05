import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TenderInfoSheetsService } from '../src/modules/tendering/info-sheets/info-sheets.service';
import { PdfExtractionProcessor } from '../src/modules/tendering/info-sheets/pdf-extraction.processor';
import { TenderInfoSheetPayloadSchema } from '../src/modules/tendering/info-sheets/dto/info-sheet.dto';
import { tenderInfos } from '../src/db/schemas/tendering/tenders.schema';
import { tenderExtractions } from '../src/db/schemas/tendering/tender-extractions.schema';
import { tenderInformation } from '../src/db/schemas/tendering/tender-info-sheet.schema';
import { DRIZZLE } from '../src/db/database.module';
import { eq } from 'drizzle-orm';
import * as path from 'path';
import * as fs from 'fs';

async function runE2E() {
    console.log('================================================================');
    console.log('PHASE 1A: End-to-End Ingestion & Validation Test on Kochi Tender');
    console.log('================================================================\n');

    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
    const db = app.get(DRIZZLE);
    const infoSheetsService = app.get(TenderInfoSheetsService);
    const processor = app.get(PdfExtractionProcessor);

    const gemPdfPath = path.resolve(__dirname, '../uploads/tendering/tender-documents/1790747505320_1789642933617_GeM-Bidding-9879403__1_.pdf');
    const atcPdfPath = path.resolve(__dirname, '../uploads/tendering/tender-documents/1790747530909_1789816376520_1789643024088_Tender1_f4d8b1ff-effa-.pdf');

    if (!fs.existsSync(gemPdfPath)) throw new Error(`GeM PDF not found: ${gemPdfPath}`);
    if (!fs.existsSync(atcPdfPath)) throw new Error(`ATC PDF not found: ${atcPdfPath}`);

    console.log(`[1] Verified PDF files exist:`);
    console.log(`    - GeM Bidding PDF: ${gemPdfPath}`);
    console.log(`    - GAIL ATC PDF: ${atcPdfPath}\n`);

    // 1. Create a NEW tender in tender_infos
    const testTenderNo = `GEM/2026/B/8024876-E2E-${Date.now()}`;
    const [newTender] = await db.insert(tenderInfos).values({
        team: 1,
        tenderNo: testTenderNo,
        tenderName: 'Lumpsum Charges For Supply, Installation & Commissioning of Flow Meters',
        item: 8,
        status: 1,
        dueDate: new Date('2026-10-08T14:00:00+05:30'),
        documents: JSON.stringify({
            schemaVersion: 1,
            mainTender: gemPdfPath,
            atc: [atcPdfPath],
            boq: null,
            otherDocuments: [],
        }),
    }).returning();

    console.log(`[2] Created NEW tender in PostgreSQL (tender_infos):`);
    console.log(`    - Tender ID: ${newTender.id}`);
    console.log(`    - Tender No: ${newTender.tenderNo}\n`);

    // 2. Run extraction through PdfExtractionProcessor (calling VolksAI on port 8001)
    console.log(`[3] Dispatching extraction job to VolksAI (http://127.0.0.1:8001/extract)...`);
    const mockJob: any = {
        id: `e2e-job-${newTender.id}`,
        data: {
            tenderId: newTender.id,
            pdfPath: gemPdfPath,
            mainTenderPath: gemPdfPath,
            atcPaths: [atcPdfPath],
            boqPath: null,
            userId: 91,
        },
    };

    const extractionResult = await processor.processJob(mockJob, 'http://127.0.0.1:8001', 120000);
    console.log(`    - Extraction succeeded in ${extractionResult.processing_time_ms}ms`);
    console.log(`    - Extracted field count: ${Object.keys(extractionResult.fields || {}).length}`);
    console.log(`    - llm_status: ${extractionResult.llm_status}\n`);

    // 3. Confirm persistence in tender_extractions
    const [savedExtraction] = await db
        .select()
        .from(tenderExtractions)
        .where(eq(tenderExtractions.tenderId, newTender.id))
        .limit(1);

    if (!savedExtraction) {
        throw new Error('tender_extractions row was NOT persisted in PostgreSQL!');
    }
    console.log(`[4] Verified persistence in tender_extractions table:`);
    const fields = savedExtraction.fields as Record<string, any>;
    console.log(`    - ldType in fields:`, fields.ldType?.value);
    console.log(`    - grievanceContact in fields:`, fields.grievanceContact?.value);
    console.log(`    - grievanceEmail in fields:`, fields.grievanceEmail?.value);
    console.log(`    - llm_status:`, extractionResult.llm_status);

    // 4. Construct Info Sheet Payload and validate through TenderInfoSheetPayloadSchema
    console.log(`\n[5] Validating payload through NestJS TenderInfoSheetPayloadSchema...`);
    const payload = {
        tenderValue: fields.tenderValue?.value ?? null,
        teRecommendation: 'YES',
        paymentTermsSupply: typeof fields.paymentTermsSupply?.value === 'number' ? fields.paymentTermsSupply.value : null,
        paymentTermsInstallation: typeof fields.paymentTermsInstallation?.value === 'number' ? fields.paymentTermsInstallation.value : null,
        bidValidityDays: fields.bidValidityDays?.value ?? null,
        deliveryTimeSupply: fields.deliveryTimeSupply?.value ?? null,
        deliveryTimeInstallationInclusive: fields.deliveryTimeInstallationInclusive?.value ?? false,
        deliveryTimeInstallationDays: fields.deliveryTimeInstallationDays?.value ?? null,
        pbgRequired: fields.pbgRequired?.value ?? null,
        pbgMode: Array.isArray(fields.pbgMode?.value)
            ? fields.pbgMode.value
            : (fields.pbgMode?.value ? [fields.pbgMode.value] : (fields.pbgRequired?.value === 'YES' ? ['PBG'] : null)),
        pbgPercentage: fields.pbgPercentage?.value ?? null,
        pbgDurationMonths: fields.pbgDurationMonths?.value ?? null,
        sdRequired: fields.sdRequired?.value ?? null,
        ldRequired: fields.ldRequired?.value ?? null,
        ldType: fields.ldType?.value ?? null,
        ldPercentagePerWeek: fields.ldPercentagePerWeek?.value ?? null,
        maxLdPercentage: fields.maxLdPercentage?.value ?? null,
        physicalDocsRequired: fields.physicalDocsRequired?.value ?? null,
        physicalDocType: fields.physicalDocType?.value ?? (fields.physicalDocsRequired?.value === 'YES' ? 'EMD_AND_OTHER_DOCUMENTS' : null),
        physicalDocsDeadline: fields.physicalDocsDeadline?.value ?? null,
        preBidMeeting: fields.preBidMeeting?.value ?? null,
        siteVisit: fields.siteVisit?.value ?? null,
        techEligibilityAge: fields.techEligibilityAge?.value ?? null,
        avgAnnualTurnoverType: fields.avgAnnualTurnoverType?.value ?? null,
        avgAnnualTurnoverValue: fields.avgAnnualTurnoverValue?.value ?? null,
        clients: fields.clients?.value || [],
        grievanceContact: fields.grievanceContact?.value ?? null,
        grievanceEmail: fields.grievanceEmail?.value ?? null,
        llm_status: extractionResult.llm_status || 'ok',
    };

    const validatedPayload = TenderInfoSheetPayloadSchema.parse(payload);
    console.log(`    - TenderInfoSheetPayloadSchema validation PASSED cleanly.`);
    console.log(`    - validatedPayload.ldType:`, validatedPayload.ldType);
    console.log(`    - validatedPayload.grievanceContact:`, validatedPayload.grievanceContact);
    console.log(`    - validatedPayload.grievanceEmail:`, validatedPayload.grievanceEmail);
    console.log(`    - validatedPayload.llm_status:`, validatedPayload.llm_status);

    // 5. Save Info Sheet via TenderInfoSheetsService
    console.log(`\n[6] Persisting validated info sheet into tender_information...`);
    const savedInfoRecord = await infoSheetsService.create(newTender.id, validatedPayload, 91);
    console.log(`    - Saved tender_information id:`, savedInfoRecord.id);

    // 6. Fetch saved record from tender_information
    const fetchedRecord = await infoSheetsService.findByTenderId(newTender.id);
    if (!fetchedRecord) {
        throw new Error(`Failed to fetch saved tender_information record for tender ${newTender.id}`);
    }

    // 7. Verify all 9 Ground-Truth Values
    console.log(`\n================================================================`);
    console.log(`GROUND-TRUTH VERIFICATION (9 KNOWN VALUES)`);
    console.log(`================================================================`);

    const checks = [
        {
            num: 1,
            name: 'Bid Due Date & Opening',
            expected: 'End: 08-10-2026 14:00, Opening: 09-10-2026 14:00',
            actual: `End: ${fields.gemBidEndDate?.value}, Opening: ${fields.gemBidOpeningDate?.value}`,
            match: fields.gemBidEndDate?.value === '08-10-2026 14:00:00' && fields.gemBidOpeningDate?.value === '09-10-2026 14:00:00',
        },
        {
            num: 2,
            name: 'Payment Terms Milestones',
            expected: 'Structured milestone text; both % boxes empty (null)',
            actual: `Supply text: "${fields.paymentTermsSupply?.value}", DTO supply: ${fetchedRecord.paymentTermsSupply}, DTO install: ${fetchedRecord.paymentTermsInstallation}`,
            match: fields.paymentTermsSupply?.value === 'supply portion 70% on receipt and acceptance within 30 days / 30% after commissioning and lifting of buyback items; installation and commissioning 100% on completion' &&
                   fields.paymentTermsInstallation?.value === '100% on completion' &&
                   fetchedRecord.paymentTermsSupply === null &&
                   fetchedRecord.paymentTermsInstallation === null,
        },
        {
            num: 3,
            name: 'LD / PRS Terms',
            expected: 'ldType: PRS, ldPercentagePerWeek: null, maxLdPercentage: null',
            actual: `ldType: ${fields.ldType?.value}, ldPercentagePerWeek: ${fetchedRecord.ldPercentagePerWeek}, maxLdPercentage: ${fetchedRecord.maxLdPercentage}`,
            match: fields.ldType?.value === 'PRS' && fetchedRecord.ldPercentagePerWeek === null && fetchedRecord.maxLdPercentage === null,
        },
        {
            num: 4,
            name: 'Scope / Installation Inclusive',
            expected: 'deliveryTimeInstallationInclusive: true (SITC Scope)',
            actual: `deliveryTimeInstallationInclusive: ${fetchedRecord.deliveryTimeInstallationInclusive}`,
            match: fetchedRecord.deliveryTimeInstallationInclusive === true,
        },
        {
            num: 5,
            name: 'Technical Experience Age',
            expected: 'techEligibilityAge: 7 years',
            actual: `techEligibilityAge: ${fetchedRecord.techEligibilityAge}`,
            match: fetchedRecord.techEligibilityAge === 7,
        },
        {
            num: 6,
            name: 'Physical Documents Deadline',
            expected: 'physicalDocsRequired: YES, within 7 days of bid due date',
            actual: `physicalDocsRequired: ${fetchedRecord.physicalDocsRequired}, deadline: ${fetchedRecord.physicalDocsDeadline}`,
            match: fetchedRecord.physicalDocsRequired === 'YES' && fetchedRecord.physicalDocsDeadline !== null,
        },
        {
            num: 7,
            name: 'Contacts Differentiation',
            expected: 'Client 1: Allan Tomy, Client 2: Sabu Mathews, Grievance separate',
            actual: `Client 1: ${(fields.clients?.value || [])[0]?.clientName} (${(fields.clients?.value || [])[0]?.clientEmail}), Client 2: ${(fields.clients?.value || [])[1]?.clientName} (${(fields.clients?.value || [])[1]?.clientEmail}), Grievance: ${fields.grievanceContact?.value} (${fields.grievanceEmail?.value})`,
            match: (fields.clients?.value || [])[0]?.clientName === 'Allan Tomy' &&
                   (fields.clients?.value || [])[1]?.clientName === 'Sabu Mathews' &&
                   fields.grievanceEmail?.value === 'sharikumar@gail.co.in' &&
                   fields.grievanceEmail?.value !== (fields.clients?.value || [])[1]?.clientEmail,
        },
        {
            num: 8,
            name: 'Pre-Bid Meeting Details',
            expected: '24-09-2026 11:00:00 via MS Teams',
            actual: `${fetchedRecord.preBidMeeting}`,
            match: typeof fetchedRecord.preBidMeeting === 'string' &&
                   fetchedRecord.preBidMeeting.includes('24-09-2026 11:00:00') &&
                   fetchedRecord.preBidMeeting.includes('MS Teams'),
        },
        {
            num: 9,
            name: 'Turnover Not Applicable',
            expected: 'avgAnnualTurnoverValue: null (NOT 0)',
            actual: `avgAnnualTurnoverType: ${fetchedRecord.avgAnnualTurnoverType}, avgAnnualTurnoverValue: ${fetchedRecord.avgAnnualTurnoverValue}`,
            match: fetchedRecord.avgAnnualTurnoverValue === null,
        },
    ];

    let allPassed = true;
    for (const c of checks) {
        const mark = c.match ? '✅ PASS' : '❌ FAIL';
        if (!c.match) allPassed = false;
        console.log(`[${c.num}] ${c.name}: ${mark}`);
        console.log(`    Expected: ${c.expected}`);
        console.log(`    Actual:   ${c.actual}\n`);
    }

    console.log(`================================================================`);
    console.log(`OVERALL END-TO-END RESULT: ${allPassed ? 'ALL 9 CHECKS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
    console.log(`================================================================`);

    await app.close();
    process.exit(allPassed ? 0 : 1);
}

runE2E().catch((err) => {
    console.error('E2E script error:', err);
    process.exit(1);
});
