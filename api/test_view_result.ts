import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { TenderInfoSheetsService } from './src/modules/tendering/info-sheets/info-sheets.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const service = app.get(TenderInfoSheetsService);
  
  try {
    const status = await service.getAutoExtractStatus('extract-tender-3629');
    console.log('STATUS:', status.status);
    console.log('MISSING FIELDS (' + (status.missing_fields?.length || 0) + '):', status.missing_fields);
    console.log('\nFIELDS:');
    for (const [k, v] of Object.entries(status.fields || {})) {
      console.log(`  ${k}: ${JSON.stringify(v)}`);
    }
  } catch (e) {
    console.error('Error:', (e as Error).message);
  }
  
  await app.close();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
