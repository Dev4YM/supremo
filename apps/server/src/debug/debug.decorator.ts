import { SetMetadata } from '@nestjs/common';

export const DEBUG_KEY = 'debug';
export const DebugLog = (options?: { category?: string; logParams?: boolean; logResult?: boolean }) =>
  SetMetadata(DEBUG_KEY, options || {});

