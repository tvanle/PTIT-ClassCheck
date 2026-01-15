import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LeaveRequest } from './leave-request.entity';

@Entity('leave_session_map')
export class LeaveSessionMap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'leave_request_id' })
  leaveRequestId: string;

  @ManyToOne(() => LeaveRequest, (request) => request.sessionMaps)
  @JoinColumn({ name: 'leave_request_id' })
  leaveRequest: LeaveRequest;

  @Column({ name: 'session_id' })
  sessionId: string;
}
