import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { SummariesModule } from '../summaries/summaries.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [SummariesModule, AlertsModule],
  controllers: [ReportsController],
})
export class ReportsModule {}
