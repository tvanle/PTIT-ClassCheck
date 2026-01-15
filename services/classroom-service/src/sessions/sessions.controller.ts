import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Patch,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SessionsService } from './sessions.service';

class CreateSessionDto {
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
  room?: string;
  sessionNo?: number;
}

class BulkCreateSessionDto {
  sessions: Omit<CreateSessionDto, 'classId'>[];
}

@Controller('classes/:classId/sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async create(
    @Param('classId') classId: string,
    @Body() createSessionDto: Omit<CreateSessionDto, 'classId'>,
  ) {
    return this.sessionsService.create({ ...createSessionDto, classId });
  }

  @Post('bulk')
  async createBulk(
    @Param('classId') classId: string,
    @Body() bulkDto: BulkCreateSessionDto,
  ) {
    return this.sessionsService.createBulk(classId, bulkDto.sessions);
  }

  @Get()
  async findByClass(@Param('classId') classId: string) {
    return this.sessionsService.findByClass(classId);
  }

  @Get('today')
  async findToday(@Query('teacherId') teacherId?: string) {
    return this.sessionsService.findTodaySessions(teacherId);
  }

  @Get('range')
  async findByDateRange(
    @Param('classId') classId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.sessionsService.findByDateRange(classId, startDate, endDate);
  }

  @Get(':sessionId')
  async findOne(@Param('sessionId') sessionId: string) {
    return this.sessionsService.findById(sessionId);
  }

  @Put(':sessionId')
  async update(
    @Param('sessionId') sessionId: string,
    @Body() updateData: Partial<CreateSessionDto>,
  ) {
    return this.sessionsService.update(sessionId, updateData);
  }

  @Patch(':sessionId/cancel')
  async cancel(
    @Param('sessionId') sessionId: string,
    @Body() body: { reason?: string },
  ) {
    return this.sessionsService.cancel(sessionId, body.reason);
  }

  @Delete(':sessionId')
  async delete(@Param('sessionId') sessionId: string) {
    await this.sessionsService.delete(sessionId);
    return { message: 'Session deleted successfully' };
  }

  // Microservice message patterns
  @MessagePattern({ cmd: 'get_session' })
  async getSession(@Payload() data: { sessionId: string }) {
    return this.sessionsService.findById(data.sessionId);
  }

  @MessagePattern({ cmd: 'get_sessions_by_class' })
  async getSessionsByClass(@Payload() data: { classId: string }) {
    return this.sessionsService.findByClass(data.classId);
  }

  @MessagePattern({ cmd: 'get_sessions_by_ids' })
  async getSessionsByIds(@Payload() data: { sessionIds: string[] }) {
    const sessions = await Promise.all(
      data.sessionIds.map((id) => this.sessionsService.findById(id).catch(() => null)),
    );
    return sessions.filter(Boolean);
  }
}
