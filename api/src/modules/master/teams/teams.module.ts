import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { TeamsController } from '@/modules/master/teams/teams.controller';
import { TeamsService } from '@/modules/master/teams/teams.service';

@Module({
    imports: [DatabaseModule],
    controllers: [TeamsController],
    providers: [TeamsService],
    exports: [TeamsService],
})
export class TeamsModule { }
