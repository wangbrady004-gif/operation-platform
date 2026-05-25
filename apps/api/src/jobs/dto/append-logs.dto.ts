import { IsArray, IsString, ArrayMaxSize } from 'class-validator';

export class AppendLogsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  lines!: string[];
}
