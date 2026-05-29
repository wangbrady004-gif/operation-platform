import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator';
import { AppService } from './app.service';

@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  root() {
    return this.appService.getServiceInfo();
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'operation-platform-api' };
  }
}
