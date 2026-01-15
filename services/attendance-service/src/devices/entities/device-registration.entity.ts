import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DeviceStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
}

@Entity('device_registrations')
export class DeviceRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ name: 'device_id', unique: true })
  deviceId: string;

  @Column({ name: 'device_name', nullable: true })
  deviceName?: string;

  @Column({ nullable: true })
  os?: string;

  @Column({ name: 'os_version', nullable: true })
  osVersion?: string;

  @Column({
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.ACTIVE,
  })
  status: DeviceStatus;

  @CreateDateColumn({ name: 'registered_at' })
  registeredAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
