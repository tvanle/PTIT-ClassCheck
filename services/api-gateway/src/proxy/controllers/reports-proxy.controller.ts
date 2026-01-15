import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProxyService, ServiceName } from '../proxy.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsProxyController {
  constructor(private proxyService: ProxyService) {}

  // Get class attendance report
  @Get('classes/:classId/attendance')
  async getClassAttendance(@Param('classId') classId: string, @Request() req: any) {
    return this.proxyService.get(ServiceName.REPORTING, `/reports/classes/${classId}/attendance`, {
      Authorization: req.headers.authorization,
    });
  }

  // Get student attendance report
  @Get('students/:studentId/attendance')
  async getStudentAttendance(
    @Param('studentId') studentId: string,
    @Query('term') term: string,
    @Request() req: any,
  ) {
    let path = `/reports/students/${studentId}/attendance`;
    if (term) path += `?term=${term}`;
    return this.proxyService.get(ServiceName.REPORTING, path, {
      Authorization: req.headers.authorization,
    });
  }

  // Get alerts
  @Get('alerts')
  async getAlerts(
    @Query('classId') classId: string,
    @Query('status') status: string,
    @Request() req: any,
  ) {
    let path = '/reports/alerts';
    const params = [];
    if (classId) params.push(`classId=${classId}`);
    if (status) params.push(`status=${status}`);
    if (params.length) path += `?${params.join('&')}`;

    return this.proxyService.get(ServiceName.REPORTING, path, {
      Authorization: req.headers.authorization,
    });
  }

  // Get specific alert
  @Get('alerts/:alertId')
  async getAlert(@Param('alertId') alertId: string, @Request() req: any) {
    return this.proxyService.get(ServiceName.REPORTING, `/reports/alerts/${alertId}`, {
      Authorization: req.headers.authorization,
    });
  }

  // Acknowledge alert
  @Patch('alerts/:alertId/acknowledge')
  async acknowledgeAlert(@Param('alertId') alertId: string, @Request() req: any) {
    return this.proxyService.patch(ServiceName.REPORTING, `/reports/alerts/${alertId}/acknowledge`, {}, {
      Authorization: req.headers.authorization,
    });
  }

  // Resolve alert
  @Patch('alerts/:alertId/resolve')
  async resolveAlert(@Param('alertId') alertId: string, @Request() req: any) {
    return this.proxyService.patch(ServiceName.REPORTING, `/reports/alerts/${alertId}/resolve`, {}, {
      Authorization: req.headers.authorization,
    });
  }

  // Get student detail in class
  @Get('classes/:classId/students/:studentId')
  async getStudentDetail(
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
    @Request() req: any,
  ) {
    return this.proxyService.get(
      ServiceName.REPORTING,
      `/reports/classes/${classId}/students/${studentId}`,
      { Authorization: req.headers.authorization },
    );
  }
}
