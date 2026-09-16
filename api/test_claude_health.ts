import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ClaudeUsageService } from './src/modules/master/health/claude-usage.service';
import { AdminUsageService } from './src/modules/master/health/admin-usage.service';
import { HealthService } from './src/modules/master/health/health.service';

async function testHealth() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const healthService = app.get(HealthService);
    const claudeUsageService = app.get(ClaudeUsageService);
    const adminUsageService = app.get(AdminUsageService);

    console.log('Testing getHealth()...');
    const health = await healthService.getHealth();
    console.log('getHealth status:', health.status);
    console.log('Claude check in health:', JSON.stringify(health.data.claude));

    console.log('\nTesting getClaudeTelemetry()...');
    const telemetry = await claudeUsageService.getClaudeTelemetry();
    console.log('telemetry status:', telemetry.status);
    console.log('telemetry summary:', JSON.stringify(telemetry.summary));
    console.log('userBreakdown count:', telemetry.userBreakdown.length);
    console.log('userBreakdown:', JSON.stringify(telemetry.userBreakdown));
    console.log('recentCalls count:', telemetry.recentCalls.length);

    console.log('\nTesting getReconciliationReport()...');
    const recon = await adminUsageService.getReconciliationReport();
    console.log('recon status:', recon.status);
    console.log('recon message:', recon.message);

    console.log('\nTesting getTendersBreakdown()...');
    const tenders = await claudeUsageService.getTendersBreakdown('cost');
    console.log('tenders count:', tenders.length);
    console.log('tenders breakdown:', JSON.stringify(tenders));

    console.log('\nALL TESTS PASSED!');
  } catch (err) {
    console.error('ERROR in testHealth:', err);
  } finally {
    await app.close();
    process.exit(0);
  }
}

testHealth().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
