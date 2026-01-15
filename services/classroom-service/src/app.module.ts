import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CoursesModule } from './courses/courses.module';
import { ClassesModule } from './classes/classes.module';
import { SessionsModule } from './sessions/sessions.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { Course } from './courses/entities/course.entity';
import { Class } from './classes/entities/class.entity';
import { Session } from './sessions/entities/session.entity';
import { Enrollment } from './enrollments/entities/enrollment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'classroom_db',
        entities: [Course, Class, Session, Enrollment],
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
    ClientsModule.registerAsync([
      {
        name: 'IDENTITY_SERVICE',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
            queue: 'identity_queue',
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
    ]),
    CoursesModule,
    ClassesModule,
    SessionsModule,
    EnrollmentsModule,
  ],
})
export class AppModule {}
