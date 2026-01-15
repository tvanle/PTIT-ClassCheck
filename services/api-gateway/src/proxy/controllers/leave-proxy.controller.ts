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
  UseGuards,
} from '@nestjs/common';
import { ProxyService, ServiceName } from '../proxy.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('leave-requests')
@UseGuards(JwtAuthGuard)
export class LeaveProxyController {
  constructor(private proxyService: ProxyService) {}

  // Create leave request (student)
  @Post()
  async createRequest(@Body() body: any, @Request() req: any) {
    return this.proxyService.post(ServiceName.LEAVE, '/leave-requests', body, {
      Authorization: req.headers.authorization,
    });
  }

  // Get my leave requests (student)
  @Get('my-requests')
  async getMyRequests(@Request() req: any) {
    return this.proxyService.get(ServiceName.LEAVE, '/leave-requests/my-requests', {
      Authorization: req.headers.authorization,
    });
  }

  // Get leave requests by class (teacher)
  @Get()
  async getByClass(
    @Query('classId') classId: string,
    @Query('status') status: string,
    @Request() req: any,
  ) {
    let path = '/leave-requests';
    const params = [];
    if (classId) params.push(`classId=${classId}`);
    if (status) params.push(`status=${status}`);
    if (params.length) path += `?${params.join('&')}`;

    return this.proxyService.get(ServiceName.LEAVE, path, {
      Authorization: req.headers.authorization,
    });
  }

  // Get pending requests for class (teacher)
  @Get('class/:classId/pending')
  async getPending(@Param('classId') classId: string, @Request() req: any) {
    return this.proxyService.get(ServiceName.LEAVE, `/leave-requests/class/${classId}/pending`, {
      Authorization: req.headers.authorization,
    });
  }

  // Get specific request
  @Get(':id')
  async getRequest(@Param('id') id: string, @Request() req: any) {
    return this.proxyService.get(ServiceName.LEAVE, `/leave-requests/${id}`, {
      Authorization: req.headers.authorization,
    });
  }

  // Approve request (teacher)
  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.proxyService.patch(ServiceName.LEAVE, `/leave-requests/${id}/approve`, body, {
      Authorization: req.headers.authorization,
    });
  }

  // Reject request (teacher)
  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.proxyService.patch(ServiceName.LEAVE, `/leave-requests/${id}/reject`, body, {
      Authorization: req.headers.authorization,
    });
  }

  // Cancel request (student)
  @Delete(':id')
  async cancel(@Param('id') id: string, @Request() req: any) {
    return this.proxyService.delete(ServiceName.LEAVE, `/leave-requests/${id}`, {
      Authorization: req.headers.authorization,
    });
  }
}
