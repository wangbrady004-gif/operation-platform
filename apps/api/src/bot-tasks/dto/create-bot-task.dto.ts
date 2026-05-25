import { IsString, MinLength } from 'class-validator';

export class CreateBotTaskDto {
  @IsString()
  @MinLength(1)
  merchantId: string;

  @IsString()
  @MinLength(1)
  profileKey: string;

  @IsString()
  @MinLength(1)
  module: string;

  @IsString()
  @MinLength(1)
  settingsKey: string;

  @IsString()
  @MinLength(1)
  loginType: string;
}
