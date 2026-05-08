import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DebugLogEntry {
  id: string;
  timestamp: Date;
  type: 'http' | 'function' | 'database' | 'discord' | 'error';
  category: string;
  method?: string;
  path?: string;
  functionName?: string;
  serviceName?: string;
  parameters?: any;
  result?: any;
  error?: any;
  duration?: number;
  userId?: string;
  guildId?: string;
  ip?: string;
  userAgent?: string;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

export interface DebugSession {
  id: string;
  name: string;
  enabled: boolean;
  filters: {
    types?: string[];
    categories?: string[];
    services?: string[];
    functions?: string[];
    paths?: string[];
    minDuration?: number;
    includeErrors?: boolean;
  };
  startTime: Date;
  endTime?: Date;
  logCount: number;
}

export interface DebugStats {
  totalLogs: number;
  logsByType: Record<string, number>;
  logsByCategory: Record<string, number>;
  averageDuration: number;
  errorCount: number;
  slowestOperations: Array<{
    type: string;
    category: string;
    name: string;
    duration: number;
    timestamp: Date;
  }>;
  recentErrors: Array<{
    id: string;
    timestamp: Date;
    type: string;
    error: string;
    functionName?: string;
    path?: string;
  }>;
}

@Injectable()
export class DebugService {
  private readonly logger = new Logger(DebugService.name);
  private logs: Map<string, DebugLogEntry> = new Map();
  private sessions: Map<string, DebugSession> = new Map();
  private enabled = process.env.DEBUG_MODE === 'true';
  private maxLogs = parseInt(process.env.DEBUG_MAX_LOGS || '10000', 10);
  private logRetentionHours = parseInt(process.env.DEBUG_RETENTION_HOURS || '24', 10);

  constructor(private readonly prisma: PrismaService) {
    if (this.enabled) {
      this.logger.log('🐛 Debug service enabled');
    }
  }

  logHttpRequest(data: {
    method: string;
    path: string;
    query?: any;
    body?: any;
    headers?: any;
    userId?: string;
    guildId?: string;
    ip?: string;
    userAgent?: string;
  }): string {
    if (!this.enabled) return '';
    
    const logId = this.generateLogId();
    const entry: DebugLogEntry = {
      id: logId,
      timestamp: new Date(),
      type: 'http',
      category: 'request',
      method: data.method,
      path: data.path,
      parameters: {
        query: data.query,
        body: data.body,
        headers: this.sanitizeHeaders(data.headers),
      },
      userId: data.userId,
      guildId: data.guildId,
      ip: data.ip,
      userAgent: data.userAgent,
    };

    this.storeLog(entry);
    return logId;
  }

  logHttpResponse(logId: string, data: {
    statusCode: number;
    body?: any;
    duration: number;
    error?: any;
  }): void {
    if (!this.enabled || !logId) return;

    const entry = this.logs.get(logId);
    if (entry) {
      entry.result = {
        statusCode: data.statusCode,
        body: this.sanitizeResponse(data.body),
      };
      entry.duration = data.duration;
      entry.error = data.error;
      if (data.error) {
        entry.type = 'error';
        entry.stackTrace = data.error?.stack;
      }
      this.logs.set(logId, entry);
    }
  }

  logFunctionCall(data: {
    functionName: string;
    serviceName: string;
    parameters?: any;
    result?: any;
    duration?: number;
    error?: any;
    userId?: string;
    guildId?: string;
  }): string {
    if (!this.enabled) return '';

    const logId = this.generateLogId();
    const entry: DebugLogEntry = {
      id: logId,
      timestamp: new Date(),
      type: 'function',
      category: data.serviceName,
      functionName: data.functionName,
      serviceName: data.serviceName,
      parameters: this.sanitizeData(data.parameters),
      result: this.sanitizeData(data.result),
      duration: data.duration,
      error: data.error,
      userId: data.userId,
      guildId: data.guildId,
      stackTrace: data.error?.stack,
    };

    this.storeLog(entry);
    return logId;
  }

  logDatabaseQuery(data: {
    query: string;
    parameters?: any;
    duration: number;
    error?: any;
    userId?: string;
    guildId?: string;
  }): string {
    if (!this.enabled) return '';

    const logId = this.generateLogId();
    const entry: DebugLogEntry = {
      id: logId,
      timestamp: new Date(),
      type: 'database',
      category: 'query',
      functionName: 'database.query',
      parameters: {
        query: data.query,
        params: this.sanitizeData(data.parameters),
      },
      duration: data.duration,
      error: data.error,
      userId: data.userId,
      guildId: data.guildId,
      stackTrace: data.error?.stack,
    };

    this.storeLog(entry);
    return logId;
  }

  logDiscordEvent(data: {
    event: string;
    data?: any;
    duration?: number;
    error?: any;
    guildId?: string;
  }): string {
    if (!this.enabled) return '';

    const logId = this.generateLogId();
    const entry: DebugLogEntry = {
      id: logId,
      timestamp: new Date(),
      type: 'discord',
      category: 'event',
      functionName: data.event,
      parameters: this.sanitizeData(data.data),
      duration: data.duration,
      error: data.error,
      guildId: data.guildId,
      stackTrace: data.error?.stack,
    };

    this.storeLog(entry);
    return logId;
  }

  logError(data: {
    error: Error | any;
    context?: string;
    functionName?: string;
    serviceName?: string;
    userId?: string;
    guildId?: string;
    metadata?: Record<string, any>;
  }): string {
    const logId = this.generateLogId();
    const entry: DebugLogEntry = {
      id: logId,
      timestamp: new Date(),
      type: 'error',
      category: data.serviceName || 'unknown',
      functionName: data.functionName,
      serviceName: data.serviceName,
      error: {
        message: data.error?.message || String(data.error),
        name: data.error?.name,
        code: data.error?.code,
      },
      stackTrace: data.error?.stack,
      userId: data.userId,
      guildId: data.guildId,
      metadata: data.metadata,
    };

    this.storeLog(entry);
    this.logger.error(`Debug log error: ${data.error?.message || data.error}`, data.error?.stack);
    return logId;
  }

  createSession(name: string, filters?: DebugSession['filters']): string {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const session: DebugSession = {
      id: sessionId,
      name,
      enabled: true,
      filters: filters || {},
      startTime: new Date(),
      logCount: 0,
    };

    this.sessions.set(sessionId, session);
    this.logger.log(`Created debug session: ${sessionId} - ${name}`);
    return sessionId;
  }

  getLogs(filters?: {
    type?: string[];
    category?: string[];
    serviceName?: string[];
    functionName?: string[];
    path?: string[];
    userId?: string;
    guildId?: string;
    startTime?: Date;
    endTime?: Date;
    minDuration?: number;
    includeErrors?: boolean;
    limit?: number;
    offset?: number;
  }): DebugLogEntry[] {
    let logs = Array.from(this.logs.values());

    if (filters?.type && filters.type.length > 0) {
      logs = logs.filter((log) => filters.type!.includes(log.type));
    }

    if (filters?.category && filters.category.length > 0) {
      logs = logs.filter((log) => filters.category!.includes(log.category));
    }

    if (filters?.serviceName && filters.serviceName.length > 0) {
      logs = logs.filter((log) => log.serviceName && filters.serviceName!.includes(log.serviceName));
    }

    if (filters?.functionName && filters.functionName.length > 0) {
      logs = logs.filter((log) => log.functionName && filters.functionName!.includes(log.functionName));
    }

    if (filters?.path && filters.path.length > 0) {
      logs = logs.filter((log) => log.path && filters.path!.some((p) => log.path!.includes(p)));
    }

    if (filters?.userId) {
      logs = logs.filter((log) => log.userId === filters.userId);
    }

    if (filters?.guildId) {
      logs = logs.filter((log) => log.guildId === filters.guildId);
    }

    if (filters?.startTime) {
      logs = logs.filter((log) => log.timestamp >= filters.startTime!);
    }

    if (filters?.endTime) {
      logs = logs.filter((log) => log.timestamp <= filters.endTime!);
    }

    if (filters?.minDuration) {
      logs = logs.filter((log) => log.duration && log.duration >= filters.minDuration!);
    }

    if (filters?.includeErrors === false) {
      logs = logs.filter((log) => !log.error);
    } else if (filters?.includeErrors === true) {
      logs = logs.filter((log) => log.error);
    }

    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const offset = filters?.offset || 0;
    const limit = filters?.limit || 100;

    return logs.slice(offset, offset + limit);
  }

  getStats(timeRange?: { start: Date; end: Date }): DebugStats {
    let logs = Array.from(this.logs.values());

    if (timeRange) {
      logs = logs.filter(
        (log) => log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
      );
    }

    const logsByType: Record<string, number> = {};
    const logsByCategory: Record<string, number> = {};
    let totalDuration = 0;
    let durationCount = 0;
    let errorCount = 0;
    const slowestOperations: DebugStats['slowestOperations'] = [];
    const recentErrors: DebugStats['recentErrors'] = [];

    for (const log of logs) {
      logsByType[log.type] = (logsByType[log.type] || 0) + 1;
      logsByCategory[log.category] = (logsByCategory[log.category] || 0) + 1;

      if (log.duration) {
        totalDuration += log.duration;
        durationCount++;
      }

      if (log.error) {
        errorCount++;
        recentErrors.push({
          id: log.id,
          timestamp: log.timestamp,
          type: log.type,
          error: log.error?.message || String(log.error),
          functionName: log.functionName,
          path: log.path,
        });
      }

      if (log.duration && log.duration > 100) {
        slowestOperations.push({
          type: log.type,
          category: log.category,
          name: log.functionName || log.path || 'unknown',
          duration: log.duration,
          timestamp: log.timestamp,
        });
      }
    }

    slowestOperations.sort((a, b) => b.duration - a.duration);
    recentErrors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      totalLogs: logs.length,
      logsByType,
      logsByCategory,
      averageDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      errorCount,
      slowestOperations: slowestOperations.slice(0, 20),
      recentErrors: recentErrors.slice(0, 50),
    };
  }

  getLogById(logId: string): DebugLogEntry | null {
    return this.logs.get(logId) || null;
  }

  clearLogs(olderThan?: Date): number {
    if (olderThan) {
      let deleted = 0;
      for (const [id, log] of this.logs.entries()) {
        if (log.timestamp < olderThan) {
          this.logs.delete(id);
          deleted++;
        }
      }
      return deleted;
    } else {
      const count = this.logs.size;
      this.logs.clear();
      return count;
    }
  }

  enable(): void {
    this.enabled = true;
    this.logger.log('Debug service enabled');
  }

  disable(): void {
    this.enabled = false;
    this.logger.log('Debug service disabled');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private storeLog(entry: DebugLogEntry): void {
    if (this.logs.size >= this.maxLogs) {
      this.cleanupOldLogs();
    }

    this.logs.set(entry.id, entry);

    const cutoffTime = new Date(Date.now() - this.logRetentionHours * 60 * 60 * 1000);
    if (entry.timestamp < cutoffTime) {
      return;
    }
  }

  private cleanupOldLogs(): void {
    const cutoffTime = new Date(Date.now() - this.logRetentionHours * 60 * 60 * 1000);
    const logsToDelete: string[] = [];

    for (const [id, log] of this.logs.entries()) {
      if (log.timestamp < cutoffTime) {
        logsToDelete.push(id);
      }
    }

    logsToDelete.forEach((id) => this.logs.delete(id));

    if (this.logs.size >= this.maxLogs) {
      const sortedLogs = Array.from(this.logs.entries())
        .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
      
      const toDelete = sortedLogs.slice(0, Math.floor(this.maxLogs * 0.1));
      toDelete.forEach(([id]) => this.logs.delete(id));
    }
  }

  private generateLogId(): string {
    return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeHeaders(headers?: any): any {
    if (!headers) return {};
    const sanitized = { ...headers };
    const sensitiveKeys = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    sensitiveKeys.forEach((key) => {
      if (sanitized[key]) {
        sanitized[key] = '***REDACTED***';
      }
    });
    return sanitized;
  }

  private sanitizeResponse(body?: any): any {
    if (!body) return body;
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        return this.sanitizeData(parsed);
      } catch {
        return body.length > 1000 ? body.substring(0, 1000) + '...' : body;
      }
    }
    return this.sanitizeData(body);
  }

  private sanitizeData(data: any, maxDepth = 5, currentDepth = 0): any {
    if (currentDepth >= maxDepth) return '[Max Depth Reached]';
    if (data === null || data === undefined) return data;
    if (typeof data === 'string') {
      return data.length > 1000 ? data.substring(0, 1000) + '...' : data;
    }
    if (typeof data === 'number' || typeof data === 'boolean') return data;
    if (data instanceof Date) return data.toISOString();
    if (data instanceof Error) {
      return {
        name: data.name,
        message: data.message,
        stack: data.stack,
      };
    }
    if (Array.isArray(data)) {
      return data.slice(0, 100).map((item) => this.sanitizeData(item, maxDepth, currentDepth + 1));
    }
    if (typeof data === 'object') {
      const sanitized: any = {};
      const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken'];
      for (const [key, value] of Object.entries(data)) {
        if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
          sanitized[key] = '***REDACTED***';
        } else {
          sanitized[key] = this.sanitizeData(value, maxDepth, currentDepth + 1);
        }
      }
      return sanitized;
    }
    return String(data);
  }
}

