import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

@Entity('attendance_summaries')
@Unique(['studentId', 'classId'])
export class AttendanceSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id' })
  @Index()
  studentId: string;

  @Column({ name: 'class_id' })
  @Index()
  classId: string;

  @Column({ name: 'total_sessions', default: 0 })
  totalSessions: number;

  @Column({ default: 0 })
  present: number;

  @Column({ default: 0 })
  late: number;

  @Column({ default: 0 })
  absent: number;

  @Column({ default: 0 })
  excused: number;

  @Column({ name: 'attendance_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  attendanceRate: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'last_updated' })
  lastUpdated: Date;
}
