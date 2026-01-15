import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { LeaveRequest, LeaveRequestStatus } from './entities/leave-request.entity';
import { LeaveSessionMap } from './entities/leave-session-map.entity';

interface CreateLeaveRequestDto {
  classId: string;
  sessionIds: string[];
  reason: string;
  attachmentUrl?: string;
}

interface ReviewDto {
  comment?: string;
}

@Injectable()
export class LeaveRequestsService {
  constructor(
    @InjectRepository(LeaveRequest)
    private leaveRequestsRepository: Repository<LeaveRequest>,
    @InjectRepository(LeaveSessionMap)
    private leaveSessionMapRepository: Repository<LeaveSessionMap>,
    @Inject('ATTENDANCE_SERVICE') private attendanceClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE') private notificationClient: ClientProxy,
    @Inject('CLASSROOM_SERVICE') private classroomClient: ClientProxy,
  ) {}

  async create(
    studentId: string,
    dto: CreateLeaveRequestDto,
  ): Promise<LeaveRequest> {
    // Create leave request
    const leaveRequest = this.leaveRequestsRepository.create({
      studentId,
      classId: dto.classId,
      reason: dto.reason,
      attachmentUrl: dto.attachmentUrl,
      status: LeaveRequestStatus.PENDING,
    });

    const savedRequest = await this.leaveRequestsRepository.save(leaveRequest);

    // Create session mappings
    const sessionMaps = dto.sessionIds.map((sessionId) => ({
      leaveRequestId: savedRequest.id,
      sessionId,
    }));

    await this.leaveSessionMapRepository.save(sessionMaps);

    // Emit event for notification
    this.notificationClient.emit('leave_request_created', {
      leaveRequestId: savedRequest.id,
      studentId,
      classId: dto.classId,
      sessionIds: dto.sessionIds,
      reason: dto.reason,
      createdAt: savedRequest.createdAt,
    });

    return this.findById(savedRequest.id);
  }

  async findById(id: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestsRepository.findOne({
      where: { id },
      relations: ['sessionMaps'],
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    return request;
  }

  async findByStudent(studentId: string): Promise<LeaveRequest[]> {
    return this.leaveRequestsRepository.find({
      where: { studentId },
      relations: ['sessionMaps'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByClass(
    classId: string,
    status?: LeaveRequestStatus,
  ): Promise<LeaveRequest[]> {
    const query = this.leaveRequestsRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.sessionMaps', 'sessionMaps')
      .where('request.classId = :classId', { classId });

    if (status) {
      query.andWhere('request.status = :status', { status });
    }

    return query.orderBy('request.createdAt', 'DESC').getMany();
  }

  async findPendingByClass(classId: string): Promise<LeaveRequest[]> {
    return this.findByClass(classId, LeaveRequestStatus.PENDING);
  }

  async approve(
    id: string,
    reviewerId: string,
    dto: ReviewDto,
  ): Promise<LeaveRequest> {
    const request = await this.findById(id);

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Leave request is not pending');
    }

    request.status = LeaveRequestStatus.APPROVED;
    request.reviewerId = reviewerId;
    request.reviewerComment = dto.comment;
    request.reviewedAt = new Date();

    const saved = await this.leaveRequestsRepository.save(request);

    // Get session IDs
    const sessionIds = request.sessionMaps.map((m) => m.sessionId);

    // Emit event to update attendance records
    this.attendanceClient.emit('leave_request_approved', {
      leaveRequestId: saved.id,
      studentId: saved.studentId,
      classId: saved.classId,
      sessionIds,
      reviewerId,
      reviewerComment: dto.comment,
      approvedAt: saved.reviewedAt,
    });

    // Notify student
    this.notificationClient.emit('leave_request_approved', {
      leaveRequestId: saved.id,
      studentId: saved.studentId,
      classId: saved.classId,
      reviewerComment: dto.comment,
    });

    return saved;
  }

  async reject(
    id: string,
    reviewerId: string,
    dto: ReviewDto,
  ): Promise<LeaveRequest> {
    const request = await this.findById(id);

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Leave request is not pending');
    }

    if (!dto.comment) {
      throw new BadRequestException('Comment is required when rejecting');
    }

    request.status = LeaveRequestStatus.REJECTED;
    request.reviewerId = reviewerId;
    request.reviewerComment = dto.comment;
    request.reviewedAt = new Date();

    const saved = await this.leaveRequestsRepository.save(request);

    // Notify student
    this.notificationClient.emit('leave_request_rejected', {
      leaveRequestId: saved.id,
      studentId: saved.studentId,
      classId: saved.classId,
      reviewerComment: dto.comment,
    });

    return saved;
  }

  async cancel(id: string, studentId: string): Promise<void> {
    const request = await this.findById(id);

    if (request.studentId !== studentId) {
      throw new BadRequestException('Not authorized to cancel this request');
    }

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending requests');
    }

    await this.leaveRequestsRepository.delete(id);
  }
}
