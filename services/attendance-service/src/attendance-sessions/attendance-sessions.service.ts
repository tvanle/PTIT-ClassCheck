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
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import {
  AttendanceSession,
  AttendanceMethod,
  AttendanceSessionStatus,
} from './entities/attendance-session.entity';
import { QrService } from '../qr/qr.service';
import { AttendanceRecordsService } from '../attendance-records/attendance-records.service';
import { AttendanceGateway } from '../websocket/attendance.gateway';

interface OpenSessionDto {
  sessionId: string;
  method: AttendanceMethod;
  durationMinutes?: number;
  lateThresholdMinutes?: number;
  qrRotationSeconds?: number;
}

@Injectable()
export class AttendanceSessionsService {
  private rotationIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    @InjectRepository(AttendanceSession)
    private attendanceSessionsRepository: Repository<AttendanceSession>,
    private qrService: QrService,
    @Inject(forwardRef(() => AttendanceRecordsService))
    private attendanceRecordsService: AttendanceRecordsService,
    @Inject(forwardRef(() => AttendanceGateway))
    private attendanceGateway: AttendanceGateway,
    @Inject('CLASSROOM_SERVICE') private classroomClient: ClientProxy,
  ) {}

  async openSession(
    openSessionDto: OpenSessionDto,
    teacherId: string,
  ): Promise<AttendanceSession> {
    // Get session info from classroom service
    const sessionInfo = await firstValueFrom(
      this.classroomClient.send({ cmd: 'get_session' }, { sessionId: openSessionDto.sessionId }),
    );

    if (!sessionInfo) {
      throw new NotFoundException('Classroom session not found');
    }

    // Check if already open
    const existingOpen = await this.attendanceSessionsRepository.findOne({
      where: {
        sessionId: openSessionDto.sessionId,
        status: AttendanceSessionStatus.OPEN,
      },
    });

    if (existingOpen) {
      throw new BadRequestException('Attendance session already open');
    }

    const durationMinutes = openSessionDto.durationMinutes || 15;
    const now = new Date();
    const closeTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const attendanceSession = this.attendanceSessionsRepository.create({
      sessionId: openSessionDto.sessionId,
      classId: sessionInfo.classId,
      openedBy: teacherId,
      method: openSessionDto.method,
      openTime: now,
      closeTime,
      lateThresholdMinutes: openSessionDto.lateThresholdMinutes || 10,
      qrRotationSeconds: openSessionDto.qrRotationSeconds || 15,
      status: AttendanceSessionStatus.OPEN,
    });

    const saved = await this.attendanceSessionsRepository.save(attendanceSession);

    // Generate initial QR token if QR method
    if (openSessionDto.method === AttendanceMethod.QR) {
      const token = await this.qrService.generateToken(
        saved.id,
        saved.classId,
        saved.sessionId,
        saved.qrRotationSeconds,
      );
      saved.qrToken = token;
      await this.attendanceSessionsRepository.save(saved);

      // Start QR rotation
      this.startQrRotation(saved);
    }

    // Create absent records for all enrolled students
    await this.attendanceRecordsService.createAbsentRecordsForSession(saved);

    return saved;
  }

  private startQrRotation(session: AttendanceSession): void {
    if (this.rotationIntervals.has(session.id)) {
      clearInterval(this.rotationIntervals.get(session.id));
    }

    const interval = setInterval(async () => {
      const currentSession = await this.attendanceSessionsRepository.findOne({
        where: { id: session.id },
      });

      if (!currentSession || currentSession.status !== AttendanceSessionStatus.OPEN) {
        this.stopQrRotation(session.id);
        return;
      }

      // Rotate token
      const newToken = await this.qrService.rotateToken(
        session.id,
        session.classId,
        session.sessionId,
        session.qrRotationSeconds,
      );

      // Update session with new token
      await this.attendanceSessionsRepository.update(session.id, {
        qrToken: newToken,
      });

      // Emit new QR via WebSocket
      this.attendanceGateway.emitQrUpdate(session.id, newToken);
    }, session.qrRotationSeconds * 1000);

    this.rotationIntervals.set(session.id, interval);
  }

  private stopQrRotation(sessionId: string): void {
    if (this.rotationIntervals.has(sessionId)) {
      clearInterval(this.rotationIntervals.get(sessionId));
      this.rotationIntervals.delete(sessionId);
    }
  }

  async closeSession(attendanceSessionId: string): Promise<AttendanceSession> {
    const session = await this.findById(attendanceSessionId);

    if (session.status !== AttendanceSessionStatus.OPEN) {
      throw new BadRequestException('Session is not open');
    }

    this.stopQrRotation(attendanceSessionId);
    await this.qrService.invalidateSession(attendanceSessionId);

    session.status = AttendanceSessionStatus.CLOSED;
    session.closeTime = new Date();

    const saved = await this.attendanceSessionsRepository.save(session);

    // Emit close event via WebSocket
    this.attendanceGateway.emitSessionClosed(attendanceSessionId);

    return saved;
  }

  async findById(id: string): Promise<AttendanceSession> {
    const session = await this.attendanceSessionsRepository.findOne({
      where: { id },
      relations: ['records'],
    });

    if (!session) {
      throw new NotFoundException('Attendance session not found');
    }

    return session;
  }

  async findBySessionId(sessionId: string): Promise<AttendanceSession | null> {
    return this.attendanceSessionsRepository.findOne({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOpenByClassId(classId: string): Promise<AttendanceSession | null> {
    return this.attendanceSessionsRepository.findOne({
      where: { classId, status: AttendanceSessionStatus.OPEN },
    });
  }

  async getCurrentQrToken(attendanceSessionId: string): Promise<string | null> {
    const session = await this.findById(attendanceSessionId);

    if (session.status !== AttendanceSessionStatus.OPEN) {
      return null;
    }

    return this.qrService.getCurrentToken(attendanceSessionId);
  }

  async getSessionStats(attendanceSessionId: string): Promise<{
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
  }> {
    return this.attendanceRecordsService.getSessionStats(attendanceSessionId);
  }

  // Auto-close expired sessions
  @Cron(CronExpression.EVERY_MINUTE)
  async autoCloseExpiredSessions(): Promise<void> {
    const now = new Date();

    const expiredSessions = await this.attendanceSessionsRepository
      .createQueryBuilder('session')
      .where('session.status = :status', { status: AttendanceSessionStatus.OPEN })
      .andWhere('session.closeTime <= :now', { now })
      .getMany();

    for (const session of expiredSessions) {
      try {
        await this.closeSession(session.id);
        console.log(`Auto-closed session ${session.id}`);
      } catch (error) {
        console.error(`Failed to auto-close session ${session.id}:`, error);
      }
    }
  }
}
