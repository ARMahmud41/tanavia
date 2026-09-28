// ============================================
// WhatsApp Notification Service
// Unified interface — swaps providers via .env
// Providers: callmebot (free) | wati | interakt | twilio
// ============================================

type Provider = 'callmebot' | 'wati' | 'interakt' | 'twilio';

interface OrderNotification {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  district: string;
  total: string | number;
  paymentMethod: string;
  itemsCount: number;
  channel: string;
}

export class WhatsAppService {
  /**
   * Notify admin of a new order
   */
  static async notifyNewOrder(order: OrderNotification): Promise<void> {
    if (process.env.WHATSAPP_ENABLED === 'false') {
      console.log('[WhatsApp] Disabled — skipping');
      return;
    }

    const message = this.buildNewOrderMessage(order);

    try {
      await this.send(message);
      console.log(
        `[WhatsApp] ✅ Sent notification for ${order.orderNumber} via ${this.getProvider()}`
      );
    } catch (err) {
      // Never throw — notification failure must NOT break order flow
      console.error('[WhatsApp] Failed to send:', err);
    }
  }

  /**
   * Public: send a custom message (for tests / manual sends)
   */
  static async sendCustomMessage(message: string): Promise<void> {
    await this.send(message);
  }

  // ============================================
  // Provider dispatcher
  // ============================================

  private static getProvider(): Provider {
    const p = (process.env.WHATSAPP_PROVIDER || 'callmebot').toLowerCase();
    if (p === 'wati' || p === 'interakt' || p === 'twilio') {
      return p as Provider;
    }
    return 'callmebot';
  }

  private static async send(message: string): Promise<void> {
    const provider = this.getProvider();

    switch (provider) {
      case 'callmebot':
        return this.sendViaCallMeBot(message);
      case 'wati':
        return this.sendViaWati(message);
      case 'interakt':
        return this.sendViaInterakt(message);
      case 'twilio':
        return this.sendViaTwilio(message);
      default:
        throw new Error(`Unknown WhatsApp provider: ${provider}`);
    }
  }

  // ============================================
  // CALLMEBOT (Free — testing)
  // ============================================
  private static async sendViaCallMeBot(message: string): Promise<void> {
    const phone = process.env.WHATSAPP_ADMIN_PHONE;
    const apiKey = process.env.WHATSAPP_CALLMEBOT_API_KEY;

    if (!phone || !apiKey) {
      throw new Error(
        'CallMeBot: WHATSAPP_ADMIN_PHONE or WHATSAPP_CALLMEBOT_API_KEY missing'
      );
    }

    const url =
      `https://api.callmebot.com/whatsapp.php?` +
      `phone=${encodeURIComponent(phone)}` +
      `&text=${encodeURIComponent(message)}` +
      `&apikey=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(
        `CallMeBot API error: ${res.status} ${res.statusText}`
      );
    }
  }

  // ============================================
  // WATI (Business, paid)
  // Docs: https://docs.wati.io/
  // ============================================
  private static async sendViaWati(message: string): Promise<void> {
    const apiUrl = process.env.WHATSAPP_WATI_API_URL;
    const token = process.env.WHATSAPP_WATI_TOKEN;
    const adminNumber = process.env.WHATSAPP_WATI_ADMIN_NUMBER;

    if (!apiUrl || !token || !adminNumber) {
      throw new Error(
        'WATI: WHATSAPP_WATI_API_URL, WHATSAPP_WATI_TOKEN, WHATSAPP_WATI_ADMIN_NUMBER required'
      );
    }

    // WATI expects phone without '+' prefix
    const phone = adminNumber.replace(/^\+/, '');

    const res = await fetch(
      `${apiUrl}/api/v1/sendSessionMessage/${phone}?messageText=${encodeURIComponent(message)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `WATI API error: ${res.status} — ${errorText}`
      );
    }
  }

  // ============================================
  // INTERAKT (Business, paid)
  // Docs: https://www.interakt.shop/resource-center/
  // ============================================
  private static async sendViaInterakt(message: string): Promise<void> {
    const apiKey = process.env.WHATSAPP_INTERAKT_API_KEY;
    const adminNumber = process.env.WHATSAPP_INTERAKT_ADMIN_NUMBER;

    if (!apiKey || !adminNumber) {
      throw new Error(
        'Interakt: WHATSAPP_INTERAKT_API_KEY, WHATSAPP_INTERAKT_ADMIN_NUMBER required'
      );
    }

    // Interakt expects phone with country code prefix, no '+'
    const phone = adminNumber.replace(/^\+/, '');

    const res = await fetch(
      'https://api.interakt.ai/v1/public/message/',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countryCode: '+88',
          phoneNumber: phone.replace(/^88/, ''),
          type: 'Text',
          data: { message },
        }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `Interakt API error: ${res.status} — ${errorText}`
      );
    }
  }

  // ============================================
  // TWILIO WHATSAPP (Business, paid)
  // Docs: https://www.twilio.com/docs/whatsapp
  // ============================================
  private static async sendViaTwilio(message: string): Promise<void> {
    const sid = process.env.WHATSAPP_TWILIO_ACCOUNT_SID;
    const authToken = process.env.WHATSAPP_TWILIO_AUTH_TOKEN;
    const from = process.env.WHATSAPP_TWILIO_FROM;
    const to = process.env.WHATSAPP_TWILIO_TO;

    if (!sid || !authToken || !from || !to) {
      throw new Error(
        'Twilio: WHATSAPP_TWILIO_ACCOUNT_SID, WHATSAPP_TWILIO_AUTH_TOKEN, WHATSAPP_TWILIO_FROM, WHATSAPP_TWILIO_TO required'
      );
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const auth = Buffer.from(`${sid}:${authToken}`).toString('base64');

    const body = new URLSearchParams({
      From: `whatsapp:${from}`,
      To: `whatsapp:${to}`,
      Body: message,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `Twilio API error: ${res.status} — ${errorText}`
      );
    }
  }

  // ============================================
  // Message builder
  // ============================================
  private static buildNewOrderMessage(order: OrderNotification): string {
    const tk = (n: string | number) => '৳' + Number(n).toLocaleString('en-BD');

    const lines = [
      '🛒 NEW ORDER RECEIVED!',
      '',
      `📦 Order: ${order.orderNumber}`,
      `👤 Customer: ${order.customerName}`,
      `📞 Phone: ${order.customerPhone}`,
      `📍 District: ${order.district}`,
      `💰 Total: ${tk(order.total)}`,
      `💳 Payment: ${order.paymentMethod}`,
      `📦 Items: ${order.itemsCount}`,
      `🌐 Channel: ${order.channel}`,
      '',
      '👉 Open Admin Panel:',
      `${process.env.WEB_URL || 'http://localhost:3000'}/admin/orders`,
    ];

    return lines.join('\n');
  }
}