import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';

interface CreateCourseDto {
  code: string;
  name: string;
  credits?: number;
  description?: string;
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
  ) {}

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    const existing = await this.coursesRepository.findOne({
      where: { code: createCourseDto.code },
    });

    if (existing) {
      throw new ConflictException('Course code already exists');
    }

    const course = this.coursesRepository.create(createCourseDto);
    return this.coursesRepository.save(course);
  }

  async findAll(): Promise<Course[]> {
    return this.coursesRepository.find({
      order: { code: 'ASC' },
    });
  }

  async findById(id: string): Promise<Course> {
    const course = await this.coursesRepository.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }

  async findByCode(code: string): Promise<Course> {
    const course = await this.coursesRepository.findOne({ where: { code } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }

  async update(id: string, updateData: Partial<CreateCourseDto>): Promise<Course> {
    const course = await this.findById(id);
    Object.assign(course, updateData);
    return this.coursesRepository.save(course);
  }

  async delete(id: string): Promise<void> {
    const result = await this.coursesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Course not found');
    }
  }
}
