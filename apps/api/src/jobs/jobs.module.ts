import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { JobLogLineEntity } from '../entities/job-log-line.entity';
import { JobEntity } from '../entities/job.entity';
import { PaytmMerchantsModule } from '../merchants/paytm-merchants.module';
import { InternalJobsController } from './internal-jobs.controller';
import { JobLogStreamService } from './job-log-stream.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobEntity, JobLogLineEntity]),
    AuditModule,
    PaytmMerchantsModule,
  ],
  controllers: [JobsController, InternalJobsController],
  providers: [JobsService, JobLogStreamService],
  exports: [JobsService],
})
export class JobsModule {}
