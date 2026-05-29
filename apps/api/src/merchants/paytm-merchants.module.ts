import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { PaytmMerchantEntity } from '../entities/paytm-merchant.entity';
import { PaytmMerchantsController } from './paytm-merchants.controller';
import { PaytmMerchantsService } from './paytm-merchants.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaytmMerchantEntity]), AuditModule],
  controllers: [PaytmMerchantsController],
  providers: [PaytmMerchantsService],
  exports: [PaytmMerchantsService],
})
export class PaytmMerchantsModule {}
