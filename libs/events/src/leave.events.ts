export class LeaveRequestCreatedEvent {
  constructor(
    public readonly leaveRequestId: string,
    public readonly studentId: string,
    public readonly studentName: string,
    public readonly classId: string,
    public readonly className: string,
    public readonly sessionIds: string[],
    public readonly reason: string,
    public readonly createdAt: Date,
  ) {}
}

export class LeaveRequestApprovedEvent {
  constructor(
    public readonly leaveRequestId: string,
    public readonly studentId: string,
    public readonly classId: string,
    public readonly sessionIds: string[],
    public readonly reviewerId: string,
    public readonly reviewerComment: string | null,
    public readonly approvedAt: Date,
  ) {}
}

export class LeaveRequestRejectedEvent {
  constructor(
    public readonly leaveRequestId: string,
    public readonly studentId: string,
    public readonly classId: string,
    public readonly reviewerId: string,
    public readonly reviewerComment: string,
    public readonly rejectedAt: Date,
  ) {}
}
