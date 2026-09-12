import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { TenderInfoSheetsService } from './src/modules/tendering/info-sheets/info-sheets.service';
import { ClaudeUsageService } from './src/modules/master/health/claude-usage.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const service = app.get(TenderInfoSheetsService);
  const claudeService = app.get(ClaudeUsageService);
  
  console.log('Testing autoExtractFromPdf for tender 3629...');
  const res = await service.autoExtractFromPdf(3629, 100);
  console.log('Enqueue result:', JSON.stringify(res));
  
  for (let i = 0; i < 35; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const status = await service.getAutoExtractStatus(res.jobId);
    console.log(`Poll attempt ${i + 1}: ${status.status}`);
    if (status.status === 'completed') {
      console.log('Fields extracted count:', Object.keys(status.fields || {}).length);
      break;
    }
    if (status.status === 'failed') {
      console.error('Job failed:', status.error);
      break;
    }
  }

  const telemetry = await claudeService.getClaudeTelemetry();
  console.log('Total tokens in DB:', telemetry.summary.totalTokens);
  console.log('Total cost USD in DB:', telemetry.summary.estimatedCostUsd);
  console.log('Total cost INR in DB:', telemetry.summary.estimatedCostInr);
  
  await app.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
