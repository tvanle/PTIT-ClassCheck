import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveRequestStatus } from './entities/leave-request.entity';

class CreateLeaveRequestDto {
  classId: string;
  sessionIds: string[];
  reason: string;
  attachmentUrl?: string;
}

class ReviewDto {
  comment?: string;
}

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Post()
  async create(@Body() dto: CreateLeaveRequestDto, @Request() req: any) {
    const studentId = req.user?.id;
    return this.leaveRequestsService.create(studentId, dto);
  }

  @Get()
  async findAll(
    @Query('classId') classId?: string,
    @Query('status') status?: LeaveRequestStatus,
  ) {
    if (classId) {
      return this.leaveRequestsService.findByClass(classId, status);
    }
    throw new Error('classId is required');
  }

  @Get('my-requests')
  async findMyRequests(@Request() req: any) {
    const studentId = req.user?.id;
    return this.leaveRequestsService.findByStudent(studentId);
  }

  @Get('class/:classId/pending')
  async findPending(@Param('classId') classId: string) {
    return this.leaveRequestsService.findPendingByClass(classId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.leaveRequestsService.findById(id);
  }

  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() dto: ReviewDto,
    @Request() req: any,
  ) {
    const reviewerId = req.user?.id || 'system';
    return this.leaveRequestsService.approve(id, reviewerId, dto);
  }

  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() dto: ReviewDto,
    @Request() req: any,
  ) {
    const reviewerId = req.user?.id || 'system';
    return this.leaveRequestsService.reject(id, reviewerId, dto);
  }

  @Delete(':id')
  async cancel(@Param('id') id: string, @Request() req: any) {
    const studentId = req.user?.id;
    await this.leaveRequestsService.cancel(id, studentId);
    return { message: 'Leave request cancelled' };
  }

  // Microservice message patterns
  @MessagePattern({ cmd: 'get_leave_request' })
  async getLeaveRequest(@Payload() data: { id: string }) {
    return this.leaveRequestsService.findById(data.id);
  }

  @MessagePattern({ cmd: 'get_leave_requests_by_student' })
  async getByStudent(@Payload() data: { studentId: string }) {
    return this.leaveRequestsService.findByStudent(data.studentId);
  }

  @MessagePattern({ cmd: 'get_leave_requests_by_class' })
  async getByClass(
    @Payload() data: { classId: string; status?: LeaveRequestStatus },
  ) {
    return this.leaveRequestsService.findByClass(data.classId, data.status);
  }
}
