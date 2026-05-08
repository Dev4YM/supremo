import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { DebugService } from './debug.service';

@Injectable()
export class DebugInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DebugInterceptor.name);

  constructor(private readonly debugService: DebugService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.debugService.isEnabled()) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    const logId = this.debugService.logHttpRequest({
      method: request.method,
      path: request.path,
      query: request.query,
      body: request.body,
      headers: request.headers,
      userId: (request as any).botUserId,
      guildId: (request as any).guildId,
      ip: request.ip,
      userAgent: request.get('user-agent'),
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        this.debugService.logHttpResponse(logId, {
          statusCode: response.statusCode,
          body: data,
          duration,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.debugService.logHttpResponse(logId, {
          statusCode: error.status || 500,
          body: error.response || error.message,
          duration,
          error,
        });
        throw error;
      }),
    );
  }
}

