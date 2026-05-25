import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotTaskEntity } from './bot-task.entity';
import { BotTasksController } from './bot-tasks.controller';
import { BotTasksService } from './bot-tasks.service';
import { PaytmMerchantsModule } from '../merchants/paytm-merchants.module';

@Module({
  imports: [TypeOrmModule.forFeature([BotTaskEntity]), PaytmMerchantsModule],
  controllers: [BotTasksController],
  providers: [BotTasksService],
})
export class BotTasksModule {}
