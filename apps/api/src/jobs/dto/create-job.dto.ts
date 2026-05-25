import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PaytmJobOptionsDto {
  @IsIn(['txn', 'name'])
  mode!: 'txn' | 'name';

  @IsString()
  @MinLength(2)
  @MaxLength(128)
  profile!: string;

  /** When true, last ids are submitted later on the job page; omit at enqueue. */
  @IsOptional()
  @IsBoolean()
  deferAnchors?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  lastTransactionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  lastCustomerName?: string;

  /** When set, worker downloads encrypted snapshot via internal API. */
  @IsOptional()
  @IsUUID('4')
  merchantId?: string;

  /**
   * Optional override — must match the merchant's stored thin path when merchantId is set.
   */
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  thinScriptRelativePath?: string;
}

export class GoogleJobOptionsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  profile!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  lastUtr!: string;

  @IsUUID('4')
  merchantId!: string;
}

export class CreateJobDto {
  @IsString()
  @MinLength(4)
  @MaxLength(512)
  /** e.g. tp_127_executabes/TP_PAYTM_*.py (no body), or tp_127_executabes/run_paytm_bot.py when `paytm` is set */
  scriptRelativePath!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaytmJobOptionsDto)
  paytm?: PaytmJobOptionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => GoogleJobOptionsDto)
  google?: GoogleJobOptionsDto;
}
