import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Session } from './entities/session.entity';
import { ClassesService } from '../classes/classes.service';

interface CreateSessionDto {
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
  room?: string;
  sessionNo?: number;
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    private classesService: ClassesService,
  ) {}

  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    await this.classesService.findById(createSessionDto.classId);

    // Auto-assign session number if not provided
    let sessionNo = createSessionDto.sessionNo;
    if (!sessionNo) {
      const lastSession = await this.sessionsRepository.findOne({
        where: { classId: createSessionDto.classId },
        order: { sessionNo: 'DESC' },
      });
      sessionNo = lastSession ? lastSession.sessionNo + 1 : 1;
    }

    const session = this.sessionsRepository.create({
      ...createSessionDto,
      sessionNo,
    });

    return this.sessionsRepository.save(session);
  }

  async createBulk(classId: string, sessions: Omit<CreateSessionDto, 'classId'>[]): Promise<Session[]> {
    await this.classesService.findById(classId);

    const existingSessions = await this.sessionsRepository.count({
      where: { classId },
    });

    const sessionsToCreate = sessions.map((s, index) => ({
      ...s,
      classId,
      sessionNo: s.sessionNo || existingSessions + index + 1,
    }));

    const entities = this.sessionsRepository.create(sessionsToCreate);
    return this.sessionsRepository.save(entities);
  }

  async findByClass(classId: string): Promise<Session[]> {
    return this.sessionsRepository.find({
      where: { classId },
      order: { sessionNo: 'ASC' },
    });
  }

  async findById(id: string): Promise<Session> {
    const session = await this.sessionsRepository.findOne({
      where: { id },
      relations: ['class', 'class.course'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async findByDate(classId: string, date: string): Promise<Session[]> {
    return this.sessionsRepository.find({
      where: { classId, date },
      order: { startTime: 'ASC' },
    });
  }

  async findByDateRange(
    classId: string,
    startDate: string,
    endDate: string,
  ): Promise<Session[]> {
    return this.sessionsRepository.find({
      where: {
        classId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }

  async findTodaySessions(teacherId?: string): Promise<Session[]> {
    const today = new Date().toISOString().split('T')[0];

    const query = this.sessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.class', 'class')
      .leftJoinAndSelect('class.course', 'course')
      .where('session.date = :today', { today })
      .andWhere('session.cancelled = :cancelled', { cancelled: false });

    if (teacherId) {
      query.andWhere('class.teacherId = :teacherId', { teacherId });
    }

    return query.orderBy('session.startTime', 'ASC').getMany();
  }

  async update(id: string, updateData: Partial<CreateSessionDto>): Promise<Session> {
    const session = await this.findById(id);
    Object.assign(session, updateData);
    return this.sessionsRepository.save(session);
  }

  async cancel(id: string, reason?: string): Promise<Session> {
    const session = await this.findById(id);
    session.cancelled = true;
    session.cancelReason = reason;
    return this.sessionsRepository.save(session);
  }

  async delete(id: string): Promise<void> {
    const result = await this.sessionsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Session not found');
    }
  }
}
