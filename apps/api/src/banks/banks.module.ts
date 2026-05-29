import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { BankProfileEntity } from '../entities/bank-profile.entity';
import { BanksController } from './banks.controller';
import { BanksService } from './banks.service';

@Module({
  imports: [TypeOrmModule.forFeature([BankProfileEntity]), AuditModule],
  controllers: [BanksController],
  providers: [BanksService],
  exports: [BanksService],
})
export class BanksModule {}
