import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { SummariesModule } from '../summaries/summaries.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [SummariesModule, AlertsModule],
  controllers: [EventsController],
})
export class EventsModule {}
