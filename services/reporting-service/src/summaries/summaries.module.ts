import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SummariesService } from './summaries.service';
import { AttendanceSummary } from './entities/attendance-summary.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceSummary])],
  providers: [SummariesService],
  exports: [SummariesService],
})
export class SummariesModule {}
