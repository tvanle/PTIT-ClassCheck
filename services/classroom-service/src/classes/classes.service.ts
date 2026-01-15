import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from './entities/class.entity';
import { CoursesService } from '../courses/courses.service';

interface CreateClassDto {
  courseId: string;
  term: string;
  group: string;
  teacherId: string;
  room?: string;
  schedule?: string;
}

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private classesRepository: Repository<Class>,
    private coursesService: CoursesService,
  ) {}

  async create(createClassDto: CreateClassDto): Promise<Class> {
    // Verify course exists
    await this.coursesService.findById(createClassDto.courseId);

    const cls = this.classesRepository.create(createClassDto);
    const savedClass = await this.classesRepository.save(cls);

    return this.findById(savedClass.id);
  }

  async findAll(term?: string, teacherId?: string): Promise<Class[]> {
    const query = this.classesRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.course', 'course')
      .leftJoinAndSelect('class.enrollments', 'enrollments');

    if (term) {
      query.andWhere('class.term = :term', { term });
    }

    if (teacherId) {
      query.andWhere('class.teacherId = :teacherId', { teacherId });
    }

    return query.orderBy('course.code', 'ASC').getMany();
  }

  async findById(id: string): Promise<Class> {
    const cls = await this.classesRepository.findOne({
      where: { id },
      relations: ['course', 'enrollments', 'sessions'],
    });

    if (!cls) {
      throw new NotFoundException('Class not found');
    }

    return cls;
  }

  async findByTeacher(teacherId: string, term?: string): Promise<Class[]> {
    const query = this.classesRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.course', 'course')
      .where('class.teacherId = :teacherId', { teacherId });

    if (term) {
      query.andWhere('class.term = :term', { term });
    }

    return query.getMany();
  }

  async findByStudent(studentId: string, term?: string): Promise<Class[]> {
    const query = this.classesRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.course', 'course')
      .innerJoin('class.enrollments', 'enrollment')
      .where('enrollment.studentId = :studentId', { studentId })
      .andWhere('enrollment.status = :status', { status: 'active' });

    if (term) {
      query.andWhere('class.term = :term', { term });
    }

    return query.getMany();
  }

  async update(id: string, updateData: Partial<CreateClassDto>): Promise<Class> {
    const cls = await this.findById(id);
    Object.assign(cls, updateData);
    await this.classesRepository.save(cls);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const result = await this.classesRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Class not found');
    }
  }

  async getStudentCount(classId: string): Promise<number> {
    const cls = await this.classesRepository.findOne({
      where: { id: classId },
      relations: ['enrollments'],
    });

    if (!cls) {
      throw new NotFoundException('Class not found');
    }

    return cls.enrollments.filter((e) => e.status === 'active').length;
  }
}
