/**
 * Date and time utility functions
 */

export class DateUtils {
  /**
   * Format a date as a relative time string (e.g., "2 hours ago")
   */
  static formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 30) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Format duration in milliseconds to human readable string
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Parse duration string to milliseconds (e.g., "1h 30m" -> 5400000)
   */
  static parseDuration(duration: string): number {
    const regex = /(\d+)([dhms])/g;
    let totalMs = 0;
    let match;

    while ((match = regex.exec(duration)) !== null) {
      const value = parseInt(match[1]);
      const unit = match[2];

      switch (unit) {
        case 'd':
          totalMs += value * 24 * 60 * 60 * 1000;
          break;
        case 'h':
          totalMs += value * 60 * 60 * 1000;
          break;
        case 'm':
          totalMs += value * 60 * 1000;
          break;
        case 's':
          totalMs += value * 1000;
          break;
      }
    }

    return totalMs;
  }

  /**
   * Check if a date is within a time window
   */
  static isWithinTimeWindow(date: Date, windowMs: number): boolean {
    const now = new Date();
    return (now.getTime() - date.getTime()) <= windowMs;
  }

  /**
   * Get the start of day for a given date
   */
  static getStartOfDay(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  /**
   * Get the end of day for a given date
   */
  static getEndOfDay(date: Date): Date {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  /**
   * Add time to a date
   */
  static addTime(date: Date, amount: number, unit: 'ms' | 's' | 'm' | 'h' | 'd'): Date {
    const result = new Date(date);
    
    switch (unit) {
      case 'ms':
        result.setMilliseconds(result.getMilliseconds() + amount);
        break;
      case 's':
        result.setSeconds(result.getSeconds() + amount);
        break;
      case 'm':
        result.setMinutes(result.getMinutes() + amount);
        break;
      case 'h':
        result.setHours(result.getHours() + amount);
        break;
      case 'd':
        result.setDate(result.getDate() + amount);
        break;
    }
    
    return result;
  }

  /**
   * Format date for Discord timestamp
   */
  static toDiscordTimestamp(date: Date, style: 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R' = 'f'): string {
    const timestamp = Math.floor(date.getTime() / 1000);
    return `<t:${timestamp}:${style}>`;
  }
}