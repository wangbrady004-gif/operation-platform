import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitPaytmAnchorsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  lastTransactionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  lastCustomerName?: string;
}
