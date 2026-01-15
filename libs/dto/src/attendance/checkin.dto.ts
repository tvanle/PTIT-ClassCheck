import { IsUUID, IsString, IsOptional, IsNumber } from 'class-validator';

export class CheckinDto {
  @IsOptional()
  @IsUUID()
  studentId?: string; // For manual checkin by teacher

  @IsOptional()
  @IsString()
  qrToken?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  wifiBssid?: string;
}

export class ManualCheckinDto {
  @IsUUID()
  attendanceSessionId: string;

  @IsUUID()
  studentId: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkManualCheckinDto {
  @IsUUID()
  attendanceSessionId: string;

  studentIds: string[];
}
