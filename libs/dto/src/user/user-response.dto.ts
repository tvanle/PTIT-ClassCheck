import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  role: string;

  @Expose()
  status: string;

  @Expose()
  fullName: string;

  @Expose()
  studentCode?: string;

  @Expose()
  teacherCode?: string;

  @Expose()
  phone?: string;

  @Expose()
  createdAt: Date;
}
