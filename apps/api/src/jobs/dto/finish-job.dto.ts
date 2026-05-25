import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class FinishJobDto {
  @IsInt()
  exitCode!: number;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  error?: string;

  /** Worker sets true when the subprocess was killed after operator stop. */
  @IsOptional()
  @IsBoolean()
  cancelled?: boolean;
}
