import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert, AlertType, AlertStatus } from './entities/alert.entity';
import { AttendanceSummary } from '../summaries/entities/attendance-summary.entity';

export interface AlertThresholds {
  absenceWarning: number;     // Number of absences to trigger warning
  absenceCritical: number;    // Number of absences to trigger critical alert
  lateWarning: number;        // Number of late arrivals to trigger warning
  lowAttendanceRate: number;  // Percentage below which to alert (e.g., 80%)
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  absenceWarning: 3,
  absenceCritical: 5,
  lateWarning: 5,
  lowAttendanceRate: 80,
};

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private thresholds: AlertThresholds = DEFAULT_THRESHOLDS;

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
  ) {}

  setThresholds(thresholds: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  async findByClassId(classId: string, status?: AlertStatus): Promise<Alert[]> {
    const where: any = { classId };
    if (status) {
      where.status = status;
    }
    return this.alertRepository.find({
      where,
      order: { triggeredAt: 'DESC' },
    });
  }

  async findByStudentId(studentId: string): Promise<Alert[]> {
    return this.alertRepository.find({
      where: { studentId },
      order: { triggeredAt: 'DESC' },
    });
  }

  async findActiveAlerts(classId?: string): Promise<Alert[]> {
    const where: any = { status: AlertStatus.ACTIVE };
    if (classId) {
      where.classId = classId;
    }
    return this.alertRepository.find({
      where,
      order: { triggeredAt: 'DESC' },
    });
  }

  async checkAndCreateAlerts(summary: AttendanceSummary): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Check absence warning
    if (summary.absent >= this.thresholds.absenceWarning && summary.absent < this.thresholds.absenceCritical) {
      const existingAlert = await this.findExistingAlert(
        summary.studentId,
        summary.classId,
        AlertType.ABSENCE_WARNING,
      );

      if (!existingAlert) {
        const alert = await this.createAlert({
          studentId: summary.studentId,
          classId: summary.classId,
          type: AlertType.ABSENCE_WARNING,
          threshold: this.thresholds.absenceWarning,
          currentValue: summary.absent,
          message: `Student has ${summary.absent} absences (warning threshold: ${this.thresholds.absenceWarning})`,
        });
        alerts.push(alert);
      }
    }

    // Check absence critical
    if (summary.absent >= this.thresholds.absenceCritical) {
      const existingAlert = await this.findExistingAlert(
        summary.studentId,
        summary.classId,
        AlertType.ABSENCE_CRITICAL,
      );

      if (!existingAlert) {
        const alert = await this.createAlert({
          studentId: summary.studentId,
          classId: summary.classId,
          type: AlertType.ABSENCE_CRITICAL,
          threshold: this.thresholds.absenceCritical,
          currentValue: summary.absent,
          message: `CRITICAL: Student has ${summary.absent} absences (critical threshold: ${this.thresholds.absenceCritical})`,
        });
        alerts.push(alert);
      }
    }

    // Check late warning
    if (summary.late >= this.thresholds.lateWarning) {
      const existingAlert = await this.findExistingAlert(
        summary.studentId,
        summary.classId,
        AlertType.LATE_WARNING,
      );

      if (!existingAlert) {
        const alert = await this.createAlert({
          studentId: summary.studentId,
          classId: summary.classId,
          type: AlertType.LATE_WARNING,
          threshold: this.thresholds.lateWarning,
          currentValue: summary.late,
          message: `Student has been late ${summary.late} times (warning threshold: ${this.thresholds.lateWarning})`,
        });
        alerts.push(alert);
      }
    }

    // Check low attendance rate
    const attendanceRate = Number(summary.attendanceRate);
    if (attendanceRate < this.thresholds.lowAttendanceRate && summary.totalSessions >= 3) {
      const existingAlert = await this.findExistingAlert(
        summary.studentId,
        summary.classId,
        AlertType.LOW_ATTENDANCE_RATE,
      );

      if (!existingAlert) {
        const alert = await this.createAlert({
          studentId: summary.studentId,
          classId: summary.classId,
          type: AlertType.LOW_ATTENDANCE_RATE,
          threshold: this.thresholds.lowAttendanceRate,
          currentValue: attendanceRate,
          message: `Student attendance rate is ${attendanceRate}% (below ${this.thresholds.lowAttendanceRate}% threshold)`,
        });
        alerts.push(alert);
      }
    }

    return alerts;
  }

  private async findExistingAlert(
    studentId: string,
    classId: string,
    type: AlertType,
  ): Promise<Alert | null> {
    return this.alertRepository.findOne({
      where: {
        studentId,
        classId,
        type,
        status: AlertStatus.ACTIVE,
      },
    });
  }

  private async createAlert(data: {
    studentId: string;
    classId: string;
    type: AlertType;
    threshold: number;
    currentValue: number;
    message: string;
  }): Promise<Alert> {
    const alert = this.alertRepository.create({
      ...data,
      triggeredAt: new Date(),
      status: AlertStatus.ACTIVE,
    });

    const savedAlert = await this.alertRepository.save(alert);
    this.logger.warn(
      `Alert created: ${data.type} for student ${data.studentId} in class ${data.classId} - ${data.message}`,
    );

    return savedAlert;
  }

  async acknowledgeAlert(alertId: string): Promise<Alert | null> {
    const alert = await this.alertRepository.findOne({ where: { id: alertId } });

    if (!alert) {
      return null;
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    return this.alertRepository.save(alert);
  }

  async resolveAlert(alertId: string): Promise<Alert | null> {
    const alert = await this.alertRepository.findOne({ where: { id: alertId } });

    if (!alert) {
      return null;
    }

    alert.status = AlertStatus.RESOLVED;
    return this.alertRepository.save(alert);
  }

  async resolveAlertsForStudent(studentId: string, classId: string): Promise<void> {
    await this.alertRepository
      .createQueryBuilder()
      .update(Alert)
      .set({ status: AlertStatus.RESOLVED })
      .where('student_id = :studentId', { studentId })
      .andWhere('class_id = :classId', { classId })
      .andWhere('status = :status', { status: AlertStatus.ACTIVE })
      .execute();

    this.logger.log(`Resolved all active alerts for student ${studentId} in class ${classId}`);
  }

  async getAlertStatistics(classId: string): Promise<{
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    byType: Record<AlertType, number>;
  }> {
    const alerts = await this.findByClassId(classId);

    const byType: Record<AlertType, number> = {
      [AlertType.ABSENCE_WARNING]: 0,
      [AlertType.ABSENCE_CRITICAL]: 0,
      [AlertType.LATE_WARNING]: 0,
      [AlertType.LOW_ATTENDANCE_RATE]: 0,
    };

    let active = 0;
    let acknowledged = 0;
    let resolved = 0;

    for (const alert of alerts) {
      byType[alert.type]++;

      switch (alert.status) {
        case AlertStatus.ACTIVE:
          active++;
          break;
        case AlertStatus.ACKNOWLEDGED:
          acknowledged++;
          break;
        case AlertStatus.RESOLVED:
          resolved++;
          break;
      }
    }

    return {
      total: alerts.length,
      active,
      acknowledged,
      resolved,
      byType,
    };
  }
}
