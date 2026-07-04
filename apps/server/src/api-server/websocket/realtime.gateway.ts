import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SessionService } from '../../auth/session.service';
import { RbacService } from '../../auth/rbac.service';

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_URL || process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private readonly socketUsers = new Map<string, string>(); // socketId -> userId

  constructor(
    private sessionService: SessionService,
    private rbacService: RbacService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const cookieToken = this.extractSessionTokenFromCookies(client.handshake.headers.cookie);
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        cookieToken;
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Validate session
      const session = await this.sessionService.validateSession(token as string);
      if (!session) {
        this.logger.warn(`Client ${client.id} connected with invalid token`);
        client.disconnect();
        return;
      }

      // Store user-socket mapping
      if (!this.userSockets.has(session.botUserId)) {
        this.userSockets.set(session.botUserId, new Set());
      }
      this.userSockets.get(session.botUserId)!.add(client.id);
      this.socketUsers.set(client.id, session.botUserId);

      // Attach userId to socket for later use
      (client as any).userId = session.botUserId;

      this.logger.log(`Client ${client.id} connected (User: ${session.botUserId})`);
    } catch (error) {
      this.logger.error(`Error handling connection for ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.socketUsers.delete(client.id);
    }
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('subscribe_guild')
  async handleSubscribeGuild(
    @ConnectedSocket() client: Socket,
    @MessageBody() guildId: string,
  ) {
    const userId = (client as any).userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    if (!guildId || typeof guildId !== 'string') {
      return { error: 'Invalid guild id' };
    }

    const allowed = await this.rbacService.hasGuildAccess(userId, guildId);
    if (!allowed) {
      this.logger.warn(`User ${userId} denied subscribe to guild ${guildId}`);
      return { error: 'Forbidden' };
    }

    client.join(`guild:${guildId}`);
    this.logger.log(`User ${userId} subscribed to guild ${guildId}`);

    return { success: true, guildId };
  }

  @SubscribeMessage('unsubscribe_guild')
  async handleUnsubscribeGuild(
    @ConnectedSocket() client: Socket,
    @MessageBody() guildId: string,
  ) {
    const userId = (client as any).userId;
    if (!userId || !guildId || typeof guildId !== 'string') {
      return { error: 'Unauthorized' };
    }

    const allowed = await this.rbacService.hasGuildAccess(userId, guildId);
    if (!allowed) {
      return { error: 'Forbidden' };
    }

    client.leave(`guild:${guildId}`);
    return { success: true, guildId };
  }

  // Broadcast methods for other services to use
  broadcastIncident(guildId: string, incident: any) {
    this.server.to(`guild:${guildId}`).emit('incident_created', incident);
  }

  broadcastIncidentUpdate(guildId: string, incidentId: string, update: any) {
    this.server.to(`guild:${guildId}`).emit('incident_updated', {
      incidentId,
      ...update,
    });
  }

  broadcastActionQueued(guildId: string, action: any) {
    this.server.to(`guild:${guildId}`).emit('action_queued', action);
  }

  broadcastActionCompleted(guildId: string, actionId: string, result: any) {
    this.server.to(`guild:${guildId}`).emit('action_completed', {
      actionId,
      ...result,
    });
  }

  broadcastTrustScoreUpdate(guildId: string, userId: string, trustScore: number) {
    this.server.to(`guild:${guildId}`).emit('trust_score_updated', {
      userId,
      trustScore,
    });
  }

  // Broadcast to specific user
  broadcastToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }

  private extractSessionTokenFromCookies(cookieHeader?: string): string | null {
    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
      const [rawKey, ...rawValue] = part.trim().split('=');
      if (!rawKey) {
        return acc;
      }
      acc[rawKey] = decodeURIComponent(rawValue.join('='));
      return acc;
    }, {});

    return cookies.session_token || null;
  }
}


