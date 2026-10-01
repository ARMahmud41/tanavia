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
  // Message builder
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

  private static getAdminOrdersUrl(): string {
    const base = process.env.WEB_URL || 'http://localhost:3000';
    return `${base}/admin/orders`;
  }

  private static escapeHtml(str: string): string {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}