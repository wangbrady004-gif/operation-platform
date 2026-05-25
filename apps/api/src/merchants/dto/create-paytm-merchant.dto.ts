import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Turn "" / null into undefined so @IsOptional() skips other validators cleanly. */
const emptyStrToUndefined = () =>
  Transform(({ value }: { value: unknown }) =>
    value === '' || value === null || value === undefined ? undefined : value,
  );

export class CreatePaytmMerchantDto {
  @IsString()
  @MinLength(4)
  @MaxLength(128)
  profileKey!: string;

  /** May be omitted or empty during PayTM profile creation (fill in later via edit). */
  @emptyStrToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  mobileNumber?: string;

  @emptyStrToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  password?: string;

  @IsString()
  @MinLength(4)
  @MaxLength(128)
  bankId!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(512)
  api!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(128)
  company!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  lastUtrChatId!: string;

  /**
   * Optional — portal listing MID for operators (can be filled in later).
   */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  portalListingMid?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  merchant!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(256)
  txnPass!: string;

  /**
   * Optional — vendored thin bot path (jobs will still require one when running PayTM with merchant binding).
   */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  executableRelativePath?: string;
}
