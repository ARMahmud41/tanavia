// ============================================
// SMS Queue Service — in-memory recent SMS storage
// Used by POS to auto-fill TxID from recent SMS
// ============================================

import type { ParsedSms } from './sms-parser.service.js';

const MAX_QUEUE_SIZE = 20;
const AUTO_FILL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

interface QueuedSms extends ParsedSms {
  id: string;
  receivedAt: string;
  consumed: boolean;
}

class SmsQueue {
  private queue: QueuedSms[] = [];

  add(sms: ParsedSms): QueuedSms {
    const item: QueuedSms = {
      ...sms,
      id: `sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      receivedAt: new Date().toISOString(),
      consumed: false,
    };

    this.queue.unshift(item);

    // Trim to max size
    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue = this.queue.slice(0, MAX_QUEUE_SIZE);
    }

    return item;
  }

  /**
   * Get all recent SMS (last 5 min, unconsumed first)
   */
  getRecent(): QueuedSms[] {
    const cutoff = Date.now() - AUTO_FILL_WINDOW_MS;
    return this.queue.filter(
      (item) => new Date(item.receivedAt).getTime() > cutoff
    );
  }

  /**
   * Get latest unconsumed SMS
   */
  getLatestUnconsumed(): QueuedSms | null {
    const cutoff = Date.now() - AUTO_FILL_WINDOW_MS;
    return (
      this.queue.find(
        (item) =>
          !item.consumed &&
          new Date(item.receivedAt).getTime() > cutoff
      ) || null
    );
  }

  /**
   * Mark SMS as consumed (used in a sale)
   */
  markConsumed(id: string): void {
    const item = this.queue.find((i) => i.id === id);
    if (item) item.consumed = true;
  }

  /**
   * Clear all (for testing)
   */
  clearAll(): void {
    this.queue = [];
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }
}

// Singleton export
export const smsQueue = new SmsQueue();