export class AttendanceCheckedInEvent {
  constructor(
    public readonly attendanceSessionId: string,
    public readonly sessionId: string,
    public readonly classId: string,
    public readonly studentId: string,
    public readonly studentName: string,
    public readonly status: 'present' | 'late',
    public readonly checkinTime: Date,
    public readonly source: string,
  ) {}
}

export class AttendanceSessionOpenedEvent {
  constructor(
    public readonly attendanceSessionId: string,
    public readonly sessionId: string,
    public readonly classId: string,
    public readonly teacherId: string,
    public readonly method: string,
    public readonly openTime: Date,
    public readonly closeTime: Date,
  ) {}
}

export class AttendanceSessionClosedEvent {
  constructor(
    public readonly attendanceSessionId: string,
    public readonly sessionId: string,
    public readonly classId: string,
    public readonly totalStudents: number,
    public readonly present: number,
    public readonly late: number,
    public readonly absent: number,
    public readonly closedAt: Date,
  ) {}
}

export class AttendanceExcusedUpdatedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly studentId: string,
    public readonly leaveRequestId: string,
    public readonly updatedAt: Date,
  ) {}
}
