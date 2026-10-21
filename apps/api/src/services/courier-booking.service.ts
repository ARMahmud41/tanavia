import type { PrismaClient } from '@prisma/client';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';

// ============================================
// Types
// ============================================
interface BookCourierInput {
  orderId: string;
  courierId: string;
  weightKg?: number;
  note?: string;
}

interface CourierBookingResult {
  success: boolean;
  consignmentId: string;
  trackingCode?: string;
  trackingUrl?: string;
  courierStatus: string;
  rawResponse: any;
}

// ============================================
// Helper: Format phone for BD
// ============================================
function formatBDPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    return '88' + cleaned;
  }
  if (cleaned.startsWith('8801') && cleaned.length === 13) {
    return cleaned;
  }
  if (cleaned.startsWith('880') && cleaned.length === 13) {
    return cleaned;
  }
  return cleaned;
}

function formatBDPhoneLocal(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('880') && cleaned.length === 13) {
    return '0' + cleaned.slice(3);
  }
  return cleaned;
}

// ============================================
// Courier Booking Service
// ============================================
export class CourierBookingService {
  /**
   * Book a courier for an order.
   */
  static async book(
    input: BookCourierInput,
    prisma: PrismaClient,
    actorId?: string
  ): Promise<CourierBookingResult> {
    const { orderId, courierId, weightKg = 0.5, note } = input;

    // ---- 1. Load order ----
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundError('Order not found');

    // ---- 2. Validate order status ----
    if (order.consignmentId) {
      throw new ConflictError(
        `Order already booked with consignment: ${order.consignmentId}`
      );
    }
    if (order.status === 'DELIVERED') {
      throw new ConflictError('Order already delivered');
    }
    if (order.status === 'CANCELLED') {
      throw new ConflictError('Cannot book cancelled order');
    }
    if (!['PACKED', 'CONFIRMED', 'PLACED'].includes(order.status)) {
      throw new BadRequestError(
        `Order must be PACKED/CONFIRMED/PLACED to book. Current: ${order.status}`
      );
    }

    // ---- 3. Load courier ----
    const courier = await prisma.courier.findUnique({
      where: { id: courierId },
    });
    if (!courier) throw new NotFoundError('Courier not found');
    if (!courier.active) {
      throw new BadRequestError(`Courier "${courier.name}" is inactive`);
    }

    // ---- 4. Call courier API ----
    let result: CourierBookingResult;

    try {
      if (courier.slug === 'steadfast') {
        result = await this.bookSteadfast(order, courier, weightKg, note, prisma);
      } else if (courier.slug === 'pathao') {
        result = await this.bookPathao(order, courier, weightKg, note, prisma);
      } else if (courier.slug === 'redx') {
        result = await this.bookRedX(order, courier, weightKg, note);
      } else {
        // Generic stub
        result = {
          success: true,
          consignmentId: `STUB-${Date.now()}`,
          courierStatus: 'BOOKED',
          rawResponse: { stub: true, courier: courier.slug },
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Courier API failed';
      throw new BadRequestError(`Courier booking failed: ${msg}`);
    }

    // ---- 5. Update order ----
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        courierId: courier.id,
        courier: courier.name,
        consignmentId: result.consignmentId,
        trackingUrl: result.trackingUrl || null,
        courierStatus: result.courierStatus,
        courierStatusDetail: note || null,
        courierBookedAt: new Date(),
        codAmount: order.paymentMethod === 'COD' ? order.total : null,
        status: 'SHIPPED',
      },
    });

    // ---- 6. Audit log ----
    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'ORDER_BOOK_COURIER',
          detail: `Booked ${courier.name} for ${order.orderNumber} -> ${result.consignmentId}`,
        },
      });
    }

    return result;
  }

  // ============================================
  // Steadfast API
  // ============================================
  private static async bookSteadfast(
    order: any,
    courier: any,
    weightKg: number,
    note: string | undefined,
    prisma: PrismaClient
  ): Promise<CourierBookingResult> {
    if (!courier.apiKey || !courier.apiSecret) {
      throw new Error('Steadfast API credentials not configured');
    }

    const baseUrl = courier.apiBaseUrl || 'https://portal.packzy.com/api/v1';

    const itemSummary = order.items
      .map((i: any) => `${i.name} x${i.qty}`)
      .join(', ');

    const payload = {
      invoice: order.orderNumber,
      recipient_name: order.customerName,
      recipient_phone: formatBDPhoneLocal(order.customerPhone),
      recipient_address: [order.address, order.district].filter(Boolean).join(', '),
      cod_amount: order.paymentMethod === 'COD' ? Number(order.total) : 0,
      note: note || '',
      item_description: itemSummary.slice(0, 200),
      delivery_type: 0,
      total_lot: order.items.length,
    };

    const res = await fetch(`${baseUrl}/create_order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': courier.apiKey,
        'Secret-Key': courier.apiSecret,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Steadfast returned invalid JSON: ${text.substring(0, 100)}`);
    }

    if (!res.ok) {
      throw new Error(`Steadfast API error ${res.status}: ${JSON.stringify(data)}`);
    }

    const consignment = data.consignment;
    if (!consignment?.consignment_id) {
      throw new Error(`Invalid Steadfast response: ${JSON.stringify(data)}`);
    }

    return {
      success: true,
      consignmentId: String(consignment.consignment_id),
      trackingCode: consignment.tracking_code,
      trackingUrl: `https://steadfast.com.bd/t/${consignment.tracking_code}`,
      courierStatus: 'BOOKED',
      rawResponse: data,
    };
  }

  // ============================================
  // Pathao API — Reads from .env
  // ============================================
  private static async bookPathao(
    order: any,
    courier: any,
    weightKg: number,
    note: string | undefined,
    prisma: PrismaClient
  ): Promise<CourierBookingResult> {
    // Read from .env (supports both sandbox and production)
    const baseUrl =
      courier.apiBaseUrl ||
      process.env.PATHAO_BASE_URL ||
      'https://api-hermes.pathao.com';

    const clientId = courier.apiKey || process.env.PATHAO_CLIENT_ID || '';
    const clientSecret =
      courier.apiSecret || process.env.PATHAO_CLIENT_SECRET || '';
    const username = process.env.PATHAO_USERNAME || '';
    const password = process.env.PATHAO_PASSWORD || '';
    const storeId = Number(process.env.PATHAO_STORE_ID || 1);

    if (!clientId || !clientSecret || !username || !password) {
      throw new Error(
        'Pathao API credentials missing in .env (CLIENT_ID, CLIENT_SECRET, USERNAME, PASSWORD)'
      );
    }

    console.log('[Pathao] Base URL:', baseUrl);
    console.log('[Pathao] Store ID:', storeId);

    // ---- Step 1: Get access token ----
    let accessToken = courier.apiToken;
    const tokenExpired =
      !courier.apiTokenExpiresAt ||
      new Date(courier.apiTokenExpiresAt).getTime() < Date.now() + 60_000;

    if (!accessToken || tokenExpired) {
      console.log('[Pathao] Requesting new token...');

      const tokenRes = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          username,
          password,
          grant_type: 'password',
        }),
      });

      const tokenText = await tokenRes.text();
      console.log('[Pathao Token Raw Response]:', tokenText.substring(0, 300));

      let tokenData: any;
      try {
        tokenData = JSON.parse(tokenText);
      } catch {
        throw new Error(
          `Pathao Token endpoint returned HTML/Invalid JSON. Check Base URL. Status: ${tokenRes.status}`
        );
      }

      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(
          `Pathao token error (${tokenRes.status}): ${JSON.stringify(tokenData)}`
        );
      }

      accessToken = tokenData.access_token;
      const expiresAt = new Date(
        Date.now() + (tokenData.expires_in || 432000) * 1000
      );

      // Save token to DB
      await prisma.courier.update({
        where: { id: courier.id },
        data: {
          apiToken: accessToken,
          apiTokenExpiresAt: expiresAt,
        },
      });

      console.log('[Pathao] Token saved, expires at:', expiresAt);
    } else {
      console.log('[Pathao] Using cached token');
    }

    // ---- Step 2: Create order ----
    const payload = {
      store_id: storeId,
      merchant_order_id: order.orderNumber,
      recipient_name: order.customerName,
      recipient_phone: formatBDPhoneLocal(order.customerPhone),
      recipient_address: [order.address, order.district]
        .filter(Boolean)
        .join(', '),
      delivery_type: 48, // 48 = Normal Delivery
      item_type: 2, // 2 = Parcel
      special_instruction: note || '',
      item_quantity: order.items.reduce((s: number, i: any) => s + i.qty, 0),
      item_weight: weightKg,
      amount_to_collect:
        order.paymentMethod === 'COD' ? Number(order.total) : 0,
      item_description: order.items
        .map((i: any) => `${i.name} x${i.qty}`)
        .join(', ')
        .slice(0, 200),
    };

    console.log('[Pathao Order Payload]:', JSON.stringify(payload, null, 2));

    const res = await fetch(`${baseUrl}/aladdin/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const orderText = await res.text();
    console.log('[Pathao Order Raw Response]:', orderText.substring(0, 500));

    let data: any;
    try {
      data = JSON.parse(orderText);
    } catch {
      throw new Error(
        `Pathao Order endpoint returned HTML/Invalid JSON. Status: ${res.status}`
      );
    }

    if (!res.ok) {
      throw new Error(
        `Pathao API error ${res.status}: ${JSON.stringify(data)}`
      );
    }

    const consignment = data.data;
    if (!consignment?.consignment_id) {
      throw new Error(`Invalid Pathao response: ${JSON.stringify(data)}`);
    }

    return {
      success: true,
      consignmentId: String(consignment.consignment_id),
      trackingCode: consignment.merchant_order_id,
      trackingUrl: `https://merchant.pathao.com/tracking?consignment_id=${consignment.consignment_id}`,
      courierStatus: 'BOOKED',
      rawResponse: data,
    };
  }

  // ============================================
  // RedX API
  // ============================================
  private static async bookRedX(
    order: any,
    courier: any,
    weightKg: number,
    note: string | undefined
  ): Promise<CourierBookingResult> {
    if (!courier.apiKey) {
      throw new Error('RedX API token not configured');
    }

    const baseUrl =
      courier.apiBaseUrl || 'https://openapi.redx.com.bd/v1.0.0-beta';

    const payload = {
      customer_name: order.customerName,
      customer_phone: formatBDPhoneLocal(order.customerPhone),
      delivery_area: order.district || 'Dhaka',
      customer_address: order.address || '',
      merchant_invoice_id: order.orderNumber,
      cash_collection_amount:
        order.paymentMethod === 'COD' ? Number(order.total) : 0,
      parcel_weight: weightKg,
      value: Number(order.total),
      parcel_details_json: order.items.map((i: any) => ({
        name: i.name,
        quantity: i.qty,
        category: 'Fashion',
      })),
      instruction: note || '',
    };

    const res = await fetch(`${baseUrl}/parcel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-ACCESS-TOKEN': `Bearer ${courier.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`RedX returned invalid JSON: ${text.substring(0, 100)}`);
    }

    if (!res.ok) {
      throw new Error(`RedX API error ${res.status}: ${JSON.stringify(data)}`);
    }

    const trackingId = data.tracking_id || data.parcel_id;
    if (!trackingId) {
      throw new Error(`Invalid RedX response: ${JSON.stringify(data)}`);
    }

    return {
      success: true,
      consignmentId: String(trackingId),
      trackingCode: String(trackingId),
      trackingUrl: `https://redx.com.bd/track-parcel/?trackingId=${trackingId}`,
      courierStatus: 'BOOKED',
      rawResponse: data,
    };
  }

  // ============================================
  // Handle webhook status update
  // ============================================
  static async handleWebhookStatus(
    orderId: string,
    courierStatus: string,
    rawPayload: any,
    prisma: PrismaClient
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { courierRef: true },
    });
    if (!order) return;

    const courier = order.courierRef;
    const status = courierStatus.toLowerCase().trim();

    let orderStatus = order.status;
    let extraData: any = {};
    let attempts = order.courierAttempts || 0;

    if (
      ['picked', 'picked_up', 'in_transit', 'out_for_delivery', 'assigned'].includes(
        status
      )
    ) {
      orderStatus = 'SHIPPED';
    } else if (
      ['delivered', 'delivery_success', 'completed'].includes(status)
    ) {
      orderStatus = 'DELIVERED';
      extraData.courierDeliveredAt = new Date();
    } else if (
      ['returned', 'return', 'delivery_failed', 'cancelled', 'canceled'].includes(
        status
      )
    ) {
      orderStatus = 'RETURNED';
    } else if (['attempt_failed', 'failed', 'on_hold', 'hold'].includes(status)) {
      attempts += 1;
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        courierStatus: status.toUpperCase(),
        courierStatusDetail: JSON.stringify(rawPayload).slice(0, 500),
        courierAttempts: attempts,
        status: orderStatus,
        ...extraData,
      },
    });

    if (orderStatus === 'DELIVERED' && order.paymentMethod === 'COD') {
      try {
        await prisma.transaction.create({
          data: {
            type: 'COD_RECEIVED',
            amount: order.total,
            orderId: order.id,
            note: `COD collected via ${courier?.name || 'courier'}`,
            confirmedBy: order.createdById || null,
          },
        });
      } catch {}
    }

    if (orderStatus === 'RETURNED' && courier) {
      const existing = await prisma.courierReturn.findUnique({
        where: { orderId: order.id },
      });

      if (!existing) {
        let reason: any = 'OTHER';
        if (status.includes('refus')) reason = 'CUSTOMER_REFUSED';
        else if (status.includes('reach')) reason = 'NOT_REACHABLE';
        else if (status.includes('address')) reason = 'WRONG_ADDRESS';
        else if (status.includes('cancel')) reason = 'CUSTOMER_CANCELLED';
        else if (status.includes('damag')) reason = 'DAMAGED_IN_TRANSIT';
        else if (status.includes('lost')) reason = 'LOST';

        let outboundFee = 0;
        let returnFee = 0;
        try {
          const rate = await prisma.courierRate.findFirst({
            where: {
              courierId: courier.id,
              district: order.district || 'Dhaka',
              active: true,
            },
          });
          if (rate) {
            outboundFee = Number(rate.deliveryFee);
            returnFee = Number(rate.returnFee);
          }
        } catch {}

        await prisma.courierReturn.create({
          data: {
            orderId: order.id,
            courierId: courier.id,
            consignmentId: order.consignmentId,
            reason,
            reasonNote: `Auto-created from webhook: ${status}`,
            outboundFee,
            returnFee,
            totalLoss: outboundFee + returnFee,
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: null,
        actor: 'WEBHOOK',
        action: 'COURIER_STATUS_WEBHOOK',
        detail: `${order.orderNumber}: ${status} -> order ${orderStatus}`,
      },
    });

    return updated;
  }

  static async syncStatus(
    orderId: string,
    prisma: PrismaClient,
    actorId?: string
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { courierRef: true },
    });
    if (!order) throw new NotFoundError('Order not found');
    if (!order.courierRef || !order.consignmentId) {
      throw new BadRequestError('Order not booked with any courier');
    }

    const courier = order.courierRef;
    let newStatus = order.courierStatus;

    try {
      if (courier.slug === 'steadfast' && courier.apiKey && courier.apiSecret) {
        const res = await fetch(
          `${courier.apiBaseUrl || 'https://portal.packzy.com/api/v1'}/status_by_cid/${order.consignmentId}`,
          {
            headers: {
              'Api-Key': courier.apiKey,
              'Secret-Key': courier.apiSecret,
            },
          }
        );
        const data = await res.json();
        const deliveryData = data as any;
        newStatus = deliveryData?.delivery_status || newStatus;
      }
    } catch (err) {
      console.error('Courier sync failed:', err);
    }

    const updated = await this.handleWebhookStatus(
      order.id,
      newStatus || '',
      { source: 'sync', actorId },
      prisma
    );

    return updated;
  }
}