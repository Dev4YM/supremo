import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Recursively converts BigInt values to strings so Nest/Express JSON serialization succeeds
 * without patching global JSON.stringify.
 */
@Injectable()
export class BigIntSerializationInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => this.transform(data)));
  }

  private transform(val: unknown): unknown {
    if (typeof val === 'bigint') {
      return val.toString();
    }
    if (val === null || val === undefined) {
      return val;
    }
    if (val instanceof Date) {
      return val;
    }
    if (Array.isArray(val)) {
      return val.map((item) => this.transform(item));
    }
    if (typeof val === 'object') {
      if (val instanceof Map) {
        return Object.fromEntries(
          Array.from(val.entries()).map(([k, v]) => [k, this.transform(v)]),
        );
      }
      if (val instanceof Set) {
        return Array.from(val).map((item) => this.transform(item));
      }
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(val as object)) {
        out[key] = this.transform((val as Record<string, unknown>)[key]);
      }
      return out;
    }
    return val;
  }
}
