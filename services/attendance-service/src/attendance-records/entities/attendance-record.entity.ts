import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { AttendanceSession } from '../../attendance-sessions/entities/attendance-session.entity';

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

@Entity('attendance_records')
@Unique(['attendanceSessionId', 'studentId'])
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'attendance_session_id' })
  attendanceSessionId: string;

  @ManyToOne(() => AttendanceSession, (session) => session.records)
  @JoinColumn({ name: 'attendance_session_id' })
  attendanceSession: AttendanceSession;

  @Column({ name: 'session_id' })
  sessionId: string; // Classroom session ID

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.ABSENT,
  })
  status: AttendanceStatus;

  @Column({ name: 'checkin_time', type: 'timestamp', nullable: true })
  checkinTime?: Date;

  @Column({
    type: 'enum',
    enum: CheckinSource,
    default: CheckinSource.SYSTEM,
  })
  source: CheckinSource;

  @Column({ nullable: true })
  note?: string;

  // Anti-cheat data
  @Column({ name: 'device_id', nullable: true })
  deviceId?: string;

  @Column({ name: 'gps_latitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  gpsLatitude?: number;

  @Column({ name: 'gps_longitude', type: 'decimal', precision: 10, scale: 7, nullable: true })
  gpsLongitude?: number;

  @Column({ name: 'distance_to_class', type: 'decimal', precision: 10, scale: 2, nullable: true })
  distanceToClass?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
