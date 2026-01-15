import { IsUUID, IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';

export enum AttendanceMethod {
  QR = 'QR',
  MANUAL = 'MANUAL',
  GPS = 'GPS',
}

export class OpenAttendanceSessionDto {
  @IsUUID()
  sessionId: string;

  @IsEnum(AttendanceMethod)
  method: AttendanceMethod;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  durationMinutes?: number; // Default 15 minutes

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  lateThresholdMinutes?: number; // After this, mark as late

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(60)
  qrRotationSeconds?: number; // QR refresh interval, default 15
}

export class AttendanceSessionResponseDto {
  id: string;
  sessionId: string;
  method: AttendanceMethod;
  qrToken?: string;
  openTime: Date;
  closeTime: Date;
  status: string;
  checkedInCount: number;
  totalStudents: number;
}
