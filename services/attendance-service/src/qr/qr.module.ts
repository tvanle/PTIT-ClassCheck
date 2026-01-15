import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QrService } from './qr.service';
import { QrController } from './qr.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
