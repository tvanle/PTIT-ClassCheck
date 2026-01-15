import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceRegistration, DeviceStatus } from './entities/device-registration.entity';

interface RegisterDeviceDto {
  studentId: string;
  deviceId: string;
  deviceName?: string;
  os?: string;
  osVersion?: string;
}

@Injectable()
export class DevicesService {
  private readonly MAX_DEVICES_PER_STUDENT = 2;

  constructor(
    @InjectRepository(DeviceRegistration)
    private devicesRepository: Repository<DeviceRegistration>,
  ) {}

  async register(dto: RegisterDeviceDto): Promise<DeviceRegistration> {
    // Check if device already registered
    const existingDevice = await this.devicesRepository.findOne({
      where: { deviceId: dto.deviceId },
    });

    if (existingDevice) {
      if (existingDevice.studentId !== dto.studentId) {
        throw new BadRequestException(
          'This device is registered to another student',
        );
      }
      // Return existing if same student
      return existingDevice;
    }

    // Check device limit
    const deviceCount = await this.devicesRepository.count({
      where: { studentId: dto.studentId, status: DeviceStatus.ACTIVE },
    });

    if (deviceCount >= this.MAX_DEVICES_PER_STUDENT) {
      throw new BadRequestException(
        `Maximum ${this.MAX_DEVICES_PER_STUDENT} devices allowed per student`,
      );
    }

    const device = this.devicesRepository.create({
      ...dto,
      status: DeviceStatus.ACTIVE,
    });

    return this.devicesRepository.save(device);
  }

  async validateDevice(studentId: string, deviceId: string): Promise<boolean> {
    const device = await this.devicesRepository.findOne({
      where: {
        studentId,
        deviceId,
        status: DeviceStatus.ACTIVE,
      },
    });

    return !!device;
  }

  async getStudentDevices(studentId: string): Promise<DeviceRegistration[]> {
    return this.devicesRepository.find({
      where: { studentId },
      order: { registeredAt: 'DESC' },
    });
  }

  async blockDevice(deviceId: string): Promise<DeviceRegistration> {
    const device = await this.devicesRepository.findOne({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    device.status = DeviceStatus.BLOCKED;
    return this.devicesRepository.save(device);
  }

  async unblockDevice(deviceId: string): Promise<DeviceRegistration> {
    const device = await this.devicesRepository.findOne({
      where: { deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    device.status = DeviceStatus.ACTIVE;
    return this.devicesRepository.save(device);
  }

  async removeDevice(studentId: string, deviceId: string): Promise<void> {
    const result = await this.devicesRepository.delete({
      studentId,
      deviceId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Device not found');
    }
  }
}
