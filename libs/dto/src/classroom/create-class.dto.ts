import { IsString, IsUUID, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  credits?: number;
}

export class CreateClassDto {
  @IsUUID()
  courseId: string;

  @IsString()
  term: string; // e.g., "2024-1"

  @IsString()
  group: string; // e.g., "01"

  @IsUUID()
  teacherId: string;

  @IsOptional()
  @IsString()
  room?: string;
}
