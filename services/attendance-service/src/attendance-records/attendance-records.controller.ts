import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { AttendanceRecordsService } from './attendance-records.service';
import { AttendanceStatus } from './entities/attendance-record.entity';

class CheckinDto {
  qrToken?: string;
  deviceId?: string;
  latitude?: number;
  longitude?: number;
  wifiBssid?: string;
}

class ManualCheckinDto {
  studentId: string;
  note?: string;
}

class UpdateStatusDto {
  status: AttendanceStatus;
  note?: string;
}

@Controller('attendance')
export class AttendanceRecordsController {
  constructor(
    private readonly attendanceRecordsService: AttendanceRecordsService,
  ) {}

  @Post('sessions/:sessionId/checkin')
  async checkin(
    @Param('sessionId') sessionId: string,
    @Body() dto: CheckinDto,
    @Request() req: any,
  ) {
    // In real app, get studentId from JWT token
    const studentId = req.user?.id;
    return this.attendanceRecordsService.checkin(sessionId, studentId, dto);
  }

  @Post('sessions/:sessionId/manual-checkin')
  async manualCheckin(
    @Param('sessionId') sessionId: string,
    @Body() dto: ManualCheckinDto,
    @Request() req: any,
  ) {
    const teacherId = req.user?.id || 'system';
    return this.attendanceRecordsService.manualCheckin(
      sessionId,
      dto.studentId,
      teacherId,
      dto.note,
    );
  }

  @Patch('records/:recordId')
  async updateStatus(
    @Param('recordId') recordId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.attendanceRecordsService.updateStatus(
      recordId,
      dto.status,
      dto.note,
    );
  }

  @Get('sessions/:sessionId/records')
  async getRecords(@Param('sessionId') sessionId: string) {
    return this.attendanceRecordsService.findBySession(sessionId);
  }

  @Get('students/:studentId/classes/:classId/records')
  async getStudentRecords(
    @Param('studentId') studentId: string,
    @Param('classId') classId: string,
  ) {
    return this.attendanceRecordsService.findByStudentAndClass(studentId, classId);
  }

  // Microservice message patterns
  @MessagePattern({ cmd: 'get_attendance_records' })
  async getAttendanceRecords(@Payload() data: { attendanceSessionId: string }) {
    return this.attendanceRecordsService.findBySession(data.attendanceSessionId);
  }

  @MessagePattern({ cmd: 'get_student_attendance' })
  async getStudentAttendance(
    @Payload() data: { studentId: string; classId: string },
  ) {
    return this.attendanceRecordsService.findByStudentAndClass(
      data.studentId,
      data.classId,
    );
  }

  // Handle leave request approved event
  @EventPattern('leave_request_approved')
  async handleLeaveApproved(
    @Payload()
    data: {
      leaveRequestId: string;
      studentId: string;
      sessionIds: string[];
    },
  ) {
    await this.attendanceRecordsService.markExcused(
      data.sessionIds,
      data.studentId,
      data.leaveRequestId,
    );
  }
}
