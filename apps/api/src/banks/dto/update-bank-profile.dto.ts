import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateBankProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(128)
  profileKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  mobileNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(128)
  bankId?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  api?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(128)
  company?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  lastUtrChatId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  portalListingMid?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  merchant?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(256)
  txnPass?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  executableRelativePath?: string | null;
}
