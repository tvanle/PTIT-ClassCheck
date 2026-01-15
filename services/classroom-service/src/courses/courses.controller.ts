import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CoursesService } from './courses.service';

class CreateCourseDto {
  code: string;
  name: string;
  credits?: number;
  description?: string;
}

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  async create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }

  @Get()
  async findAll() {
    return this.coursesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.coursesService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateData: Partial<CreateCourseDto>) {
    return this.coursesService.update(id, updateData);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.coursesService.delete(id);
    return { message: 'Course deleted successfully' };
  }

  @MessagePattern({ cmd: 'get_course' })
  async getCourse(@Payload() data: { courseId: string }) {
    return this.coursesService.findById(data.courseId);
  }
}
