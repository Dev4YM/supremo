import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  itemCount: number;
  lastRefresh?: Date;
}

@Injectable()
export class CacheManagerService implements OnModuleInit {
  private readonly logger = new Logger(CacheManagerService.name);
  private caches: Map<string, Map<string, CacheEntry>> = new Map();
  private configs: Map<string, any> = new Map();
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('🗄️  Initializing Cache Manager System...');
    await this.loadConfigurations();
    await this.initializeCaches();
    this.logger.log('✅ Cache Manager System initialized successfully');
  }

  /**
   * Load all cache configurations from database
   */
  private async loadConfigurations() {
    try {
      const configs = await this.prisma.cacheConfig.findMany({
        where: { enabled: true },
        orderBy: { priority: 'desc' },
      });

      for (const config of configs) {
        this.configs.set(config.key, config);
        this.caches.set(config.key, new Map());
        this.logger.log(
          `📦 Loaded cache config: ${config.name} (TTL: ${config.ttl}ms, Auto-refresh: ${config.autoRefresh})`,
        );
      }

      this.logger.log(`Loaded ${configs.length} cache configuration(s)`);
    } catch (error) {
      this.logger.error('Failed to load cache configurations:', error);
    }
  }

  /**
   * Initialize all caches and setup auto-refresh if enabled
   */
  private async initializeCaches() {
    for (const [key, config] of this.configs) {
      // Setup auto-refresh timer if enabled
      if (config.autoRefresh) {
        this.setupAutoRefresh(key, config.ttl);
      }

      // Initialize statistics if they don't exist
      await this.ensureStatistics(config.id);
    }
  }

  /**
   * Setup auto-refresh timer for a cache
   */
  private setupAutoRefresh(cacheKey: string, interval: number) {
    // Clear existing timer if any
    if (this.refreshTimers.has(cacheKey)) {
      clearInterval(this.refreshTimers.get(cacheKey));
    }

    // Don't set up timer if interval is 0 or negative
    if (interval <= 0) return;

    const timer = setInterval(async () => {
      this.logger.log(`⏰ Auto-refreshing cache: ${cacheKey}`);
      await this.triggerRefresh(cacheKey, 'auto', 'system');
    }, interval);

    this.refreshTimers.set(cacheKey, timer);
    this.logger.log(`⏲️  Auto-refresh scheduled for ${cacheKey} every ${interval}ms`);
  }

  /**
   * Get data from cache
   */
  async get<T = any>(cacheKey: string, itemKey: string = 'default', guildId?: string): Promise<T | null> {
    // Use guildId as itemKey if provided and itemKey is default
    const finalItemKey = guildId ? `${guildId}_${itemKey}` : itemKey;
    
    const cache = this.caches.get(cacheKey);
    if (!cache) {
      await this.recordMiss(cacheKey, guildId);
      return null;
    }

    const entry = cache.get(finalItemKey);
    if (!entry) {
      await this.recordMiss(cacheKey, guildId);
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      cache.delete(finalItemKey);
      await this.recordMiss(cacheKey, guildId);
      return null;
    }

    await this.recordHit(cacheKey, guildId);
    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  async set<T = any>(
    cacheKey: string,
    data: T,
    itemKey: string = 'default',
    customTtl?: number,
    guildId?: string,
  ): Promise<void> {
    // Look up config by guildId if provided
    let config;
    if (guildId) {
      config = await this.getConfig(cacheKey, guildId);
    } else {
      config = this.configs.get(cacheKey);
    }
    
    if (!config) {
      this.logger.warn(`Cache config not found: ${cacheKey}${guildId ? ` for guild ${guildId}` : ''}`);
      return;
    }

    if (!config.enabled) {
      this.logger.warn(`Cache is disabled: ${cacheKey}${guildId ? ` for guild ${guildId}` : ''}`);
      return;
    }

    // Use guildId as itemKey if provided and itemKey is default
    const finalItemKey = guildId ? `${guildId}_${itemKey}` : itemKey;
    
    const ttl = customTtl ?? config.ttl;
    const cache = this.caches.get(cacheKey);
    if (!cache) {
      this.caches.set(cacheKey, new Map());
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    this.caches.get(cacheKey)!.set(finalItemKey, entry);

    // Update statistics
    await this.updateStatistics(cacheKey, {
      itemCount: this.caches.get(cacheKey)!.size,
    }, guildId);
  }

  /**
   * Clear specific cache or all caches
   */
  async clear(cacheKey?: string): Promise<void> {
    if (cacheKey) {
      const cache = this.caches.get(cacheKey);
      if (cache) {
        cache.clear();
        this.logger.log(`🗑️  Cleared cache: ${cacheKey}`);
      }
    } else {
      for (const cache of this.caches.values()) {
        cache.clear();
      }
      this.logger.log('🗑️  Cleared all caches');
    }
  }

  /**
   * Check if cache has valid data
   */
  async has(cacheKey: string, itemKey: string = 'default'): Promise<boolean> {
    const data = await this.get(cacheKey, itemKey);
    return data !== null;
  }

  /**
   * Get cache statistics
   */
  async getStatistics(cacheKey: string): Promise<CacheStats | null> {
    const config = this.configs.get(cacheKey);
    if (!config) return null;

    const stats = await this.prisma.cacheStatistic.findFirst({
      where: { cacheConfigId: config.id },
      orderBy: { updatedAt: 'desc' },
    });

    if (!stats) return null;

    const hitRate = stats.hits + stats.misses > 0
      ? (stats.hits / (stats.hits + stats.misses)) * 100
      : 0;

    return {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      itemCount: stats.itemCount || 0,
      lastRefresh: stats.lastRefreshAt || undefined,
    };
  }

  /**
   * Get all cache configurations
   */
  async getAllConfigs(guildId?: string) {
    const where: any = {};
    if (guildId) {
      where.guildId = guildId;
    } else {
      // Include global caches (guildId = null) when no guildId specified
      where.guildId = null;
    }
    return this.prisma.cacheConfig.findMany({
      where,
      orderBy: { priority: 'desc' },
      include: {
        statistics: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Get specific cache configuration
   */
  async getConfig(cacheKey: string, guildId?: string) {
    const where: any = { key: cacheKey };
    if (guildId !== undefined) {
      where.guildId = guildId;
    }
    return this.prisma.cacheConfig.findFirst({
      where,
      include: {
        statistics: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Update cache configuration
   */
  async updateConfig(
    cacheKey: string,
    data: {
      enabled?: boolean;
      ttl?: number;
      autoRefresh?: boolean;
      priority?: number;
      maxSize?: number;
      strategy?: string;
      metadata?: any;
    },
    guildId?: string,
  ) {
    const where: any = { key: cacheKey };
    if (guildId !== undefined) {
      where.guildId = guildId;
    }
    const config = await this.prisma.cacheConfig.findFirst({ where });
    if (!config) {
      throw new Error('Cache config not found');
    }
    const updated = await this.prisma.cacheConfig.update({
      where: { id: config.id },
      data,
    });

    // Update in-memory config
    this.configs.set(cacheKey, config);

    // Restart auto-refresh if TTL or autoRefresh changed
    if (data.ttl !== undefined || data.autoRefresh !== undefined) {
      if (config.autoRefresh && config.enabled) {
        this.setupAutoRefresh(cacheKey, config.ttl);
      } else {
        // Stop auto-refresh
        const timer = this.refreshTimers.get(cacheKey);
        if (timer) {
          clearInterval(timer);
          this.refreshTimers.delete(cacheKey);
        }
      }
    }

    // Clear cache if disabled
    if (data.enabled === false) {
      await this.clear(cacheKey);
    }

    this.logger.log(`✏️  Updated cache config: ${cacheKey}`);
    return updated;
  }

  /**
   * Trigger manual cache refresh
   */
  async triggerRefresh(
    cacheKey: string,
    triggerType: 'manual' | 'auto' | 'scheduled' | 'startup' = 'manual',
    triggeredBy: string = 'system',
  ) {
    const startTime = Date.now();
    const logId = await this.createRefreshLog(cacheKey, triggerType, triggeredBy);

    try {
      const config = this.configs.get(cacheKey);
      if (!config) {
        throw new Error(`Cache config not found: ${cacheKey}`);
      }

      // Emit event for external handlers to refresh the cache
      // The actual refresh logic is handled by the service that owns the data
      this.logger.log(`🔄 Triggering refresh for cache: ${cacheKey}`);

      const duration = Date.now() - startTime;
      
      // Update statistics
      await this.updateStatistics(cacheKey, {
        lastRefreshAt: new Date(),
        refreshCount: { increment: 1 },
        avgRefreshTime: duration,
      });

      // Complete refresh log
      await this.completeRefreshLog(logId, 'success', duration);

      return { success: true, duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to refresh cache ${cacheKey}:`, error);

      // Update error statistics
      await this.updateStatistics(cacheKey, {
        lastErrorAt: new Date(),
        lastError: error.message,
        errorCount: { increment: 1 },
      });

      // Complete refresh log with error
      await this.completeRefreshLog(logId, 'failed', duration, error.message);

      throw error;
    }
  }

  /**
   * Get refresh logs for a cache
   */
  async getRefreshLogs(cacheKey: string, limit = 50) {
    return this.prisma.cacheRefreshLog.findMany({
      where: { cacheKey },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get overall cache manager statistics
   */
  async getOverallStatistics(guildId?: string) {
    const configs = await this.getAllConfigs(guildId);
    
    const totalHits = configs.reduce(
      (sum, c) => sum + (c.statistics[0]?.hits || 0),
      0,
    );
    const totalMisses = configs.reduce(
      (sum, c) => sum + (c.statistics[0]?.misses || 0),
      0,
    );
    const totalRefreshes = configs.reduce(
      (sum, c) => sum + (c.statistics[0]?.refreshCount || 0),
      0,
    );
    const totalErrors = configs.reduce(
      (sum, c) => sum + (c.statistics[0]?.errorCount || 0),
      0,
    );

    const totalRequests = totalHits + totalMisses;
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

    return {
      totalCaches: configs.length,
      enabledCaches: configs.filter((c) => c.enabled).length,
      totalHits,
      totalMisses,
      totalRefreshes,
      totalErrors,
      hitRate: Math.round(hitRate * 100) / 100,
      caches: configs.map((c) => ({
        key: c.key,
        name: c.name,
        enabled: c.enabled,
        ttl: c.ttl,
        autoRefresh: c.autoRefresh,
        stats: c.statistics[0] || null,
      })),
    };
  }

  /**
   * Scheduled cleanup of expired cache entries
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredEntries() {
    this.logger.log('🧹 Running scheduled cache cleanup...');
    let totalCleaned = 0;

    for (const [cacheKey, cache] of this.caches) {
      const now = Date.now();
      let cleaned = 0;

      for (const [itemKey, entry] of cache.entries()) {
        if (now > entry.expiresAt) {
          cache.delete(itemKey);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.log(`🧹 Cleaned ${cleaned} expired entries from ${cacheKey}`);
        totalCleaned += cleaned;

        // Update item count
        await this.updateStatistics(cacheKey, {
          itemCount: cache.size,
        });
      }
    }

    if (totalCleaned > 0) {
      this.logger.log(`🧹 Cleanup complete: Removed ${totalCleaned} expired entries`);
    }
  }

  /**
   * Private helper: Ensure statistics record exists
   */
  private async ensureStatistics(cacheConfigId: string) {
    const existing = await this.prisma.cacheStatistic.findFirst({
      where: { cacheConfigId },
    });

    if (!existing) {
      await this.prisma.cacheStatistic.create({
        data: { cacheConfigId },
      });
    }
  }

  /**
   * Private helper: Record cache hit
   */
  private async recordHit(cacheKey: string, guildId?: string) {
    let config;
    if (guildId) {
      config = await this.getConfig(cacheKey, guildId);
    } else {
      config = this.configs.get(cacheKey);
    }
    if (!config) return;

    await this.prisma.cacheStatistic.updateMany({
      where: { cacheConfigId: config.id },
      data: {
        hits: { increment: 1 },
        lastHitAt: new Date(),
      },
    });
  }

  /**
   * Private helper: Record cache miss
   */
  private async recordMiss(cacheKey: string, guildId?: string) {
    let config;
    if (guildId) {
      config = await this.getConfig(cacheKey, guildId);
    } else {
      config = this.configs.get(cacheKey);
    }
    if (!config) return;

    await this.prisma.cacheStatistic.updateMany({
      where: { cacheConfigId: config.id },
      data: {
        misses: { increment: 1 },
        lastMissAt: new Date(),
      },
    });
  }

  /**
   * Private helper: Update statistics
   */
  private async updateStatistics(cacheKey: string, data: any, guildId?: string) {
    let config;
    if (guildId) {
      config = await this.getConfig(cacheKey, guildId);
    } else {
      config = this.configs.get(cacheKey);
    }
    if (!config) return;

    await this.prisma.cacheStatistic.updateMany({
      where: { cacheConfigId: config.id },
      data,
    });
  }

  /**
   * Private helper: Create refresh log
   */
  private async createRefreshLog(
    cacheKey: string,
    triggerType: string,
    triggeredBy: string,
  ): Promise<string> {
    const log = await this.prisma.cacheRefreshLog.create({
      data: {
        cacheKey,
        triggerType,
        triggeredBy,
        status: 'success', // Will be updated on completion
      },
    });
    return log.id;
  }

  /**
   * Private helper: Complete refresh log
   */
  private async completeRefreshLog(
    logId: string,
    status: string,
    duration: number,
    error?: string,
  ) {
    await this.prisma.cacheRefreshLog.update({
      where: { id: logId },
      data: {
        status,
        duration,
        error,
        completedAt: new Date(),
      },
    });
  }
}

