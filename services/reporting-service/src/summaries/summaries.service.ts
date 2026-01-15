import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceSummary } from './entities/attendance-summary.entity';

export interface UpdateSummaryDto {
  studentId: string;
  classId: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  isNewSession?: boolean;
}

export interface InitSummaryDto {
  studentId: string;
  classId: string;
  totalSessions?: number;
}

@Injectable()
export class SummariesService {
  private readonly logger = new Logger(SummariesService.name);

  constructor(
    @InjectRepository(AttendanceSummary)
    private readonly summaryRepository: Repository<AttendanceSummary>,
  ) {}

  async findByClassId(classId: string): Promise<AttendanceSummary[]> {
    return this.summaryRepository.find({
      where: { classId },
      order: { attendanceRate: 'ASC' },
    });
  }

  async findByStudentId(studentId: string, term?: string): Promise<AttendanceSummary[]> {
    // Note: term filtering would require joining with class data from Classroom Service
    // For now, return all summaries for the student
    return this.summaryRepository.find({
      where: { studentId },
      order: { lastUpdated: 'DESC' },
    });
  }

  async findByStudentAndClass(studentId: string, classId: string): Promise<AttendanceSummary | null> {
    return this.summaryRepository.findOne({
      where: { studentId, classId },
    });
  }

  async initializeSummary(dto: InitSummaryDto): Promise<AttendanceSummary> {
    let summary = await this.findByStudentAndClass(dto.studentId, dto.classId);

    if (!summary) {
      summary = this.summaryRepository.create({
        studentId: dto.studentId,
        classId: dto.classId,
        totalSessions: dto.totalSessions || 0,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
        attendanceRate: 0,
      });
      summary = await this.summaryRepository.save(summary);
      this.logger.log(`Initialized summary for student ${dto.studentId} in class ${dto.classId}`);
    }

    return summary;
  }

  async initializeBulkSummaries(classId: string, studentIds: string[]): Promise<void> {
    for (const studentId of studentIds) {
      await this.initializeSummary({ studentId, classId });
    }
    this.logger.log(`Initialized ${studentIds.length} summaries for class ${classId}`);
  }

  async updateSummary(dto: UpdateSummaryDto): Promise<AttendanceSummary> {
    let summary = await this.findByStudentAndClass(dto.studentId, dto.classId);

    if (!summary) {
      summary = await this.initializeSummary({
        studentId: dto.studentId,
        classId: dto.classId,
      });
    }

    // Update counts based on status
    switch (dto.status) {
      case 'present':
        summary.present += 1;
        break;
      case 'late':
        summary.late += 1;
        break;
      case 'absent':
        summary.absent += 1;
        break;
      case 'excused':
        summary.excused += 1;
        break;
    }

    // Increment total sessions if this is a new session
    if (dto.isNewSession) {
      summary.totalSessions += 1;
    }

    // Recalculate attendance rate
    summary.attendanceRate = this.calculateAttendanceRate(summary);

    summary = await this.summaryRepository.save(summary);
    this.logger.log(
      `Updated summary for student ${dto.studentId} in class ${dto.classId}: ` +
      `rate=${summary.attendanceRate}%, present=${summary.present}, late=${summary.late}, ` +
      `absent=${summary.absent}, excused=${summary.excused}`,
    );

    return summary;
  }

  async incrementTotalSessions(classId: string): Promise<void> {
    await this.summaryRepository
      .createQueryBuilder()
      .update(AttendanceSummary)
      .set({
        totalSessions: () => 'total_sessions + 1',
      })
      .where('class_id = :classId', { classId })
      .execute();

    this.logger.log(`Incremented total sessions for class ${classId}`);
  }

  async updateAbsentToExcused(studentId: string, classId: string): Promise<AttendanceSummary | null> {
    const summary = await this.findByStudentAndClass(studentId, classId);

    if (!summary) {
      this.logger.warn(`No summary found for student ${studentId} in class ${classId}`);
      return null;
    }

    // Move one absent to excused
    if (summary.absent > 0) {
      summary.absent -= 1;
      summary.excused += 1;
      summary.attendanceRate = this.calculateAttendanceRate(summary);

      await this.summaryRepository.save(summary);
      this.logger.log(
        `Updated absent to excused for student ${studentId} in class ${classId}`,
      );
    }

    return summary;
  }

  async recalculateSummary(studentId: string, classId: string, data: {
    totalSessions: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
  }): Promise<AttendanceSummary> {
    let summary = await this.findByStudentAndClass(studentId, classId);

    if (!summary) {
      summary = this.summaryRepository.create({
        studentId,
        classId,
      });
    }

    summary.totalSessions = data.totalSessions;
    summary.present = data.present;
    summary.late = data.late;
    summary.absent = data.absent;
    summary.excused = data.excused;
    summary.attendanceRate = this.calculateAttendanceRate(summary);

    return this.summaryRepository.save(summary);
  }

  private calculateAttendanceRate(summary: AttendanceSummary): number {
    const totalAttended = summary.present + summary.late + summary.excused;
    const total = summary.present + summary.late + summary.absent + summary.excused;

    if (total === 0) {
      return 0;
    }

    // Attendance rate = (present + late + excused) / total * 100
    return Number(((totalAttended / total) * 100).toFixed(2));
  }

  async getClassStatistics(classId: string): Promise<{
    totalStudents: number;
    averageAttendanceRate: number;
    totalSessions: number;
    studentsAtRisk: number;
  }> {
    const summaries = await this.findByClassId(classId);

    if (summaries.length === 0) {
      return {
        totalStudents: 0,
        averageAttendanceRate: 0,
        totalSessions: 0,
        studentsAtRisk: 0,
      };
    }

    const totalStudents = summaries.length;
    const averageAttendanceRate = summaries.reduce((sum, s) => sum + Number(s.attendanceRate), 0) / totalStudents;
    const totalSessions = summaries[0]?.totalSessions || 0;
    const studentsAtRisk = summaries.filter(s => Number(s.attendanceRate) < 80).length;

    return {
      totalStudents,
      averageAttendanceRate: Number(averageAttendanceRate.toFixed(2)),
      totalSessions,
      studentsAtRisk,
    };
  }
}
