import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import { DevicesService } from './devices.service';

class RegisterDeviceDto {
  deviceId: string;
  deviceName?: string;
  os?: string;
  osVersion?: string;
}

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  async register(@Body() dto: RegisterDeviceDto, @Request() req: any) {
    const studentId = req.user?.id;
    return this.devicesService.register({ ...dto, studentId });
  }

  @Get('my-devices')
  async getMyDevices(@Request() req: any) {
    const studentId = req.user?.id;
    return this.devicesService.getStudentDevices(studentId);
  }

  @Get('students/:studentId')
  async getStudentDevices(@Param('studentId') studentId: string) {
    return this.devicesService.getStudentDevices(studentId);
  }

  @Patch(':deviceId/block')
  async blockDevice(@Param('deviceId') deviceId: string) {
    return this.devicesService.blockDevice(deviceId);
  }

  @Patch(':deviceId/unblock')
  async unblockDevice(@Param('deviceId') deviceId: string) {
    return this.devicesService.unblockDevice(deviceId);
  }

  @Delete(':deviceId')
  async removeDevice(@Param('deviceId') deviceId: string, @Request() req: any) {
    const studentId = req.user?.id;
    await this.devicesService.removeDevice(studentId, deviceId);
    return { message: 'Device removed successfully' };
  }
}
