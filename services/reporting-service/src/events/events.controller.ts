import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { SummariesService } from '../summaries/summaries.service';
import { AlertsService } from '../alerts/alerts.service';

// Event payload interfaces
interface AttendanceCheckedInPayload {
  attendanceSessionId: string;
  sessionId: string;
  classId: string;
  studentId: string;
  studentName: string;
  status: 'present' | 'late';
  checkinTime: string;
  source: string;
}

interface AttendanceSessionClosedPayload {
  attendanceSessionId: string;
  sessionId: string;
  classId: string;
  totalStudents: number;
  present: number;
  late: number;
  absent: number;
  closedAt: string;
}

interface LeaveRequestApprovedPayload {
  leaveRequestId: string;
  studentId: string;
  classId: string;
  sessionIds: string[];
  reviewerId: string;
  reviewerComment: string | null;
  approvedAt: string;
}

interface EnrollmentImportedPayload {
  classId: string;
  className: string;
  totalStudents: number;
  studentIds: string[];
  importedAt: string;
}

interface AttendanceExcusedUpdatedPayload {
  sessionId: string;
  studentId: string;
  leaveRequestId: string;
  updatedAt: string;
}

interface SessionCreatedPayload {
  sessionId: string;
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionNo: number;
}

@Controller()
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(
    private readonly summariesService: SummariesService,
    private readonly alertsService: AlertsService,
  ) {}

  /**
   * Handle student check-in event
   * Updates the attendance summary when a student checks in
   */
  @EventPattern('attendance.checked_in')
  async handleAttendanceCheckedIn(@Payload() data: AttendanceCheckedInPayload) {
    this.logger.log(
      `Received attendance.checked_in event: student=${data.studentId}, class=${data.classId}, status=${data.status}`,
    );

    try {
      // Update the student's attendance summary
      const summary = await this.summariesService.updateSummary({
        studentId: data.studentId,
        classId: data.classId,
        status: data.status,
        isNewSession: false, // Session count is handled separately
      });

      // Check if any alerts need to be created
      const alerts = await this.alertsService.checkAndCreateAlerts(summary);

      if (alerts.length > 0) {
        this.logger.log(
          `Created ${alerts.length} alert(s) for student ${data.studentId} in class ${data.classId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling attendance.checked_in event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle attendance session closed event
   * Updates summaries for students who were marked absent
   */
  @EventPattern('attendance.session_closed')
  async handleAttendanceSessionClosed(@Payload() data: AttendanceSessionClosedPayload) {
    this.logger.log(
      `Received attendance.session_closed event: session=${data.sessionId}, class=${data.classId}, ` +
      `present=${data.present}, late=${data.late}, absent=${data.absent}`,
    );

    try {
      // Increment total sessions for all students in the class
      await this.summariesService.incrementTotalSessions(data.classId);

      this.logger.log(
        `Incremented total sessions for class ${data.classId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling attendance.session_closed event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle leave request approved event
   * Updates attendance records from absent to excused
   */
  @EventPattern('leave.request_approved')
  async handleLeaveRequestApproved(@Payload() data: LeaveRequestApprovedPayload) {
    this.logger.log(
      `Received leave.request_approved event: request=${data.leaveRequestId}, ` +
      `student=${data.studentId}, class=${data.classId}, sessions=${data.sessionIds.length}`,
    );

    try {
      // Update the summary: convert absent to excused for each approved session
      for (const sessionId of data.sessionIds) {
        await this.summariesService.updateAbsentToExcused(data.studentId, data.classId);
      }

      // Re-check alerts - some might need to be resolved now
      const summary = await this.summariesService.findByStudentAndClass(
        data.studentId,
        data.classId,
      );

      if (summary) {
        await this.alertsService.checkAndCreateAlerts(summary);
      }

      this.logger.log(
        `Updated ${data.sessionIds.length} session(s) to excused for student ${data.studentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling leave.request_approved event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle enrollment imported event
   * Initializes attendance summaries for all students in the class
   */
  @EventPattern('classroom.enrollment_imported')
  async handleEnrollmentImported(@Payload() data: EnrollmentImportedPayload) {
    this.logger.log(
      `Received classroom.enrollment_imported event: class=${data.classId}, ` +
      `students=${data.totalStudents}`,
    );

    try {
      await this.summariesService.initializeBulkSummaries(data.classId, data.studentIds);

      this.logger.log(
        `Initialized summaries for ${data.totalStudents} students in class ${data.classId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling classroom.enrollment_imported event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle attendance excused updated event
   * Updates summary when attendance status changes to excused
   */
  @EventPattern('attendance.excused_updated')
  async handleAttendanceExcusedUpdated(@Payload() data: AttendanceExcusedUpdatedPayload) {
    this.logger.log(
      `Received attendance.excused_updated event: session=${data.sessionId}, ` +
      `student=${data.studentId}, leaveRequest=${data.leaveRequestId}`,
    );

    // This event is informational - the actual update is done via leave.request_approved
    // We can use this to log or trigger additional actions
  }

  /**
   * Handle session created event
   * Can be used to update total session counts
   */
  @EventPattern('classroom.session_created')
  async handleSessionCreated(@Payload() data: SessionCreatedPayload) {
    this.logger.log(
      `Received classroom.session_created event: session=${data.sessionId}, ` +
      `class=${data.classId}, sessionNo=${data.sessionNo}`,
    );

    // Session creation is informational - total sessions are counted when sessions are closed
  }

  /**
   * Handle bulk attendance marked event
   * Used when a teacher marks attendance for multiple students at once
   */
  @EventPattern('attendance.bulk_marked')
  async handleBulkAttendanceMarked(
    @Payload()
    data: {
      classId: string;
      sessionId: string;
      records: Array<{
        studentId: string;
        status: 'present' | 'late' | 'absent' | 'excused';
      }>;
    },
  ) {
    this.logger.log(
      `Received attendance.bulk_marked event: class=${data.classId}, ` +
      `session=${data.sessionId}, records=${data.records.length}`,
    );

    try {
      for (const record of data.records) {
        const summary = await this.summariesService.updateSummary({
          studentId: record.studentId,
          classId: data.classId,
          status: record.status,
          isNewSession: false,
        });

        // Check alerts for each student
        await this.alertsService.checkAndCreateAlerts(summary);
      }

      this.logger.log(
        `Processed ${data.records.length} attendance records for class ${data.classId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling attendance.bulk_marked event: ${error.message}`,
        error.stack,
      );
    }
  }
}
