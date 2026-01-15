import {
  Controller,
  Get,
  Param,
  Query,
  Patch,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { SummariesService } from '../summaries/summaries.service';
import { AlertsService } from '../alerts/alerts.service';
import { AlertStatus } from '../alerts/entities/alert.entity';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly summariesService: SummariesService,
    private readonly alertsService: AlertsService,
  ) {}

  /**
   * GET /reports/classes/:classId/attendance
   * Get attendance report for a specific class
   */
  @Get('classes/:classId/attendance')
  async getClassAttendanceReport(@Param('classId') classId: string) {
    const summaries = await this.summariesService.findByClassId(classId);
    const statistics = await this.summariesService.getClassStatistics(classId);

    return {
      classId,
      statistics,
      summaries: summaries.map((s) => ({
        studentId: s.studentId,
        totalSessions: s.totalSessions,
        present: s.present,
        late: s.late,
        absent: s.absent,
        excused: s.excused,
        attendanceRate: Number(s.attendanceRate),
        lastUpdated: s.lastUpdated,
      })),
    };
  }

  /**
   * GET /reports/students/:studentId/attendance
   * Get attendance report for a specific student
   */
  @Get('students/:studentId/attendance')
  async getStudentAttendanceReport(
    @Param('studentId') studentId: string,
    @Query('term') term?: string,
  ) {
    const summaries = await this.summariesService.findByStudentId(studentId, term);

    // Calculate overall statistics
    const totalClasses = summaries.length;
    const overallAttendanceRate =
      totalClasses > 0
        ? summaries.reduce((sum, s) => sum + Number(s.attendanceRate), 0) / totalClasses
        : 0;

    const totalPresent = summaries.reduce((sum, s) => sum + s.present, 0);
    const totalLate = summaries.reduce((sum, s) => sum + s.late, 0);
    const totalAbsent = summaries.reduce((sum, s) => sum + s.absent, 0);
    const totalExcused = summaries.reduce((sum, s) => sum + s.excused, 0);

    return {
      studentId,
      term: term || 'all',
      overall: {
        totalClasses,
        overallAttendanceRate: Number(overallAttendanceRate.toFixed(2)),
        totalPresent,
        totalLate,
        totalAbsent,
        totalExcused,
      },
      byClass: summaries.map((s) => ({
        classId: s.classId,
        totalSessions: s.totalSessions,
        present: s.present,
        late: s.late,
        absent: s.absent,
        excused: s.excused,
        attendanceRate: Number(s.attendanceRate),
        lastUpdated: s.lastUpdated,
      })),
    };
  }

  /**
   * GET /reports/alerts
   * Get alerts with optional filtering
   */
  @Get('alerts')
  async getAlerts(
    @Query('classId') classId?: string,
    @Query('status') status?: string,
  ) {
    let alertStatus: AlertStatus | undefined;
    if (status && Object.values(AlertStatus).includes(status as AlertStatus)) {
      alertStatus = status as AlertStatus;
    }

    if (classId) {
      const alerts = await this.alertsService.findByClassId(classId, alertStatus);
      const statistics = await this.alertsService.getAlertStatistics(classId);

      return {
        classId,
        statistics,
        alerts: alerts.map((a) => ({
          id: a.id,
          studentId: a.studentId,
          classId: a.classId,
          type: a.type,
          threshold: Number(a.threshold),
          currentValue: Number(a.currentValue),
          message: a.message,
          triggeredAt: a.triggeredAt,
          status: a.status,
        })),
      };
    }

    // Return all active alerts if no classId specified
    const alerts = await this.alertsService.findActiveAlerts();
    return {
      alerts: alerts.map((a) => ({
        id: a.id,
        studentId: a.studentId,
        classId: a.classId,
        type: a.type,
        threshold: Number(a.threshold),
        currentValue: Number(a.currentValue),
        message: a.message,
        triggeredAt: a.triggeredAt,
        status: a.status,
      })),
    };
  }

  /**
   * GET /reports/alerts/:alertId
   * Get a specific alert by ID
   */
  @Get('alerts/:alertId')
  async getAlertById(@Param('alertId') alertId: string) {
    const alerts = await this.alertsService.findActiveAlerts();
    const alert = alerts.find((a) => a.id === alertId);

    if (!alert) {
      throw new HttpException('Alert not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: alert.id,
      studentId: alert.studentId,
      classId: alert.classId,
      type: alert.type,
      threshold: Number(alert.threshold),
      currentValue: Number(alert.currentValue),
      message: alert.message,
      triggeredAt: alert.triggeredAt,
      status: alert.status,
    };
  }

  /**
   * PATCH /reports/alerts/:alertId/acknowledge
   * Acknowledge an alert
   */
  @Patch('alerts/:alertId/acknowledge')
  async acknowledgeAlert(@Param('alertId') alertId: string) {
    const alert = await this.alertsService.acknowledgeAlert(alertId);

    if (!alert) {
      throw new HttpException('Alert not found', HttpStatus.NOT_FOUND);
    }

    return {
      message: 'Alert acknowledged successfully',
      alert: {
        id: alert.id,
        status: alert.status,
      },
    };
  }

  /**
   * PATCH /reports/alerts/:alertId/resolve
   * Resolve an alert
   */
  @Patch('alerts/:alertId/resolve')
  async resolveAlert(@Param('alertId') alertId: string) {
    const alert = await this.alertsService.resolveAlert(alertId);

    if (!alert) {
      throw new HttpException('Alert not found', HttpStatus.NOT_FOUND);
    }

    return {
      message: 'Alert resolved successfully',
      alert: {
        id: alert.id,
        status: alert.status,
      },
    };
  }

  /**
   * GET /reports/classes/:classId/students/:studentId
   * Get detailed attendance for a specific student in a class
   */
  @Get('classes/:classId/students/:studentId')
  async getStudentClassAttendance(
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
  ) {
    const summary = await this.summariesService.findByStudentAndClass(studentId, classId);

    if (!summary) {
      throw new HttpException(
        'Attendance summary not found for this student in this class',
        HttpStatus.NOT_FOUND,
      );
    }

    const alerts = await this.alertsService.findByStudentId(studentId);
    const classAlerts = alerts.filter((a) => a.classId === classId);

    return {
      studentId,
      classId,
      summary: {
        totalSessions: summary.totalSessions,
        present: summary.present,
        late: summary.late,
        absent: summary.absent,
        excused: summary.excused,
        attendanceRate: Number(summary.attendanceRate),
        lastUpdated: summary.lastUpdated,
      },
      alerts: classAlerts.map((a) => ({
        id: a.id,
        type: a.type,
        message: a.message,
        triggeredAt: a.triggeredAt,
        status: a.status,
      })),
    };
  }
}
