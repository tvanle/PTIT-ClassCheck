import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitMQService } from './rabbitmq.service';

interface RabbitMQModuleOptions {
  name: string;
  queue: string;
}

@Module({})
export class RabbitMQModule {
  static forRoot(options: RabbitMQModuleOptions): DynamicModule {
    return {
      module: RabbitMQModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name: options.name,
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
              transport: Transport.RMQ,
              options: {
                urls: [
                  configService.get<string>(
                    'RABBITMQ_URL',
                    'amqp://guest:guest@localhost:5672',
                  ),
                ],
                queue: options.queue,
                queueOptions: {
                  durable: true,
                },
              },
            }),
            inject: [ConfigService],
          },
        ]),
      ],
      providers: [RabbitMQService],
      exports: [ClientsModule, RabbitMQService],
    };
  }

  static forRootAsync(): DynamicModule {
    return {
      module: RabbitMQModule,
      imports: [ConfigModule],
      providers: [RabbitMQService],
      exports: [RabbitMQService],
    };
  }
}
