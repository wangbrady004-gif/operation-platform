import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotTaskEntity } from './bot-task.entity';
import { BotTasksController } from './bot-tasks.controller';
import { BotTasksService } from './bot-tasks.service';
import { BanksModule } from '../banks/banks.module';
import { OpsLaunchersModule } from '../ops-launchers/ops-launchers.module';

@Module({
  imports: [TypeOrmModule.forFeature([BotTaskEntity]), BanksModule, OpsLaunchersModule],
  controllers: [BotTasksController],
  providers: [BotTasksService],
})
export class BotTasksModule {}
