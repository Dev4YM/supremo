import { Signal, SignalType } from '../types';

export class SignalFilters {
  /**
   * Filter signals by type
   */
  static byType(signals: Signal[], type: SignalType): Signal[] {
    return signals.filter(signal => signal.type === type);
  }

  /**
   * Filter signals by guild
   */
  static byGuild(signals: Signal[], guildId: string): Signal[] {
    return signals.filter(signal => signal.guildId === guildId);
  }

  /**
   * Filter signals by user
   */
  static byUser(signals: Signal[], userId: string): Signal[] {
    return signals.filter(signal => signal.userId === userId);
  }

  /**
   * Filter signals by time range
   */
  static byTimeRange(signals: Signal[], start: Date, end: Date): Signal[] {
    return signals.filter(signal => 
      signal.timestamp >= start && signal.timestamp <= end
    );
  }

  /**
   * Filter signals by channel
   */
  static byChannel(signals: Signal[], channelId: string): Signal[] {
    return signals.filter(signal => signal.channelId === channelId);
  }

  /**
   * Filter recent signals (within last N milliseconds)
   */
  static recent(signals: Signal[], timeWindowMs: number): Signal[] {
    const cutoff = new Date(Date.now() - timeWindowMs);
    return signals.filter(signal => signal.timestamp >= cutoff);
  }

  /**
   * Combine multiple filters
   */
  static combine(
    signals: Signal[], 
    ...filters: Array<(signals: Signal[]) => Signal[]>
  ): Signal[] {
    return filters.reduce((filtered, filter) => filter(filtered), signals);
  }
}