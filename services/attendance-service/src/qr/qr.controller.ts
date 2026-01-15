import { Controller, Get, Param, Query } from '@nestjs/common';
import { QrService } from './qr.service';
import { ConfigService } from '@nestjs/config';

@Controller('qr')
export class QrController {
  constructor(
    private readonly qrService: QrService,
    private readonly configService: ConfigService,
  ) {}

  @Get('validate/:token')
  async validateToken(@Param('token') token: string) {
    const tokenData = await this.qrService.validateToken(token);

    if (!tokenData) {
      return { valid: false, message: 'Token expired or invalid' };
    }

    return {
      valid: true,
      attendanceSessionId: tokenData.attendanceSessionId,
      classId: tokenData.classId,
      sessionId: tokenData.sessionId,
    };
  }

  @Get('image/:token')
  async getQrImage(@Param('token') token: string) {
    const baseUrl = this.configService.get<string>(
      'APP_URL',
      'http://localhost:3003',
    );
    const qrDataUrl = await this.qrService.generateQrCode(token, baseUrl);
    return { qrCode: qrDataUrl };
  }
}
