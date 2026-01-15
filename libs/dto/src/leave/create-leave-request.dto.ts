import { IsUUID, IsString, IsArray, IsOptional, IsUrl, MinLength } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsUUID()
  classId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  sessionIds: string[];

  @IsString()
  @MinLength(10)
  reason: string;

  @IsOptional()
  @IsUrl()
  attachmentUrl?: string;
}

export class LeaveRequestResponseDto {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  sessions: {
    id: string;
    date: string;
    sessionNo: number;
  }[];
  reason: string;
  attachmentUrl?: string;
  status: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewerComment?: string;
  createdAt: Date;
  reviewedAt?: Date;
}
