import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { Session } from '../../sessions/entities/session.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';

@Entity('classes')
export class Class {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'course_id' })
  courseId: string;

  @ManyToOne(() => Course, (course) => course.classes)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column()
  term: string; // e.g., "2024-1"

  @Column({ name: 'group_name' })
  group: string; // e.g., "01", "02"

  @Column({ name: 'teacher_id' })
  teacherId: string;

  @Column({ nullable: true })
  room?: string;

  @Column({ nullable: true })
  schedule?: string; // e.g., "Thứ 2 tiết 1-3"

  @OneToMany(() => Session, (session) => session.class)
  sessions: Session[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.class)
  enrollments: Enrollment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
