import { Signal, SignalType } from '../types';
import { RulesEngine } from '../engine';

export class SignalProcessor {
  private engine: RulesEngine;
  private processingQueue: Signal[] = [];
  private isProcessing = false;
  private readonly maxQueueSize = 1000;

  constructor(engine: RulesEngine) {
    this.engine = engine;
  }

  /**
   * Process a signal through the rules engine
   */
  async process(signal: Signal): Promise<void> {
    if (this.processingQueue.length >= this.maxQueueSize) {
      console.warn('Signal processing queue is full, dropping signal');
      return;
    }

    this.processingQueue.push(signal);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process signals in the queue
   */
  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const signal = this.processingQueue.shift()!;
      
      try {
        await this.engine.evaluate(signal);
      } catch (error) {
        console.error('Error processing signal:', error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueSize: number;
    isProcessing: boolean;
    maxQueueSize: number;
  } {
    return {
      queueSize: this.processingQueue.length,
      isProcessing: this.isProcessing,
      maxQueueSize: this.maxQueueSize
    };
  }

  /**
   * Clear the processing queue
   */
  clearQueue(): void {
    this.processingQueue = [];
  }
}