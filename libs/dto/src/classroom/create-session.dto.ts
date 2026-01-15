import { IsUUID, IsDateString, IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateSessionDto {
  @IsUUID()
  classId: string;

  @IsDateString()
  date: string;

  @IsString()
  startTime: string; // HH:mm format

  @IsString()
  endTime: string; // HH:mm format

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  sessionNo?: number;
}

export class BulkCreateSessionDto {
  @IsUUID()
  classId: string;

  sessions: CreateSessionDto[];
}
