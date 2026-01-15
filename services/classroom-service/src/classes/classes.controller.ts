import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ClassesService } from './classes.service';

class CreateClassDto {
  courseId: string;
  term: string;
  group: string;
  teacherId: string;
  room?: string;
  schedule?: string;
}

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  async create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  async findAll(
    @Query('term') term?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return this.classesService.findAll(term, teacherId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.classesService.findById(id);
  }

  @Get('teacher/:teacherId')
  async findByTeacher(
    @Param('teacherId') teacherId: string,
    @Query('term') term?: string,
  ) {
    return this.classesService.findByTeacher(teacherId, term);
  }

  @Get('student/:studentId')
  async findByStudent(
    @Param('studentId') studentId: string,
    @Query('term') term?: string,
  ) {
    return this.classesService.findByStudent(studentId, term);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateData: Partial<CreateClassDto>) {
    return this.classesService.update(id, updateData);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.classesService.delete(id);
    return { message: 'Class deleted successfully' };
  }

  // Microservice message patterns
  @MessagePattern({ cmd: 'get_class' })
  async getClass(@Payload() data: { classId: string }) {
    return this.classesService.findById(data.classId);
  }

  @MessagePattern({ cmd: 'get_classes_by_teacher' })
  async getClassesByTeacher(@Payload() data: { teacherId: string; term?: string }) {
    return this.classesService.findByTeacher(data.teacherId, data.term);
  }

  @MessagePattern({ cmd: 'get_classes_by_student' })
  async getClassesByStudent(@Payload() data: { studentId: string; term?: string }) {
    return this.classesService.findByStudent(data.studentId, data.term);
  }

  @MessagePattern({ cmd: 'get_student_count' })
  async getStudentCount(@Payload() data: { classId: string }) {
    return this.classesService.getStudentCount(data.classId);
  }
}
