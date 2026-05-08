import { 
  ModerationRule, 
  Signal, 
  RuleResult, 
  EngineConfig, 
  EvaluationContext,
  EngineStatistics,
  RuleStatistics,
  LogLevel 
} from './types';
import { ConfidenceScorer } from './scoring';

export class RulesEngine {
  private rules: Map<string, ModerationRule> = new Map();
  private statistics: EngineStatistics;
  private config: EngineConfig;
  private startTime: Date;

  constructor(config?: Partial<EngineConfig>) {
    this.config = {
      rules: {},
      signals: {
        messageAnalysis: true,
        userBehavior: true,
        serverEvents: true,
        customEvents: true
      },
      processing: {
        maxConcurrentRules: 10,
        timeoutMs: 5000,
        retryAttempts: 3
      },
      logging: {
        enabled: true,
        level: LogLevel.INFO,
        includeMetadata: false
      },
      ...config
    };

    this.startTime = new Date();
    this.statistics = {
      totalSignalsProcessed: 0,
      totalRulesEvaluated: 0,
      totalViolationsDetected: 0,
      averageProcessingTime: 0,
      ruleStatistics: [],
      uptime: 0,
      lastReset: this.startTime
    };
  }

  /**
   * Add a rule to the engine
   */
  addRule(rule: ModerationRule): void {
    this.rules.set(rule.name, rule);
    this.initializeRuleStatistics(rule.name);
    this.log(LogLevel.INFO, `Rule added: ${rule.name}`);
  }

  /**
   * Remove a rule from the engine
   */
  removeRule(name: string): boolean {
    const removed = this.rules.delete(name);
    if (removed) {
      this.statistics.ruleStatistics = this.statistics.ruleStatistics.filter(
        stat => stat.ruleName !== name
      );
      this.log(LogLevel.INFO, `Rule removed: ${name}`);
    }
    return removed;
  }

  /**
   * Get all registered rules
   */
  getRules(): ModerationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Evaluate a signal against all enabled rules
   */
  async evaluate(signal: Signal, context?: Partial<EvaluationContext>): Promise<{
    results: RuleResult[];
    overallConfidence: number;
    processingTime: number;
    violationsDetected: number;
  }> {
    const startTime = Date.now();
    const evaluationContext: EvaluationContext = {
      guildId: signal.guildId,
      userId: signal.userId,
      channelId: signal.channelId,
      timestamp: signal.timestamp,
      metadata: {},
      ...context
    };

    this.statistics.totalSignalsProcessed++;

    const enabledRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    const results: RuleResult[] = [];
    const promises = enabledRules.map(rule => this.evaluateRule(rule, signal, evaluationContext));

    try {
      const ruleResults = await Promise.allSettled(promises);
      
      for (let i = 0; i < ruleResults.length; i++) {
        const result = ruleResults[i];
        const rule = enabledRules[i];
        
        if (result.status === 'fulfilled') {
          results.push(result.value);
          this.updateRuleStatistics(rule.name, result.value, Date.now() - startTime);
        } else {
          this.log(LogLevel.ERROR, `Rule ${rule.name} failed: ${result.reason}`);
          this.incrementRuleErrorCount(rule.name);
        }
      }
    } catch (error) {
      this.log(LogLevel.ERROR, `Evaluation failed: ${error}`);
    }

    const processingTime = Date.now() - startTime;
    const violationsDetected = results.filter(r => r.triggered).length;
    const overallConfidence = ConfidenceScorer.calculateOverallConfidence(results);

    // Update global statistics
    this.statistics.totalRulesEvaluated += enabledRules.length;
    this.statistics.totalViolationsDetected += violationsDetected;
    this.updateAverageProcessingTime(processingTime);

    this.log(LogLevel.DEBUG, `Evaluation completed in ${processingTime}ms`, {
      signal: signal.type,
      rulesEvaluated: enabledRules.length,
      violationsDetected,
      overallConfidence
    });

    return {
      results,
      overallConfidence,
      processingTime,
      violationsDetected
    };
  }

  /**
   * Evaluate a single rule against a signal
   */
  private async evaluateRule(
    rule: ModerationRule, 
    signal: Signal, 
    context: EvaluationContext
  ): Promise<RuleResult> {
    const ruleStartTime = Date.now();
    
    try {
      const result = await Promise.race([
        rule.evaluate(signal),
        this.createTimeoutPromise(this.config.processing.timeoutMs)
      ]);

      result.processingTime = Date.now() - ruleStartTime;
      
      // Apply trust score adjustment if available
      if (context.userTrustScore !== undefined && result.triggered) {
        result.confidence = ConfidenceScorer.adjustForTrustScore(
          result.confidence, 
          context.userTrustScore
        );
      }

      return result;
    } catch (error) {
      this.log(LogLevel.ERROR, `Rule ${rule.name} evaluation error: ${error}`);
      throw error;
    }
  }

  /**
   * Create a timeout promise for rule evaluation
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Rule evaluation timeout')), timeoutMs);
    });
  }

  /**
   * Get engine statistics
   */
  getStatistics(): EngineStatistics {
    this.statistics.uptime = Date.now() - this.startTime.getTime();
    return { ...this.statistics };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = {
      totalSignalsProcessed: 0,
      totalRulesEvaluated: 0,
      totalViolationsDetected: 0,
      averageProcessingTime: 0,
      ruleStatistics: this.statistics.ruleStatistics.map(stat => ({
        ...stat,
        totalEvaluations: 0,
        totalTriggered: 0,
        averageConfidence: 0,
        averageProcessingTime: 0,
        errorCount: 0,
        lastTriggered: undefined
      })),
      uptime: 0,
      lastReset: new Date()
    };
  }

  /**
   * Initialize statistics for a new rule
   */
  private initializeRuleStatistics(ruleName: string): void {
    this.statistics.ruleStatistics.push({
      ruleName,
      totalEvaluations: 0,
      totalTriggered: 0,
      averageConfidence: 0,
      averageProcessingTime: 0,
      errorCount: 0
    });
  }

  /**
   * Update statistics for a rule
   */
  private updateRuleStatistics(ruleName: string, result: RuleResult, processingTime: number): void {
    const stat = this.statistics.ruleStatistics.find(s => s.ruleName === ruleName);
    if (!stat) return;

    stat.totalEvaluations++;
    stat.averageProcessingTime = this.calculateMovingAverage(
      stat.averageProcessingTime,
      processingTime,
      stat.totalEvaluations
    );

    if (result.triggered) {
      stat.totalTriggered++;
      stat.averageConfidence = this.calculateMovingAverage(
        stat.averageConfidence,
        result.confidence,
        stat.totalTriggered
      );
      stat.lastTriggered = new Date();
    }
  }

  /**
   * Increment error count for a rule
   */
  private incrementRuleErrorCount(ruleName: string): void {
    const stat = this.statistics.ruleStatistics.find(s => s.ruleName === ruleName);
    if (stat) {
      stat.errorCount++;
    }
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(processingTime: number): void {
    this.statistics.averageProcessingTime = this.calculateMovingAverage(
      this.statistics.averageProcessingTime,
      processingTime,
      this.statistics.totalSignalsProcessed
    );
  }

  /**
   * Calculate moving average
   */
  private calculateMovingAverage(current: number, newValue: number, count: number): number {
    return (current * (count - 1) + newValue) / count;
  }

  /**
   * Log message based on configuration
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    if (!this.config.logging.enabled) return;
    
    const logLevels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = logLevels.indexOf(this.config.logging.level);
    const messageLevelIndex = logLevels.indexOf(level);
    
    if (messageLevelIndex >= currentLevelIndex) {
      const logData = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...(this.config.logging.includeMetadata && metadata ? { metadata } : {})
      };
      
      console.log(JSON.stringify(logData));
    }
  }
}