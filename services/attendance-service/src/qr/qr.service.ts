import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';

interface QrTokenData {
  attendanceSessionId: string;
  classId: string;
  sessionId: string;
  createdAt: number;
  expiresAt: number;
}

@Injectable()
export class QrService {
  private redis: Redis;
  private readonly QR_TOKEN_PREFIX = 'qr_token:';
  private readonly QR_SESSION_PREFIX = 'qr_session:';

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      password: configService.get<string>('REDIS_PASSWORD', ''),
    });
  }

  async generateToken(
    attendanceSessionId: string,
    classId: string,
    sessionId: string,
    rotationSeconds: number = 15,
  ): Promise<string> {
    const token = uuidv4();
    const now = Date.now();
    const expiresAt = now + rotationSeconds * 1000;

    const tokenData: QrTokenData = {
      attendanceSessionId,
      classId,
      sessionId,
      createdAt: now,
      expiresAt,
    };

    // Store token with expiration
    await this.redis.setex(
      `${this.QR_TOKEN_PREFIX}${token}`,
      rotationSeconds + 5, // Add 5 seconds buffer
      JSON.stringify(tokenData),
    );

    // Store current token for the session
    await this.redis.set(
      `${this.QR_SESSION_PREFIX}${attendanceSessionId}`,
      token,
    );

    return token;
  }

  async validateToken(token: string): Promise<QrTokenData | null> {
    const data = await this.redis.get(`${this.QR_TOKEN_PREFIX}${token}`);

    if (!data) {
      return null;
    }

    const tokenData: QrTokenData = JSON.parse(data);

    // Check if expired
    if (Date.now() > tokenData.expiresAt) {
      return null;
    }

    return tokenData;
  }

  async getCurrentToken(attendanceSessionId: string): Promise<string | null> {
    return this.redis.get(`${this.QR_SESSION_PREFIX}${attendanceSessionId}`);
  }

  async generateQrCode(token: string, baseUrl: string): Promise<string> {
    const checkinUrl = `${baseUrl}/checkin?token=${token}`;

    try {
      const qrDataUrl = await QRCode.toDataURL(checkinUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 300,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      return qrDataUrl;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  async invalidateSession(attendanceSessionId: string): Promise<void> {
    const currentToken = await this.getCurrentToken(attendanceSessionId);

    if (currentToken) {
      await this.redis.del(`${this.QR_TOKEN_PREFIX}${currentToken}`);
    }

    await this.redis.del(`${this.QR_SESSION_PREFIX}${attendanceSessionId}`);
  }

  async rotateToken(
    attendanceSessionId: string,
    classId: string,
    sessionId: string,
    rotationSeconds: number,
  ): Promise<string> {
    // Invalidate current token
    const currentToken = await this.getCurrentToken(attendanceSessionId);
    if (currentToken) {
      await this.redis.del(`${this.QR_TOKEN_PREFIX}${currentToken}`);
    }

    // Generate new token
    return this.generateToken(
      attendanceSessionId,
      classId,
      sessionId,
      rotationSeconds,
    );
  }
}
