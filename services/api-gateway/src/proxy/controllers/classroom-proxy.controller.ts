import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProxyService, ServiceName } from '../proxy.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ClassroomProxyController {
  constructor(private proxyService: ProxyService) {}

  // Courses
  @Get('courses')
  async getCourses(@Request() req: any) {
    return this.proxyService.get(ServiceName.CLASSROOM, '/courses', {
      Authorization: req.headers.authorization,
    });
  }

  @Post('courses')
  async createCourse(@Body() body: any, @Request() req: any) {
    return this.proxyService.post(ServiceName.CLASSROOM, '/courses', body, {
      Authorization: req.headers.authorization,
    });
  }

  @Get('courses/:id')
  async getCourse(@Param('id') id: string, @Request() req: any) {
    return this.proxyService.get(ServiceName.CLASSROOM, `/courses/${id}`, {
      Authorization: req.headers.authorization,
    });
  }

  // Classes
  @Get('classes')
  async getClasses(
    @Query('term') term: string,
    @Query('teacherId') teacherId: string,
    @Request() req: any,
  ) {
    let path = '/classes';
    const params = [];
    if (term) params.push(`term=${term}`);
    if (teacherId) params.push(`teacherId=${teacherId}`);
    if (params.length) path += `?${params.join('&')}`;

    return this.proxyService.get(ServiceName.CLASSROOM, path, {
      Authorization: req.headers.authorization,
    });
  }

  @Post('classes')
  async createClass(@Body() body: any, @Request() req: any) {
    return this.proxyService.post(ServiceName.CLASSROOM, '/classes', body, {
      Authorization: req.headers.authorization,
    });
  }

  @Get('classes/:id')
  async getClass(@Param('id') id: string, @Request() req: any) {
    return this.proxyService.get(ServiceName.CLASSROOM, `/classes/${id}`, {
      Authorization: req.headers.authorization,
    });
  }

  @Get('classes/teacher/:teacherId')
  async getClassesByTeacher(
    @Param('teacherId') teacherId: string,
    @Query('term') term: string,
    @Request() req: any,
  ) {
    let path = `/classes/teacher/${teacherId}`;
    if (term) path += `?term=${term}`;
    return this.proxyService.get(ServiceName.CLASSROOM, path, {
      Authorization: req.headers.authorization,
    });
  }

  @Get('classes/student/:studentId')
  async getClassesByStudent(
    @Param('studentId') studentId: string,
    @Query('term') term: string,
    @Request() req: any,
  ) {
    let path = `/classes/student/${studentId}`;
    if (term) path += `?term=${term}`;
    return this.proxyService.get(ServiceName.CLASSROOM, path, {
      Authorization: req.headers.authorization,
    });
  }

  // Sessions
  @Get('classes/:classId/sessions')
  async getSessions(@Param('classId') classId: string, @Request() req: any) {
    return this.proxyService.get(ServiceName.CLASSROOM, `/classes/${classId}/sessions`, {
      Authorization: req.headers.authorization,
    });
  }

  @Post('classes/:classId/sessions')
  async createSession(
    @Param('classId') classId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.proxyService.post(ServiceName.CLASSROOM, `/classes/${classId}/sessions`, body, {
      Authorization: req.headers.authorization,
    });
  }

  // Enrollments
  @Get('classes/:classId/enrollments')
  async getEnrollments(@Param('classId') classId: string, @Request() req: any) {
    return this.proxyService.get(ServiceName.CLASSROOM, `/classes/${classId}/enrollments`, {
      Authorization: req.headers.authorization,
    });
  }

  @Post('classes/:classId/enrollments')
  async enrollStudent(
    @Param('classId') classId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.proxyService.post(ServiceName.CLASSROOM, `/classes/${classId}/enrollments`, body, {
      Authorization: req.headers.authorization,
    });
  }

  @Post('classes/:classId/enrollments/bulk')
  async enrollBulk(
    @Param('classId') classId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.proxyService.post(ServiceName.CLASSROOM, `/classes/${classId}/enrollments/bulk`, body, {
      Authorization: req.headers.authorization,
    });
  }
}
