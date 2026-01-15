import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationStatus,
  NotificationType,
} from './entities/notification.entity';
import { EmailService } from '../email/email.service';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface SendNotificationResult {
  success: boolean;
  notificationId: string;
  error?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      content: dto.content,
      metadata: dto.metadata,
      status: NotificationStatus.PENDING,
    });

    return this.notificationRepository.save(notification);
  }

  async sendNotification(notification: Notification): Promise<SendNotificationResult> {
    try {
      switch (notification.type) {
        case NotificationType.EMAIL:
          await this.sendEmailNotification(notification);
          break;
        case NotificationType.PUSH:
          await this.sendPushNotification(notification);
          break;
        case NotificationType.IN_APP:
          // In-app notifications are just stored in DB
          break;
      }

      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      await this.notificationRepository.save(notification);

      this.logger.log(`Notification ${notification.id} sent successfully`);

      return {
        success: true,
        notificationId: notification.id,
      };
    } catch (error) {
      notification.retryCount += 1;
      notification.errorMessage = error.message;

      if (notification.retryCount >= notification.maxRetries) {
        notification.status = NotificationStatus.FAILED;
      }

      await this.notificationRepository.save(notification);

      this.logger.error(
        `Failed to send notification ${notification.id}: ${error.message}`,
      );

      return {
        success: false,
        notificationId: notification.id,
        error: error.message,
      };
    }
  }

  private async sendEmailNotification(notification: Notification): Promise<void> {
    const email = notification.metadata?.email;
    if (!email) {
      throw new Error('Email address not found in notification metadata');
    }

    await this.emailService.sendEmail({
      to: email,
      subject: notification.title,
      html: notification.content,
    });
  }

  private async sendPushNotification(notification: Notification): Promise<void> {
    const fcmToken = notification.metadata?.fcmToken;
    if (!fcmToken) {
      throw new Error('FCM token not found in notification metadata');
    }

    // Firebase push notification implementation
    // This would use firebase-admin to send push notifications
    this.logger.log(`Push notification would be sent to token: ${fcmToken}`);
  }

  async createAndSend(dto: CreateNotificationDto): Promise<SendNotificationResult> {
    const notification = await this.create(dto);
    return this.sendNotification(notification);
  }

  async findByUserId(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Notification | null> {
    return this.notificationRepository.findOne({ where: { id } });
  }

  async markAsRead(id: string): Promise<Notification | null> {
    const notification = await this.findById(id);
    if (notification) {
      notification.status = NotificationStatus.READ;
      return this.notificationRepository.save(notification);
    }
    return null;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, status: NotificationStatus.SENT },
      { status: NotificationStatus.READ },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, status: NotificationStatus.SENT },
    });
  }

  async retryFailedNotifications(): Promise<void> {
    const failedNotifications = await this.notificationRepository.find({
      where: {
        status: NotificationStatus.FAILED,
      },
    });

    for (const notification of failedNotifications) {
      if (notification.retryCount < notification.maxRetries) {
        notification.status = NotificationStatus.PENDING;
        await this.notificationRepository.save(notification);
        await this.sendNotification(notification);
      }
    }
  }

  // Event handlers for attendance and leave events
  async handleAttendanceCheckedIn(data: {
    studentId: string;
    studentName: string;
    className: string;
    sessionDate: string;
    status: string;
    email?: string;
  }): Promise<void> {
    const notification = await this.create({
      userId: data.studentId,
      type: NotificationType.IN_APP,
      title: 'Attendance Recorded',
      content: `Your attendance for ${data.className} on ${data.sessionDate} has been recorded as "${data.status}".`,
      metadata: { email: data.email },
    });

    await this.sendNotification(notification);

    // Also send email if available
    if (data.email) {
      const emailNotification = await this.create({
        userId: data.studentId,
        type: NotificationType.EMAIL,
        title: 'Attendance Confirmation - PTIT ClassCheck',
        content: `
          <h2>Attendance Recorded</h2>
          <p>Dear ${data.studentName},</p>
          <p>Your attendance for <strong>${data.className}</strong> on <strong>${data.sessionDate}</strong> has been recorded.</p>
          <p>Status: <strong>${data.status}</strong></p>
          <br>
          <p>Best regards,</p>
          <p>PTIT ClassCheck System</p>
        `,
        metadata: { email: data.email },
      });

      await this.sendNotification(emailNotification);
    }
  }

  async handleLeaveRequestCreated(data: {
    studentId: string;
    studentName: string;
    className: string;
    reason: string;
    requestId: string;
    email?: string;
  }): Promise<void> {
    const notification = await this.create({
      userId: data.studentId,
      type: NotificationType.IN_APP,
      title: 'Leave Request Submitted',
      content: `Your leave request for ${data.className} has been submitted and is pending review.`,
      metadata: { requestId: data.requestId, email: data.email },
    });

    await this.sendNotification(notification);

    if (data.email) {
      const emailNotification = await this.create({
        userId: data.studentId,
        type: NotificationType.EMAIL,
        title: 'Leave Request Submitted - PTIT ClassCheck',
        content: `
          <h2>Leave Request Submitted</h2>
          <p>Dear ${data.studentName},</p>
          <p>Your leave request for <strong>${data.className}</strong> has been submitted successfully.</p>
          <p>Reason: ${data.reason}</p>
          <p>Status: <strong>Pending Review</strong></p>
          <p>You will be notified once your request is reviewed.</p>
          <br>
          <p>Best regards,</p>
          <p>PTIT ClassCheck System</p>
        `,
        metadata: { requestId: data.requestId, email: data.email },
      });

      await this.sendNotification(emailNotification);
    }
  }

  async handleLeaveRequestApproved(data: {
    studentId: string;
    studentName: string;
    className: string;
    requestId: string;
    reviewerComment?: string;
    email?: string;
  }): Promise<void> {
    const notification = await this.create({
      userId: data.studentId,
      type: NotificationType.IN_APP,
      title: 'Leave Request Approved',
      content: `Your leave request for ${data.className} has been approved.${data.reviewerComment ? ` Comment: ${data.reviewerComment}` : ''}`,
      metadata: { requestId: data.requestId, email: data.email },
    });

    await this.sendNotification(notification);

    if (data.email) {
      const emailNotification = await this.create({
        userId: data.studentId,
        type: NotificationType.EMAIL,
        title: 'Leave Request Approved - PTIT ClassCheck',
        content: `
          <h2>Leave Request Approved</h2>
          <p>Dear ${data.studentName},</p>
          <p>Good news! Your leave request for <strong>${data.className}</strong> has been <strong style="color: green;">approved</strong>.</p>
          ${data.reviewerComment ? `<p>Reviewer's Comment: ${data.reviewerComment}</p>` : ''}
          <p>Your attendance will be marked as "Excused" for the requested sessions.</p>
          <br>
          <p>Best regards,</p>
          <p>PTIT ClassCheck System</p>
        `,
        metadata: { requestId: data.requestId, email: data.email },
      });

      await this.sendNotification(emailNotification);
    }
  }

  async handleLeaveRequestRejected(data: {
    studentId: string;
    studentName: string;
    className: string;
    requestId: string;
    reviewerComment?: string;
    email?: string;
  }): Promise<void> {
    const notification = await this.create({
      userId: data.studentId,
      type: NotificationType.IN_APP,
      title: 'Leave Request Rejected',
      content: `Your leave request for ${data.className} has been rejected.${data.reviewerComment ? ` Reason: ${data.reviewerComment}` : ''}`,
      metadata: { requestId: data.requestId, email: data.email },
    });

    await this.sendNotification(notification);

    if (data.email) {
      const emailNotification = await this.create({
        userId: data.studentId,
        type: NotificationType.EMAIL,
        title: 'Leave Request Rejected - PTIT ClassCheck',
        content: `
          <h2>Leave Request Rejected</h2>
          <p>Dear ${data.studentName},</p>
          <p>We regret to inform you that your leave request for <strong>${data.className}</strong> has been <strong style="color: red;">rejected</strong>.</p>
          ${data.reviewerComment ? `<p>Reason: ${data.reviewerComment}</p>` : ''}
          <p>Please contact your instructor if you have any questions.</p>
          <br>
          <p>Best regards,</p>
          <p>PTIT ClassCheck System</p>
        `,
        metadata: { requestId: data.requestId, email: data.email },
      });

      await this.sendNotification(emailNotification);
    }
  }
}
