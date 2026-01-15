import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  AttendanceRecord,
  AttendanceStatus,
  CheckinSource,
} from './entities/attendance-record.entity';
import {
  AttendanceSession,
  AttendanceSessionStatus,
} from '../attendance-sessions/entities/attendance-session.entity';
import { QrService } from '../qr/qr.service';
import { DevicesService } from '../devices/devices.service';
import { AttendanceGateway } from '../websocket/attendance.gateway';

interface CheckinDto {
  qrToken?: string;
  deviceId?: string;
  latitude?: number;
  longitude?: number;
  wifiBssid?: string;
}

@Injectable()
export class AttendanceRecordsService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private attendanceRecordsRepository: Repository<AttendanceRecord>,
    private qrService: QrService,
    private devicesService: DevicesService,
    @Inject(forwardRef(() => AttendanceGateway))
    private attendanceGateway: AttendanceGateway,
    @Inject('CLASSROOM_SERVICE') private classroomClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE') private notificationClient: ClientProxy,
    @Inject('REPORTING_SERVICE') private reportingClient: ClientProxy,
  ) {}

  async checkin(
    attendanceSessionId: string,
    studentId: string,
    checkinDto: CheckinDto,
  ): Promise<AttendanceRecord> {
    // Validate QR token if provided
    if (checkinDto.qrToken) {
      const tokenData = await this.qrService.validateToken(checkinDto.qrToken);

      if (!tokenData) {
        throw new BadRequestException('QR code expired or invalid');
      }

      if (tokenData.attendanceSessionId !== attendanceSessionId) {
        throw new BadRequestException('QR code does not match session');
      }
    }

    // Verify device if provided
    if (checkinDto.deviceId) {
      const isValidDevice = await this.devicesService.validateDevice(
        studentId,
        checkinDto.deviceId,
      );

      if (!isValidDevice) {
        throw new BadRequestException(
          'Device not registered. Please register your device first.',
        );
      }
    }

    // Find or update existing record
    let record = await this.attendanceRecordsRepository.findOne({
      where: { attendanceSessionId, studentId },
      relations: ['attendanceSession'],
    });

    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    if (record.attendanceSession.status !== AttendanceSessionStatus.OPEN) {
      throw new BadRequestException('Attendance session is closed');
    }

    if (record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.LATE) {
      throw new BadRequestException('Already checked in');
    }

    const now = new Date();
    const openTime = new Date(record.attendanceSession.openTime);
    const lateThreshold = record.attendanceSession.lateThresholdMinutes;

    // Determine if late
    const minutesSinceOpen = (now.getTime() - openTime.getTime()) / (1000 * 60);
    const status = minutesSinceOpen > lateThreshold
      ? AttendanceStatus.LATE
      : AttendanceStatus.PRESENT;

    // Update record
    record.status = status;
    record.checkinTime = now;
    record.source = checkinDto.qrToken ? CheckinSource.QR : CheckinSource.MANUAL;
    record.deviceId = checkinDto.deviceId;
    record.gpsLatitude = checkinDto.latitude;
    record.gpsLongitude = checkinDto.longitude;

    const saved = await this.attendanceRecordsRepository.save(record);

    // Emit realtime update
    this.attendanceGateway.emitCheckin(attendanceSessionId, {
      studentId,
      status,
      checkinTime: now,
    });

    // Send notification
    this.notificationClient.emit('attendance_checked_in', {
      studentId,
      sessionId: record.sessionId,
      status,
      checkinTime: now,
    });

    // Update reporting
    this.reportingClient.emit('attendance_checked_in', {
      attendanceSessionId,
      sessionId: record.sessionId,
      classId: record.attendanceSession.classId,
      studentId,
      status,
      checkinTime: now,
    });

    return saved;
  }

  async manualCheckin(
    attendanceSessionId: string,
    studentId: string,
    teacherId: string,
    note?: string,
  ): Promise<AttendanceRecord> {
    let record = await this.attendanceRecordsRepository.findOne({
      where: { attendanceSessionId, studentId },
      relations: ['attendanceSession'],
    });

    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    record.status = AttendanceStatus.PRESENT;
    record.checkinTime = new Date();
    record.source = CheckinSource.MANUAL;
    record.note = note;

    const saved = await this.attendanceRecordsRepository.save(record);

    this.attendanceGateway.emitCheckin(attendanceSessionId, {
      studentId,
      status: AttendanceStatus.PRESENT,
      checkinTime: record.checkinTime,
    });

    return saved;
  }

  async updateStatus(
    recordId: string,
    status: AttendanceStatus,
    note?: string,
  ): Promise<AttendanceRecord> {
    const record = await this.attendanceRecordsRepository.findOne({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    record.status = status;
    if (note) record.note = note;

    return this.attendanceRecordsRepository.save(record);
  }

  async createAbsentRecordsForSession(
    attendanceSession: AttendanceSession,
  ): Promise<void> {
    // Get enrolled students from classroom service
    const studentIds = await firstValueFrom(
      this.classroomClient.send(
        { cmd: 'get_student_ids_in_class' },
        { classId: attendanceSession.classId },
      ),
    );

    if (!studentIds || studentIds.length === 0) {
      return;
    }

    const records = studentIds.map((studentId: string) => ({
      attendanceSessionId: attendanceSession.id,
      sessionId: attendanceSession.sessionId,
      studentId,
      status: AttendanceStatus.ABSENT,
      source: CheckinSource.SYSTEM,
    }));

    await this.attendanceRecordsRepository
      .createQueryBuilder()
      .insert()
      .into(AttendanceRecord)
      .values(records)
      .orIgnore() // Ignore duplicates
      .execute();
  }

  async findBySession(attendanceSessionId: string): Promise<AttendanceRecord[]> {
    return this.attendanceRecordsRepository.find({
      where: { attendanceSessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async findByStudentAndClass(
    studentId: string,
    classId: string,
  ): Promise<AttendanceRecord[]> {
    return this.attendanceRecordsRepository
      .createQueryBuilder('record')
      .innerJoin('record.attendanceSession', 'session')
      .where('record.studentId = :studentId', { studentId })
      .andWhere('session.classId = :classId', { classId })
      .orderBy('session.openTime', 'DESC')
      .getMany();
  }

  async getSessionStats(attendanceSessionId: string): Promise<{
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
  }> {
    const records = await this.findBySession(attendanceSessionId);

    return {
      total: records.length,
      present: records.filter((r) => r.status === AttendanceStatus.PRESENT).length,
      late: records.filter((r) => r.status === AttendanceStatus.LATE).length,
      absent: records.filter((r) => r.status === AttendanceStatus.ABSENT).length,
      excused: records.filter((r) => r.status === AttendanceStatus.EXCUSED).length,
    };
  }

  async markExcused(
    sessionIds: string[],
    studentId: string,
    leaveRequestId: string,
  ): Promise<void> {
    await this.attendanceRecordsRepository
      .createQueryBuilder()
      .update(AttendanceRecord)
      .set({
        status: AttendanceStatus.EXCUSED,
        note: `Leave request: ${leaveRequestId}`,
      })
      .where('sessionId IN (:...sessionIds)', { sessionIds })
      .andWhere('studentId = :studentId', { studentId })
      .execute();
  }
}
