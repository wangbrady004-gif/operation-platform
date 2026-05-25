import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpsLauncherEntity } from './ops-launcher.entity';
import { OpsLaunchersController } from './ops-launchers.controller';
import { OpsLaunchersService } from './ops-launchers.service';

@Module({
  imports: [TypeOrmModule.forFeature([OpsLauncherEntity])],
  controllers: [OpsLaunchersController],
  providers: [OpsLaunchersService],
  exports: [OpsLaunchersService],
})
export class OpsLaunchersModule {}
