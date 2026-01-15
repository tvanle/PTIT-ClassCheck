import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './entities/notification.entity';

// DTOs
class CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

// Event payload interfaces
interface AttendanceCheckedInEvent {
  studentId: string;
  studentName: string;
  className: string;
  sessionDate: string;
  status: string;
  email?: string;
}

interface LeaveRequestCreatedEvent {
  studentId: string;
  studentName: string;
  className: string;
  reason: string;
  requestId: string;
  email?: string;
}

interface LeaveRequestApprovedEvent {
  studentId: string;
  studentName: string;
  className: string;
  requestId: string;
  reviewerComment?: string;
  email?: string;
}

interface LeaveRequestRejectedEvent {
  studentId: string;
  studentName: string;
  className: string;
  requestId: string;
  reviewerComment?: string;
  email?: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // REST API endpoints

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateNotificationDto) {
    const notification = await this.notificationsService.create(dto);
    const result = await this.notificationsService.sendNotification(notification);
    return {
      success: result.success,
      notification,
      error: result.error,
    };
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    const notifications = await this.notificationsService.findByUserId(userId);
    return { notifications };
  }

  @Get('user/:userId/unread-count')
  async getUnreadCount(@Param('userId') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const notification = await this.notificationsService.findById(id);
    return { notification };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    const notification = await this.notificationsService.markAsRead(id);
    return { notification };
  }

  @Patch('user/:userId/read-all')
  async markAllAsRead(@Param('userId') userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  @Post('retry-failed')
  @HttpCode(HttpStatus.OK)
  async retryFailed() {
    await this.notificationsService.retryFailedNotifications();
    return { success: true };
  }

  // Event Pattern handlers for RabbitMQ events

  @EventPattern('attendance_checked_in')
  async handleAttendanceCheckedIn(@Payload() data: AttendanceCheckedInEvent) {
    console.log('Received attendance_checked_in event:', data);
    await this.notificationsService.handleAttendanceCheckedIn(data);
  }

  @EventPattern('leave_request_created')
  async handleLeaveRequestCreated(@Payload() data: LeaveRequestCreatedEvent) {
    console.log('Received leave_request_created event:', data);
    await this.notificationsService.handleLeaveRequestCreated(data);
  }

  @EventPattern('leave_request_approved')
  async handleLeaveRequestApproved(@Payload() data: LeaveRequestApprovedEvent) {
    console.log('Received leave_request_approved event:', data);
    await this.notificationsService.handleLeaveRequestApproved(data);
  }

  @EventPattern('leave_request_rejected')
  async handleLeaveRequestRejected(@Payload() data: LeaveRequestRejectedEvent) {
    console.log('Received leave_request_rejected event:', data);
    await this.notificationsService.handleLeaveRequestRejected(data);
  }
}
