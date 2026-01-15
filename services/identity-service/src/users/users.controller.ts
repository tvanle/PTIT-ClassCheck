import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Request() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async getAllUsers(@Query('role') role?: UserRole) {
    return this.usersService.findAll(role);
  }

  // Microservice message patterns
  @MessagePattern({ cmd: 'get_user' })
  async getUserById(@Payload() data: { userId: string }) {
    return this.usersService.findById(data.userId);
  }

  @MessagePattern({ cmd: 'get_user_by_email' })
  async getUserByEmail(@Payload() data: { email: string }) {
    return this.usersService.findByEmail(data.email);
  }

  @MessagePattern({ cmd: 'get_users_by_ids' })
  async getUsersByIds(@Payload() data: { userIds: string[] }) {
    const users = await Promise.all(
      data.userIds.map((id) => this.usersService.findById(id).catch(() => null)),
    );
    return users.filter(Boolean);
  }

  @MessagePattern({ cmd: 'validate_user' })
  async validateUser(@Payload() data: { userId: string }) {
    try {
      const user = await this.usersService.findById(data.userId);
      return { valid: true, user };
    } catch {
      return { valid: false, user: null };
    }
  }
}
