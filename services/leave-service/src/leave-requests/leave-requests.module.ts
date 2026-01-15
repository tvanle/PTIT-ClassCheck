import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequest } from './entities/leave-request.entity';
import { LeaveSessionMap } from './entities/leave-session-map.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaveRequest, LeaveSessionMap]),
    ClientsModule.registerAsync([
      {
        name: 'ATTENDANCE_SERVICE',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
            queue: 'attendance_queue',
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
  controllers: [LeaveRequestsController],
  providers: [LeaveRequestsService],
  exports: [LeaveRequestsService],
})
export class LeaveRequestsModule {}
