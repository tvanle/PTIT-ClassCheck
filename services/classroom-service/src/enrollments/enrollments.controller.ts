import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EnrollmentsService } from './enrollments.service';

class EnrollStudentDto {
  studentId: string;
}

class BulkEnrollDto {
  studentIds: string[];
}

@Controller('classes/:classId/enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  async enroll(
    @Param('classId') classId: string,
    @Body() dto: EnrollStudentDto,
  ) {
    return this.enrollmentsService.enroll(classId, dto.studentId);
  }

  @Post('bulk')
  async enrollBulk(
    @Param('classId') classId: string,
    @Body() dto: BulkEnrollDto,
  ) {
    return this.enrollmentsService.enrollBulk(classId, dto.studentIds);
  }

  @Get()
  async findByClass(@Param('classId') classId: string) {
    return this.enrollmentsService.findByClass(classId);
  }

  @Delete(':studentId')
  async drop(
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.enrollmentsService.drop(classId, studentId);
  }

  // Microservice message patterns
  @MessagePattern({ cmd: 'get_enrollments_by_class' })
  async getEnrollmentsByClass(@Payload() data: { classId: string }) {
    return this.enrollmentsService.findByClass(data.classId);
  }

  @MessagePattern({ cmd: 'get_enrollments_by_student' })
  async getEnrollmentsByStudent(@Payload() data: { studentId: string }) {
    return this.enrollmentsService.findByStudent(data.studentId);
  }

  @MessagePattern({ cmd: 'is_enrolled' })
  async isEnrolled(@Payload() data: { classId: string; studentId: string }) {
    return this.enrollmentsService.isEnrolled(data.classId, data.studentId);
  }

  @MessagePattern({ cmd: 'get_student_ids_in_class' })
  async getStudentIdsInClass(@Payload() data: { classId: string }) {
    return this.enrollmentsService.getStudentIdsInClass(data.classId);
  }
}
