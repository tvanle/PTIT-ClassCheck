import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure = this.configService.get<boolean>('SMTP_SECURE', false);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!user || !pass) {
      this.logger.warn(
        'SMTP credentials not configured. Email sending will be disabled.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    this.logger.log(`Email transporter initialized with host: ${host}`);
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('Email transporter not configured. Skipping email send.');
      throw new Error('Email service not configured');
    }

    const fromName = this.configService.get<string>('SMTP_FROM_NAME', 'PTIT ClassCheck');
    const fromEmail = this.configService.get<string>(
      'SMTP_FROM_EMAIL',
      this.configService.get<string>('SMTP_USER') || '',
    );

    try {
      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });

      this.logger.log(`Email sent successfully: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }

  async sendAttendanceConfirmation(
    email: string,
    studentName: string,
    className: string,
    sessionDate: string,
    status: string,
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Attendance Confirmation - ${className}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Attendance Confirmation</h2>
          <p>Dear ${studentName},</p>
          <p>Your attendance for <strong>${className}</strong> on <strong>${sessionDate}</strong> has been recorded.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Status:</strong> ${status}</p>
          </div>
          <p>If you believe this is incorrect, please contact your instructor.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message from PTIT ClassCheck System.
          </p>
        </div>
      `,
    });
  }

  async sendLeaveRequestNotification(
    email: string,
    studentName: string,
    className: string,
    status: 'created' | 'approved' | 'rejected',
    reviewerComment?: string,
  ): Promise<void> {
    const statusMessages = {
      created: {
        subject: 'Leave Request Submitted',
        statusText: 'Pending Review',
        statusColor: '#f0ad4e',
        message: 'Your leave request has been submitted and is awaiting review.',
      },
      approved: {
        subject: 'Leave Request Approved',
        statusText: 'Approved',
        statusColor: '#5cb85c',
        message: 'Your leave request has been approved. Your attendance will be marked as excused.',
      },
      rejected: {
        subject: 'Leave Request Rejected',
        statusText: 'Rejected',
        statusColor: '#d9534f',
        message: 'Unfortunately, your leave request has been rejected.',
      },
    };

    const config = statusMessages[status];

    await this.sendEmail({
      to: email,
      subject: `${config.subject} - ${className}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${config.subject}</h2>
          <p>Dear ${studentName},</p>
          <p>${config.message}</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Class:</strong> ${className}</p>
            <p style="margin: 10px 0 0 0;">
              <strong>Status:</strong>
              <span style="color: ${config.statusColor}; font-weight: bold;">${config.statusText}</span>
            </p>
            ${reviewerComment ? `<p style="margin: 10px 0 0 0;"><strong>Comment:</strong> ${reviewerComment}</p>` : ''}
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message from PTIT ClassCheck System.
          </p>
        </div>
      `,
    });
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error(`SMTP connection verification failed: ${error.message}`);
      return false;
    }
  }
}
