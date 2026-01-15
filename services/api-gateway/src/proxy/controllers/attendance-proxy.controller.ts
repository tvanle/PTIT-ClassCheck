import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProxyService, ServiceName } from '../proxy.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceProxyController {
  constructor(private proxyService: ProxyService) {}

  // Open attendance session
  @Post('sessions/open')
  async openSession(@Body() body: any, @Request() req: any) {
    return this.proxyService.post(ServiceName.ATTENDANCE, '/attendance/sessions/open', body, {
      Authorization: req.headers.authorization,
    });
  }

  // Close attendance session
  @Patch('sessions/:id/close')
  async closeSession(@Param('id') id: string, @Request() req: any) {
    return this.proxyService.patch(ServiceName.ATTENDANCE, `/attendance/sessions/${id}/close`, {}, {
      Authorization: req.headers.authorization,
    });
  }

  // Get attendance session
  @Get('sessions/:id')
  async getSession(@Param('id') id: string, @Request() req: any) {
    return this.proxyService.get(ServiceName.ATTENDANCE, `/attendance/sessions/${id}`, {
      Authorization: req.headers.authorization,
    });
  }

  // Get QR code for session
  @Get('sessions/:id/qr')
  async getQrCode(@Param('id') id: string, @Request() req: any) {
    return this.proxyService.get(ServiceName.ATTENDANCE, `/attendance/sessions/${id}/qr`, {
      Authorization: req.headers.authorization,
    });
  }

  // Get session stats
  @Get('sessions/:id/stats')
  async getStats(@Param('id') id: string, @Request() req: any) {
    return this.proxyService.get(ServiceName.ATTENDANCE, `/attendance/sessions/${id}/stats`, {
      Authorization: req.headers.authorization,
    });
  }

  // Check in (student)
  @Post('sessions/:sessionId/checkin')
  async checkin(
    @Param('sessionId') sessionId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.proxyService.post(
      ServiceName.ATTENDANCE,
      `/attendance/sessions/${sessionId}/checkin`,
      body,
      { Authorization: req.headers.authorization },
    );
  }

  // Manual checkin (teacher)
  @Post('sessions/:sessionId/manual-checkin')
  async manualCheckin(
    @Param('sessionId') sessionId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.proxyService.post(
      ServiceName.ATTENDANCE,
      `/attendance/sessions/${sessionId}/manual-checkin`,
      body,
      { Authorization: req.headers.authorization },
    );
  }

  // Get attendance records for session
  @Get('sessions/:sessionId/records')
  async getRecords(@Param('sessionId') sessionId: string, @Request() req: any) {
    return this.proxyService.get(
      ServiceName.ATTENDANCE,
      `/attendance/sessions/${sessionId}/records`,
      { Authorization: req.headers.authorization },
    );
  }

  // Update attendance record
  @Patch('records/:recordId')
  async updateRecord(
    @Param('recordId') recordId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.proxyService.patch(
      ServiceName.ATTENDANCE,
      `/attendance/records/${recordId}`,
      body,
      { Authorization: req.headers.authorization },
    );
  }

  // Get open session for class
  @Get('class/:classId/open')
  async getOpenSession(@Param('classId') classId: string, @Request() req: any) {
    return this.proxyService.get(
      ServiceName.ATTENDANCE,
      `/attendance/sessions/class/${classId}/open`,
      { Authorization: req.headers.authorization },
    );
  }

  // Device registration
  @Post('devices/register')
  async registerDevice(@Body() body: any, @Request() req: any) {
    return this.proxyService.post(ServiceName.ATTENDANCE, '/devices/register', body, {
      Authorization: req.headers.authorization,
    });
  }

  @Get('devices/my-devices')
  async getMyDevices(@Request() req: any) {
    return this.proxyService.get(ServiceName.ATTENDANCE, '/devices/my-devices', {
      Authorization: req.headers.authorization,
    });
  }
}
