import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ClaudeUsageService } from './src/modules/master/health/claude-usage.service';
import { DRIZZLE } from './src/db/database.module';
import { sql } from 'drizzle-orm';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const db = app.get(DRIZZLE);
  
  const res = await db.execute(sql`
    SELECT * FROM claude_token_usage ORDER BY id DESC LIMIT 10;
  `);
  
  console.log('Recent 10 records in claude_token_usage:');
  console.log(JSON.stringify(res.rows, null, 2));
  
  await app.close();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
