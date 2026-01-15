import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Class } from '../../classes/entities/class.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'class_id' })
  classId: string;

  @ManyToOne(() => Class, (cls) => cls.sessions)
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'start_time' })
  startTime: string; // HH:mm

  @Column({ name: 'end_time' })
  endTime: string; // HH:mm

  @Column({ nullable: true })
  room?: string;

  @Column({ name: 'session_no' })
  sessionNo: number;

  @Column({ default: false })
  cancelled: boolean;

  @Column({ name: 'cancel_reason', nullable: true })
  cancelReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
