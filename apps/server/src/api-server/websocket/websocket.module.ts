import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { WebsocketBootstrapService } from './websocket-bootstrap.service';
import { AuthModule } from '../../auth/auth.module';
import { QueueModule } from '../../shared/queue/queue.module';

@Module({
  imports: [AuthModule, QueueModule],
  providers: [RealtimeGateway, WebsocketBootstrapService],
  exports: [RealtimeGateway],
})
export class WebsocketModule {}

