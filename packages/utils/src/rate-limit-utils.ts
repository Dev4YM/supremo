/**
 * Rate limiting utility functions
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimitUtils {
  private static limits = new Map<string, RateLimitEntry>();

  /**
   * Check if action is rate limited
   */
  static isRateLimited(
    key: string, 
    maxRequests: number, 
    windowMs: number
  ): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      // Reset or create new entry
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return false;
    }

    if (entry.count >= maxRequests) {
      return true;
    }

    entry.count++;
    return false;
  }

  /**
   * Get remaining requests for key
   */
  static getRemainingRequests(
    key: string, 
    maxRequests: number
  ): number {
    const entry = this.limits.get(key);
    
    if (!entry || Date.now() > entry.resetTime) {
      return maxRequests;
    }
    
    return Math.max(0, maxRequests - entry.count);
  }

  /**
   * Get reset time for key
   */
  static getResetTime(key: string): number | null {
    const entry = this.limits.get(key);
    
    if (!entry || Date.now() > entry.resetTime) {
      return null;
    }
    
    return entry.resetTime;
  }

  /**
   * Reset rate limit for key
   */
  static reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Clear all rate limits
   */
  static clearAll(): void {
    this.limits.clear();
  }

  /**
   * Clean expired entries
   */
  static cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}