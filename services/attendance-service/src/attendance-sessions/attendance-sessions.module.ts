import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AttendanceSessionsService } from './attendance-sessions.service';
import { AttendanceSessionsController } from './attendance-sessions.controller';
import { AttendanceSession } from './entities/attendance-session.entity';
import { QrModule } from '../qr/qr.module';
import { AttendanceRecordsModule } from '../attendance-records/attendance-records.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceSession]),
    ScheduleModule,
    QrModule,
    forwardRef(() => AttendanceRecordsModule),
    forwardRef(() => WebsocketModule),
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
    ]),
  ],
  controllers: [AttendanceSessionsController],
  providers: [AttendanceSessionsService],
  exports: [AttendanceSessionsService],
})
export class AttendanceSessionsModule {}
