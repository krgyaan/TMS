import { Module, Global } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TimersService } from './timers.service';
import { TimersController } from './timers.controller';

@Global()
@Module({
    imports: [DatabaseModule],
    providers: [TimersService],
    controllers: [TimersController],
    exports: [TimersService],
})
export class TimersModule { }
