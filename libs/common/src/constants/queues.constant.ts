export const RABBITMQ_QUEUES = {
  IDENTITY: 'identity_queue',
  CLASSROOM: 'classroom_queue',
  ATTENDANCE: 'attendance_queue',
  LEAVE: 'leave_queue',
  NOTIFICATION: 'notification_queue',
  REPORTING: 'reporting_queue',
};

export const RABBITMQ_EXCHANGES = {
  EVENTS: 'classcheck_events',
};

export const RABBITMQ_ROUTING_KEYS = {
  // Attendance events
  ATTENDANCE_CHECKED_IN: 'attendance.checked_in',
  ATTENDANCE_SESSION_OPENED: 'attendance.session_opened',
  ATTENDANCE_SESSION_CLOSED: 'attendance.session_closed',

  // Leave events
  LEAVE_REQUEST_CREATED: 'leave.request_created',
  LEAVE_REQUEST_APPROVED: 'leave.request_approved',
  LEAVE_REQUEST_REJECTED: 'leave.request_rejected',

  // Classroom events
  ENROLLMENT_IMPORTED: 'classroom.enrollment_imported',
  SESSION_CREATED: 'classroom.session_created',

  // User events
  USER_CREATED: 'user.created',
};
