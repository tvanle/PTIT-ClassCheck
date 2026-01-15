export enum NotificationType {
  ATTENDANCE_CONFIRMED = 'attendance_confirmed',
  LEAVE_REQUEST_CREATED = 'leave_request_created',
  LEAVE_REQUEST_APPROVED = 'leave_request_approved',
  LEAVE_REQUEST_REJECTED = 'leave_request_rejected',
  ABSENCE_WARNING = 'absence_warning',
  SESSION_REMINDER = 'session_reminder',
}

export class SendNotificationEvent {
  constructor(
    public readonly userId: string,
    public readonly type: NotificationType,
    public readonly title: string,
    public readonly content: string,
    public readonly data?: Record<string, any>,
  ) {}
}

export class SendEmailEvent {
  constructor(
    public readonly to: string,
    public readonly subject: string,
    public readonly template: string,
    public readonly context: Record<string, any>,
  ) {}
}

export class SendPushEvent {
  constructor(
    public readonly userId: string,
    public readonly title: string,
    public readonly body: string,
    public readonly data?: Record<string, any>,
  ) {}
}
