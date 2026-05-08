import { DebugService } from './debug.service';

let debugServiceInstance: DebugService | null = null;

export function setDebugService(service: DebugService): void {
  debugServiceInstance = service;
}

export function getDebugService(): DebugService | null {
  return debugServiceInstance;
}

export async function debugFunction<T>(
  serviceName: string,
  functionName: string,
  fn: () => Promise<T>,
  options?: {
    parameters?: any;
    userId?: string;
    guildId?: string;
  },
): Promise<T> {
  const debugService = getDebugService();
  if (!debugService || !debugService.isEnabled()) {
    return fn();
  }

  const startTime = Date.now();
  let result: T;
  let error: any;

  try {
    result = await fn();
    return result;
  } catch (e) {
    error = e;
    throw e;
  } finally {
    const duration = Date.now() - startTime;
    debugService.logFunctionCall({
      functionName,
      serviceName,
      parameters: options?.parameters,
      result: error ? undefined : result,
      duration,
      error,
      userId: options?.userId,
      guildId: options?.guildId,
    });
  }
}

export function debugSyncFunction<T>(
  serviceName: string,
  functionName: string,
  fn: () => T,
  options?: {
    parameters?: any;
    userId?: string;
    guildId?: string;
  },
): T {
  const debugService = getDebugService();
  if (!debugService || !debugService.isEnabled()) {
    return fn();
  }

  const startTime = Date.now();
  let result: T;
  let error: any;

  try {
    result = fn();
    return result;
  } catch (e) {
    error = e;
    throw e;
  } finally {
    const duration = Date.now() - startTime;
    debugService.logFunctionCall({
      functionName,
      serviceName,
      parameters: options?.parameters,
      result: error ? undefined : result,
      duration,
      error,
      userId: options?.userId,
      guildId: options?.guildId,
    });
  }
}

