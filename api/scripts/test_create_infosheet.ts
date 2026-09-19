import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TenderInfoSheetsService } from '../src/modules/tendering/info-sheets/info-sheets.service';
import { TenderInfoSheetPayloadSchema } from '../src/modules/tendering/info-sheets/dto/info-sheet.dto';

async function testSubmit() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const infoSheetsService = app.get(TenderInfoSheetsService);

  const testPayload = {
    tenderValue: 5000000,
    oemExperience: 'NO',
    teRecommendation: 'YES',
    processingFeeRequired: 'NO',
    tenderFeeRequired: 'NO',
    emdRequired: 'NO',
    reverseAuctionApplicable: 'NO',
    deliveryTimeSupply: 30,
    deliveryTimeInstallationInclusive: true,
    pbgRequired: 'NO',
    sdRequired: 'NO',
    ldRequired: 'NO',
    physicalDocsRequired: 'NO',
    workValueType: 'WORKS_VALUES',
    orderValue1: 4000000,
    clientDetailsPresent: 'NO',
    customerInContact: 'NO',
    courierDetailsPresent: 'NO',
    clients: [],
  };

  try {
    console.log('Validating schema...');
    const parsed = TenderInfoSheetPayloadSchema.parse(testPayload);
    console.log('Schema valid! Testing create for tender 3629...');

    // ChangedBy = 1
    const result = await infoSheetsService.create(3629, parsed, 1);
    console.log('Submission SUCCESS! Result id:', result.id);
  } catch (err: any) {
    console.error('Submission FAILED:', err);
  } finally {
    await app.close();
  }
}

testSubmit();
