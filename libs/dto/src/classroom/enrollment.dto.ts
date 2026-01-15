import { IsUUID, IsArray, IsString, IsEnum, IsOptional } from 'class-validator';

export enum EnrollmentStatus {
  ACTIVE = 'active',
  DROPPED = 'dropped',
  COMPLETED = 'completed',
}

export class EnrollStudentDto {
  @IsUUID()
  classId: string;

  @IsUUID()
  studentId: string;
}

export class BulkEnrollDto {
  @IsUUID()
  classId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  studentIds: string[];
}

export class ImportEnrollmentDto {
  @IsUUID()
  classId: string;

  @IsArray()
  students: {
    studentCode: string;
    fullName: string;
    email: string;
  }[];
}

export class EnrollmentResponseDto {
  id: string;
  classId: string;
  studentId: string;
  status: EnrollmentStatus;
  createdAt: Date;
}
