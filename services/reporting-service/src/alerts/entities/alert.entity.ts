import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AlertType {
  ABSENCE_WARNING = 'absence_warning',
  ABSENCE_CRITICAL = 'absence_critical',
  LATE_WARNING = 'late_warning',
  LOW_ATTENDANCE_RATE = 'low_attendance_rate',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id' })
  @Index()
  studentId: string;

  @Column({ name: 'class_id' })
  @Index()
  classId: string;

  @Column({
    type: 'enum',
    enum: AlertType,
  })
  type: AlertType;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  threshold: number;

  @Column({ name: 'current_value', type: 'decimal', precision: 5, scale: 2 })
  currentValue: number;

  @Column({ nullable: true })
  message: string;

  @Column({ name: 'triggered_at', type: 'timestamp' })
  triggeredAt: Date;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    default: AlertStatus.ACTIVE,
  })
  status: AlertStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
