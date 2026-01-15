import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { AttendanceMethod } from './entities/attendance-session.entity';
import { QrService } from '../qr/qr.service';
import { ConfigService } from '@nestjs/config';

class OpenSessionDto {
  sessionId: string;
  method: AttendanceMethod;
  durationMinutes?: number;
  lateThresholdMinutes?: number;
  qrRotationSeconds?: number;
}

@Controller('attendance/sessions')
export class AttendanceSessionsController {
  constructor(
    private readonly attendanceSessionsService: AttendanceSessionsService,
    private readonly qrService: QrService,
    private readonly configService: ConfigService,
  ) {}

  @Post('open')
  async openSession(@Body() dto: OpenSessionDto, @Request() req: any) {
    // In real app, get teacherId from JWT token
    const teacherId = req.user?.id || 'system';
    return this.attendanceSessionsService.openSession(dto, teacherId);
  }

  @Patch(':id/close')
  async closeSession(@Param('id') id: string) {
    return this.attendanceSessionsService.closeSession(id);
  }

  @Get(':id')
  async getSession(@Param('id') id: string) {
    return this.attendanceSessionsService.findById(id);
  }

  @Get(':id/qr')
  async getQrCode(@Param('id') id: string) {
    const token = await this.attendanceSessionsService.getCurrentQrToken(id);

    if (!token) {
      return { error: 'Session not open or no QR available' };
    }

    const baseUrl = this.configService.get<string>('APP_URL', 'http://localhost:3003');
    const qrCode = await this.qrService.generateQrCode(token, baseUrl);

    return {
      token,
      qrCode,
      expiresIn: 15, // seconds
    };
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.attendanceSessionsService.getSessionStats(id);
  }

  @Get('class/:classId/open')
  async getOpenSession(@Param('classId') classId: string) {
    return this.attendanceSessionsService.findOpenByClassId(classId);
  }

  // Microservice patterns
  @MessagePattern({ cmd: 'get_attendance_session' })
  async getAttendanceSession(@Payload() data: { attendanceSessionId: string }) {
    return this.attendanceSessionsService.findById(data.attendanceSessionId);
  }

  @MessagePattern({ cmd: 'get_attendance_session_by_session_id' })
  async getBySessionId(@Payload() data: { sessionId: string }) {
    return this.attendanceSessionsService.findBySessionId(data.sessionId);
  }

  // Handle leave approved event to update attendance records
  @EventPattern('leave_request_approved')
  async handleLeaveApproved(data: {
    leaveRequestId: string;
    studentId: string;
    sessionIds: string[];
  }) {
    console.log('Leave approved, updating attendance records:', data);
    // This will be handled by AttendanceRecordsService
  }
}
