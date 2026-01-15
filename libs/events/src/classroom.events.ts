export class EnrollmentImportedEvent {
  constructor(
    public readonly classId: string,
    public readonly className: string,
    public readonly totalStudents: number,
    public readonly studentIds: string[],
    public readonly importedAt: Date,
  ) {}
}

export class SessionCreatedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly classId: string,
    public readonly date: string,
    public readonly startTime: string,
    public readonly endTime: string,
    public readonly sessionNo: number,
  ) {}
}

export class ClassCreatedEvent {
  constructor(
    public readonly classId: string,
    public readonly courseCode: string,
    public readonly courseName: string,
    public readonly term: string,
    public readonly group: string,
    public readonly teacherId: string,
  ) {}
}
