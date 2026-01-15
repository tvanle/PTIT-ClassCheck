import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';

export enum AttendanceStatus {
  PRESENT = 'present',
  LATE = 'late',
  ABSENT = 'absent',
  EXCUSED = 'excused',
}

export enum CheckinSource {
  QR = 'qr',
  MANUAL = 'manual',
  GPS = 'gps',
  SYSTEM = 'system',
}

export class UpdateAttendanceRecordDto {
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AttendanceRecordResponseDto {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  status: AttendanceStatus;
  checkinTime?: Date;
  source: CheckinSource;
  note?: string;
}

export class SessionAttendanceListDto {
  sessionId: string;
  className: string;
  sessionDate: string;
  totalStudents: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  records: AttendanceRecordResponseDto[];
}
