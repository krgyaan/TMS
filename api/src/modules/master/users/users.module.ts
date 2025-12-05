import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { UsersController } from '@/modules/master/users/users.controller';
import { UsersService } from '@/modules/master/users/users.service';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
