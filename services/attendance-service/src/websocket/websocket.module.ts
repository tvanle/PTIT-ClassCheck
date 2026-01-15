import { Module, forwardRef } from '@nestjs/common';
import { AttendanceGateway } from './attendance.gateway';
import { AttendanceSessionsModule } from '../attendance-sessions/attendance-sessions.module';

@Module({
  imports: [forwardRef(() => AttendanceSessionsModule)],
  providers: [AttendanceGateway],
  exports: [AttendanceGateway],
})
export class WebsocketModule {}
