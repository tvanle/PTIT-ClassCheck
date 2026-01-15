import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AttendanceRecord } from '../../attendance-records/entities/attendance-record.entity';

export enum AttendanceMethod {
  QR = 'QR',
  MANUAL = 'MANUAL',
  GPS = 'GPS',
}

export enum AttendanceSessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

@Entity('attendance_sessions')
export class AttendanceSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id' })
  sessionId: string; // Reference to classroom session

  @Column({ name: 'class_id' })
  classId: string;

  @Column({ name: 'opened_by' })
  openedBy: string; // Teacher ID

  @Column({
    type: 'enum',
    enum: AttendanceMethod,
    default: AttendanceMethod.QR,
  })
  method: AttendanceMethod;

  @Column({ name: 'qr_token', nullable: true })
  qrToken?: string;

  @Column({ name: 'qr_rotation_seconds', default: 15 })
  qrRotationSeconds: number;

  @Column({ name: 'open_time', type: 'timestamp' })
  openTime: Date;

  @Column({ name: 'close_time', type: 'timestamp' })
  closeTime: Date;

  @Column({ name: 'late_threshold_minutes', default: 10 })
  lateThresholdMinutes: number;

  @Column({
    type: 'enum',
    enum: AttendanceSessionStatus,
    default: AttendanceSessionStatus.OPEN,
  })
  status: AttendanceSessionStatus;

  @OneToMany(() => AttendanceRecord, (record) => record.attendanceSession)
  records: AttendanceRecord[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
