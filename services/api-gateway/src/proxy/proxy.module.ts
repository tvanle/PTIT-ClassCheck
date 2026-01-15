import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProxyService } from './proxy.service';
import { AuthProxyController } from './controllers/auth-proxy.controller';
import { ClassroomProxyController } from './controllers/classroom-proxy.controller';
import { AttendanceProxyController } from './controllers/attendance-proxy.controller';
import { LeaveProxyController } from './controllers/leave-proxy.controller';
import { ReportsProxyController } from './controllers/reports-proxy.controller';

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [
    AuthProxyController,
    ClassroomProxyController,
    AttendanceProxyController,
    LeaveProxyController,
    ReportsProxyController,
  ],
  providers: [ProxyService],
  exports: [ProxyService],
})
export class ProxyModule {}
