import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AttendanceSessionsModule } from './attendance-sessions/attendance-sessions.module';
import { AttendanceRecordsModule } from './attendance-records/attendance-records.module';
import { QrModule } from './qr/qr.module';
import { AttendanceSession } from './attendance-sessions/entities/attendance-session.entity';
import { AttendanceRecord } from './attendance-records/entities/attendance-record.entity';
import { DeviceRegistration } from './devices/entities/device-registration.entity';
import { DevicesModule } from './devices/devices.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'attendance_db',
        entities: [AttendanceSession, AttendanceRecord, DeviceRegistration],
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
    ClientsModule.registerAsync([
      {
        name: 'CLASSROOM_SERVICE',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
            queue: 'classroom_queue',
            queueOptions: { durable: true },
          },
        }),
      },
      {
        name: 'NOTIFICATION_SERVICE',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
            queue: 'notification_queue',
            queueOptions: { durable: true },
          },
        }),
      },
      {
        name: 'REPORTING_SERVICE',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
            queue: 'reporting_queue',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
    AttendanceSessionsModule,
    AttendanceRecordsModule,
    QrModule,
    DevicesModule,
    WebsocketModule,
  ],
})
export class AppModule {}
