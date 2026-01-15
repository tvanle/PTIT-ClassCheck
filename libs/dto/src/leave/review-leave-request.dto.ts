import { IsString, IsOptional, MinLength } from 'class-validator';

export class ApproveLeaveRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  comment?: string;
}

export class RejectLeaveRequestDto {
  @IsString()
  @MinLength(5)
  comment: string;
}
