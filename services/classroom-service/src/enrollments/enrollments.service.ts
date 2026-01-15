import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity';
import { ClassesService } from '../classes/classes.service';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentsRepository: Repository<Enrollment>,
    private classesService: ClassesService,
    @Inject('REPORTING_SERVICE') private reportingClient: ClientProxy,
  ) {}

  async enroll(classId: string, studentId: string): Promise<Enrollment> {
    await this.classesService.findById(classId);

    const existing = await this.enrollmentsRepository.findOne({
      where: { classId, studentId },
    });

    if (existing) {
      if (existing.status === EnrollmentStatus.ACTIVE) {
        throw new ConflictException('Student already enrolled in this class');
      }
      // Re-activate if previously dropped
      existing.status = EnrollmentStatus.ACTIVE;
      return this.enrollmentsRepository.save(existing);
    }

    const enrollment = this.enrollmentsRepository.create({
      classId,
      studentId,
      status: EnrollmentStatus.ACTIVE,
    });

    return this.enrollmentsRepository.save(enrollment);
  }

  async enrollBulk(classId: string, studentIds: string[]): Promise<Enrollment[]> {
    await this.classesService.findById(classId);

    const enrollments: Enrollment[] = [];

    for (const studentId of studentIds) {
      try {
        const enrollment = await this.enroll(classId, studentId);
        enrollments.push(enrollment);
      } catch (e) {
        // Skip duplicates
      }
    }

    // Emit event for reporting service
    const cls = await this.classesService.findById(classId);
    this.reportingClient.emit('enrollment_imported', {
      classId,
      className: `${cls.course.code} - ${cls.group}`,
      totalStudents: enrollments.length,
      studentIds: enrollments.map((e) => e.studentId),
      importedAt: new Date(),
    });

    return enrollments;
  }

  async findByClass(classId: string): Promise<Enrollment[]> {
    return this.enrollmentsRepository.find({
      where: { classId, status: EnrollmentStatus.ACTIVE },
    });
  }

  async findByStudent(studentId: string): Promise<Enrollment[]> {
    return this.enrollmentsRepository.find({
      where: { studentId, status: EnrollmentStatus.ACTIVE },
      relations: ['class', 'class.course'],
    });
  }

  async isEnrolled(classId: string, studentId: string): Promise<boolean> {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: { classId, studentId, status: EnrollmentStatus.ACTIVE },
    });
    return !!enrollment;
  }

  async drop(classId: string, studentId: string): Promise<Enrollment> {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: { classId, studentId },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    enrollment.status = EnrollmentStatus.DROPPED;
    return this.enrollmentsRepository.save(enrollment);
  }

  async getStudentIdsInClass(classId: string): Promise<string[]> {
    const enrollments = await this.findByClass(classId);
    return enrollments.map((e) => e.studentId);
  }
}
