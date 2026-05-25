import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { InternalTokenGuard } from '../jobs/internal-token.guard';
import { PaytmMerchantsService } from './paytm-merchants.service';

@Public()
@Controller('internal/paytm-merchants')
@UseGuards(InternalTokenGuard)
export class InternalPaytmMerchantsController {
  constructor(private readonly merchants: PaytmMerchantsService) {}

  @Get(':id/snapshot')
  async snapshot(@Param('id', ParseUUIDPipe) id: string) {
    return this.merchants.snapshotForWorker(id);
  }
}
