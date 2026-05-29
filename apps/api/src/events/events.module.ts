import { Global, Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

/**
 * @Global — EventsService is a single shared Subject injected into
 * BotTasksService and OpsLaunchersService without those modules needing
 * to re-import EventsModule.
 */
@Global()
@Module({
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
