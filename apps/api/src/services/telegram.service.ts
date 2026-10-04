// ============================================
// Telegram Notification Service
// Sends order notifications to admin
// ============================================

interface OrderNotification {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  district: string;
  address?: string | null;
  total: string | number;
  paymentMethod: string;
  itemsCount: number;
  channel: string;
  items?: Array<{ name: string; size: string; color: string; qty: number }>;
}

interface ReturnNotification {
  returnNumber: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  channel: string;
  reason: string;
  reasonNote?: string | null;
  refundAmount: string | number;
  itemsCount: number;
  items?: Array<{ name: string; size: string; color: string; qty: number }>;
  actorName?: string;
}

interface ReturnStatusNotification {
  returnNumber: string;
  orderNumber: string;
  status: string;
  note?: string;
  actorName?: string;
}

export class TelegramService {
  /**
   * Notify admin of a new order
   */
  static async notifyNewOrder(order: OrderNotification): Promise<void> {
    if (process.env.TELEGRAM_ENABLED === 'false') {
      console.log('[Telegram] Disabled — skipping');
      return;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!token || !chatId) {
      console.warn(
        '[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID'
      );
      return;
    }

    try {
      const message = this.buildNewOrderMessage(order);
      await this.sendMessage(chatId, message);
      console.log(
        `[Telegram] ✅ Notification sent for ${order.orderNumber}`
      );
    } catch (err) {
      console.error('[Telegram] Failed to send:', err);
      // Never throw — notification must not break order flow
    }
  }

  /**
   * Notify admin when a new return request is created
   */
  static async notifyNewReturn(ret: ReturnNotification): Promise<void> {
    if (process.env.TELEGRAM_ENABLED === 'false') {
      console.log('[Telegram] Disabled — skipping');
      return;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!token || !chatId) {
      console.warn(
        '[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID'
      );
      return;
    }

    try {
      const message = this.buildNewReturnMessage(ret);
      await this.sendMessage(chatId, message);
      console.log(
        `[Telegram] ✅ Return notification sent for ${ret.returnNumber}`
      );
    } catch (err) {
      console.error('[Telegram] Failed to send return notification:', err);
    }
  }

  /**
   * Notify admin when return status changes (approved, rejected, refunded)
   */
  static async notifyReturnStatusChange(
    ret: ReturnStatusNotification
  ): Promise<void> {
    if (process.env.TELEGRAM_ENABLED === 'false') return;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!token || !chatId) return;

    try {
      const message = this.buildReturnStatusMessage(ret);
      await this.sendMessage(chatId, message);
      console.log(
        `[Telegram] ✅ Return status notification sent for ${ret.returnNumber}`
      );
    } catch (err) {
      console.error('[Telegram] Failed to send return status:', err);
    }
  }

  /**
   * Send a custom message (for tests)
   */
  static async sendCustomMessage(message: string): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!token || !chatId) {
      throw new Error('Telegram credentials not configured');
    }

    await this.sendMessage(chatId, message);
  }

  // ============================================
  // Core send method
  // ============================================
  private static async sendMessage(
    chatId: string,
    text: string
  ): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing');

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Telegram API error: ${res.status} — ${errorText}`);
    }
  }

  // ============================================
  // Message builder — NEW ORDER
  // ============================================
  private static buildNewOrderMessage(order: OrderNotification): string {
    const tk = (n: string | number) =>
      '৳' + Number(n).toLocaleString('en-BD');

    const lines: string[] = [
      '🛒 <b>NEW ORDER RECEIVED!</b>',
      '',
      `📦 <b>Order:</b> <code>${order.orderNumber}</code>`,
      `👤 <b>Customer:</b> ${this.escapeHtml(order.customerName)}`,
      `📞 <b>Phone:</b> <code>${order.customerPhone}</code>`,
      `📍 <b>District:</b> ${this.escapeHtml(order.district)}`,
    ];

    if (order.address) {
      lines.push(`🏠 <b>Address:</b> ${this.escapeHtml(order.address)}`);
    }

    lines.push(
      `💰 <b>Total:</b> ${tk(order.total)}`,
      `💳 <b>Payment:</b> ${order.paymentMethod}`,
      `📦 <b>Items:</b> ${order.itemsCount}`,
      `🌐 <b>Channel:</b> ${order.channel}`
    );

    if (order.items && order.items.length > 0) {
      lines.push('');
      lines.push('📋 <b>Product Details:</b>');
      for (const item of order.items.slice(0, 5)) {
        lines.push(
          `  • ${this.escapeHtml(item.name)} (${item.size}/${item.color}) × ${item.qty}`
        );
      }
      if (order.items.length > 5) {
        lines.push(`  ... and ${order.items.length - 5} more`);
      }
    }

    lines.push('');
    lines.push(
      `👉 <a href="${this.getAdminOrdersUrl()}">Open Admin Panel</a>`
    );

    return lines.join('\n');
  }

  // ============================================
  // Message builder — NEW RETURN
  // ============================================
  private static buildNewReturnMessage(ret: ReturnNotification): string {
    const tk = (n: string | number) =>
      '৳' + Number(n).toLocaleString('en-BD');

    const reasonLabels: Record<string, string> = {
      SIZE_WRONG: 'Size did not fit',
      COLOR_WRONG: 'Wrong color',
      DAMAGED: 'Arrived damaged',
      DEFECTIVE: 'Manufacturing defect',
      NOT_AS_DESCRIBED: 'Not as described',
      CHANGED_MIND: 'Changed mind',
      LATE_DELIVERY: 'Late delivery',
      WRONG_ITEM: 'Wrong item',
      OTHER: 'Other',
    };

    const reasonLabel = reasonLabels[ret.reason] || ret.reason;

    const lines: string[] = [
      '↩️ <b>NEW RETURN REQUEST</b>',
      '',
      `🎫 <b>Return:</b> <code>${ret.returnNumber}</code>`,
      `📦 <b>Order:</b> <code>${ret.orderNumber}</code>`,
      `👤 <b>Customer:</b> ${this.escapeHtml(ret.customerName || 'Walk-in Customer')}`,
    ];

    if (ret.customerPhone) {
      lines.push(`📞 <b>Phone:</b> <code>${ret.customerPhone}</code>`);
    }

    lines.push(
      `🌐 <b>Channel:</b> ${ret.channel}`,
      `❓ <b>Reason:</b> ${reasonLabel}`,
      `💰 <b>Refund Amount:</b> ${tk(ret.refundAmount)}`,
      `📦 <b>Items:</b> ${ret.itemsCount}`
    );

    if (ret.reasonNote) {
      lines.push(`📝 <b>Note:</b> ${this.escapeHtml(ret.reasonNote)}`);
    }

    if (ret.items && ret.items.length > 0) {
      lines.push('');
      lines.push('📋 <b>Items:</b>');
      for (const item of ret.items.slice(0, 5)) {
        lines.push(
          `  • ${this.escapeHtml(item.name)} (${item.size}/${item.color}) × ${item.qty}`
        );
      }
      if (ret.items.length > 5) {
        lines.push(`  ... and ${ret.items.length - 5} more`);
      }
    }

    if (ret.actorName) {
      lines.push('');
      lines.push(`👨💼 <b>Created by:</b> ${this.escapeHtml(ret.actorName)}`);
    }

    lines.push('');
    lines.push(
      `👉 <a href="${this.getAdminReturnsUrl()}">Open Returns in Admin</a>`
    );

    return lines.join('\n');
  }

  // ============================================
  // Message builder — RETURN STATUS CHANGE
  // ============================================
  private static buildReturnStatusMessage(
    ret: ReturnStatusNotification
  ): string {
    const emoji: Record<string, string> = {
      APPROVED: '✅',
      REJECTED: '❌',
      IN_TRANSIT: '🚚',
      RECEIVED: '📦',
      INSPECTED: '🔍',
      COMPLETED: '💰',
      REFUNDED: '💰',
    };

    const statusLabel: Record<string, string> = {
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      IN_TRANSIT: 'In Transit',
      RECEIVED: 'Received at Shop',
      INSPECTED: 'Inspected',
      COMPLETED: 'Refund Completed',
      REFUNDED: 'Refunded',
    };

    const e = emoji[ret.status] || 'ℹ️';
    const label = statusLabel[ret.status] || ret.status;

    const lines: string[] = [
      `${e} <b>RETURN ${label.toUpperCase()}</b>`,
      '',
      `🎫 <b>Return:</b> <code>${ret.returnNumber}</code>`,
      `📦 <b>Order:</b> <code>${ret.orderNumber}</code>`,
    ];

    if (ret.note) {
      lines.push(`📝 <b>Note:</b> ${this.escapeHtml(ret.note)}`);
    }

    if (ret.actorName) {
      lines.push(`👨💼 <b>By:</b> ${this.escapeHtml(ret.actorName)}`);
    }

    lines.push('');
    lines.push(
      `👉 <a href="${this.getAdminReturnsUrl()}">View in Admin</a>`
    );

    return lines.join('\n');
  }

  // ============================================
  // URL helpers
  // ============================================
  private static getAdminOrdersUrl(): string {
    const base = process.env.WEB_URL || 'http://localhost:3000';
    return `${base}/admin/orders`;
  }

  private static getAdminReturnsUrl(): string {
    const base = process.env.WEB_URL || 'http://localhost:3000';
    return `${base}/admin/returns`;
  }

  // ============================================
  // Utilities
  // ============================================
  private static escapeHtml(str: string): string {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}