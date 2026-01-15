import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProxyService, ServiceName } from '../proxy.service';
import { Public } from '../../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('auth')
export class AuthProxyController {
  constructor(private proxyService: ProxyService) {}

  @Public()
  @Post('register')
  async register(@Body() body: any) {
    return this.proxyService.post(ServiceName.IDENTITY, '/auth/register', body);
  }

  @Public()
  @Post('login')
  async login(@Body() body: any) {
    return this.proxyService.post(ServiceName.IDENTITY, '/auth/login', body);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: any) {
    return this.proxyService.post(ServiceName.IDENTITY, '/auth/refresh', body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req: any, @Body() body: any) {
    return this.proxyService.post(ServiceName.IDENTITY, '/auth/logout', body, {
      Authorization: req.headers.authorization,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    return this.proxyService.get(ServiceName.IDENTITY, '/users/me', {
      Authorization: req.headers.authorization,
    });
  }
}
