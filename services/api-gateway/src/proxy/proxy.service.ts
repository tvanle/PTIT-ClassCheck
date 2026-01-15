import { Injectable, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';

export enum ServiceName {
  IDENTITY = 'IDENTITY',
  CLASSROOM = 'CLASSROOM',
  ATTENDANCE = 'ATTENDANCE',
  LEAVE = 'LEAVE',
  NOTIFICATION = 'NOTIFICATION',
  REPORTING = 'REPORTING',
}

@Injectable()
export class ProxyService {
  private serviceUrls: Map<ServiceName, string>;

  constructor(private configService: ConfigService) {
    this.serviceUrls = new Map([
      [ServiceName.IDENTITY, configService.get('IDENTITY_SERVICE_URL', 'http://localhost:3001')],
      [ServiceName.CLASSROOM, configService.get('CLASSROOM_SERVICE_URL', 'http://localhost:3002')],
      [ServiceName.ATTENDANCE, configService.get('ATTENDANCE_SERVICE_URL', 'http://localhost:3003')],
      [ServiceName.LEAVE, configService.get('LEAVE_SERVICE_URL', 'http://localhost:3004')],
      [ServiceName.NOTIFICATION, configService.get('NOTIFICATION_SERVICE_URL', 'http://localhost:3005')],
      [ServiceName.REPORTING, configService.get('REPORTING_SERVICE_URL', 'http://localhost:3006')],
    ]);
  }

  async forward(
    service: ServiceName,
    method: string,
    path: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<any> {
    const baseUrl = this.serviceUrls.get(service);
    const url = `${baseUrl}${path}`;

    const config: AxiosRequestConfig = {
      method,
      url,
      data,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || error.message;
        throw new HttpException(
          {
            statusCode: status,
            message,
            error: error.response?.data?.error || 'Service Error',
          },
          status,
        );
      }
      throw error;
    }
  }

  async get(service: ServiceName, path: string, headers?: Record<string, string>): Promise<any> {
    return this.forward(service, 'GET', path, undefined, headers);
  }

  async post(service: ServiceName, path: string, data?: any, headers?: Record<string, string>): Promise<any> {
    return this.forward(service, 'POST', path, data, headers);
  }

  async put(service: ServiceName, path: string, data?: any, headers?: Record<string, string>): Promise<any> {
    return this.forward(service, 'PUT', path, data, headers);
  }

  async patch(service: ServiceName, path: string, data?: any, headers?: Record<string, string>): Promise<any> {
    return this.forward(service, 'PATCH', path, data, headers);
  }

  async delete(service: ServiceName, path: string, headers?: Record<string, string>): Promise<any> {
    return this.forward(service, 'DELETE', path, undefined, headers);
  }
}
