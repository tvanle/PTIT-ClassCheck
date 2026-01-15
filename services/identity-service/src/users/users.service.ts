import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { Profile } from './entities/profile.entity';

interface CreateUserDto {
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
  studentCode?: string;
  teacherCode?: string;
  phone?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Profile)
    private profilesRepository: Repository<Profile>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(createUserDto.password, salt);

    const user = this.usersRepository.create({
      email: createUserDto.email,
      passwordHash,
      role: createUserDto.role,
      status: UserStatus.ACTIVE,
    });

    const savedUser = await this.usersRepository.save(user);

    const profile = this.profilesRepository.create({
      userId: savedUser.id,
      fullName: createUserDto.fullName,
      studentCode: createUserDto.studentCode,
      teacherCode: createUserDto.teacherCode,
      phone: createUserDto.phone,
    });

    await this.profilesRepository.save(profile);

    return this.findById(savedUser.id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['profile'],
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findAll(role?: UserRole): Promise<User[]> {
    const query = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile');

    if (role) {
      query.where('user.role = :role', { role });
    }

    return query.getMany();
  }

  async findByStudentCode(studentCode: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('profile.studentCode = :studentCode', { studentCode })
      .getOne();
  }

  async findByTeacherCode(teacherCode: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('profile.teacherCode = :teacherCode', { teacherCode })
      .getOne();
  }

  async updateProfile(
    userId: string,
    updateData: Partial<Profile>,
  ): Promise<User> {
    const user = await this.findById(userId);

    if (updateData.fullName) user.profile.fullName = updateData.fullName;
    if (updateData.phone) user.profile.phone = updateData.phone;
    if (updateData.avatarUrl) user.profile.avatarUrl = updateData.avatarUrl;

    await this.profilesRepository.save(user.profile);
    return this.findById(userId);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await this.usersRepository.update(userId, { passwordHash });
  }

  async deactivate(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { status: UserStatus.INACTIVE });
  }

  async activate(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { status: UserStatus.ACTIVE });
  }
}
