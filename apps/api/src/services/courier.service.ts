import type { PrismaClient } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

type CourierName = 'steadfast' | 'pathao';

interface CourierCredentials {
  steadfast: {
    apiKey?: string;
    secretKey?: string;
    baseUrl?: string;
    enabled: boolean;
  };
  pathao: {
    clientId?: string;
    clientSecret?: string;
    storeId?: string;
    baseUrl?: string;
    enabled: boolean;
  };
}

export class CourierService {
  /**
   * Load courier settings from the Setting table.
   */
  static async getSettings(prisma: PrismaClient) {
    const rows = await prisma.setting.findMany({
      where: { key: { in: ['courier.active', 'courier.steadfast', 'courier.pathao'] } },
    });

    const map: Record<string, any> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }

    return {
      active: map['courier.active'] || 'steadfast',
      steadfast: {
        apiKey: map['courier.steadfast']?.apiKey || '',
        secretKey: map['courier.steadfast']?.secretKey || '',
        baseUrl: map['courier.steadfast']?.baseUrl || 'https://portal.packzy.com/api/v1',
        enabled: map['courier.steadfast']?.enabled || false,
      },
      pathao: {
        clientId: map['courier.pathao']?.clientId || '',
        clientSecret: map['courier.pathao']?.clientSecret || '',
        storeId: map['courier.pathao']?.storeId || '',
        baseUrl: map['courier.pathao']?.baseUrl || 'https://api-hermes.pathao.com',
        enabled: map['courier.pathao']?.enabled || false,
      },
    };
  }

  /**
   * Save courier settings.
   */
  static async saveSettings(
    input: Partial<CourierCredentials> & { active?: CourierName },
    prisma: PrismaClient
  ) {
    const ops: any[] = [];

    if (input.active) {
      ops.push(
        prisma.setting.upsert({
          where: { key: 'courier.active' },
          update: { value: input.active },
          create: { key: 'courier.active', value: input.active },
        })
      );
    }

    if (input.steadfast) {
      ops.push(
        prisma.setting.upsert({
          where: { key: 'courier.steadfast' },
          update: { value: input.steadfast as any },
          create: { key: 'courier.steadfast', value: input.steadfast as any },
        })
      );
    }

    if (input.pathao) {
      ops.push(
        prisma.setting.upsert({
          where: { key: 'courier.pathao' },
          update: { value: input.pathao as any },
          create: { key: 'courier.pathao', value: input.pathao as any },
        })
      );
    }

    await prisma.$transaction(ops);

    return this.getSettings(prisma);
  }

  /**
   * Book a courier for an order.
   * In production this calls the real API; for now, it stubs the call.
   */
  static async book(orderId: string, prisma: PrismaClient) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        channel: true,
        customerName: true,
        customerPhone: true,
        address: true,
        district: true,
        total: true,
        paymentMethod: true,
        courier: true,
        consignmentId: true,
      },
    });
    if (!order) throw new NotFoundError('Order not found');

    if (order.channel === 'OFFLINE') {
      throw new BadRequestError('Offline orders cannot be booked with courier');
    }
    if (order.consignmentId) {
      throw new BadRequestError('This order is already booked');
    }
    if (!order.address || !order.district) {
      throw new BadRequestError('Order is missing delivery address');
    }

    const settings = await this.getSettings(prisma);
    const active = settings.active as CourierName;

    // ============================================
    // TODO: Replace this stub with real API call
    // ============================================
    // const credentials = settings[active];
    // if (!credentials.enabled) throw new BadRequestError('Courier not enabled');
    // const response = await fetch(`${credentials.baseUrl}/create_order`, {
    //   method: 'POST',
    //   headers: {
    //     'Api-Key': credentials.apiKey,
    //     'Secret-Key': credentials.secretKey,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     invoice: order.orderNumber,
    //     recipient_name: order.customerName,
    //     recipient_phone: order.customerPhone,
    //     recipient_address: `${order.address}, ${order.district}`,
    //     cod_amount: order.paymentMethod === 'COD' ? order.total : 0,
    //   }),
    // });
    // const data = await response.json();
    // const consignmentId = data.consignment_id;

    // Stub consignment ID for now
    const prefix = active === 'steadfast' ? 'SF' : 'PT';
    const consignmentId = prefix + Date.now().toString().slice(-9);

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        courier: active,
        consignmentId,
        courierStatus: 'BOOKED',
        events: {
          create: {
            status: 'COURIER_BOOKED',
            note: `Booked with ${active} — ${consignmentId}`,
            actor: 'system',
          },
        },
      },
      select: {
        id: true,
        orderNumber: true,
        courier: true,
        consignmentId: true,
        courierStatus: true,
      },
    });

    return updated;
  }

  /**
   * Cancel a courier booking (stub).
   */
  static async cancel(orderId: string, prisma: PrismaClient) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, consignmentId: true, courier: true },
    });
    if (!order) throw new NotFoundError('Order not found');
    if (!order.consignmentId) {
      throw new BadRequestError('Order has no courier booking');
    }

    // TODO: real API cancel call

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        consignmentId: null,
        courierStatus: 'CANCELLED',
        events: {
          create: {
            status: 'COURIER_CANCELLED',
            note: `Booking cancelled for ${order.orderNumber}`,
            actor: 'system',
          },
        },
      },
      select: {
        id: true,
        orderNumber: true,
        consignmentId: true,
        courierStatus: true,
      },
    });

    return updated;
  }

  /**
   * Update courier status from a webhook.
   */
  static async updateStatusFromWebhook(
    consignmentId: string,
    status: string,
    note: string | undefined,
    prisma: PrismaClient
  ) {
    const order = await prisma.order.findFirst({
      where: { consignmentId },
      select: { id: true },
    });
    if (!order) return { updated: false };

    await prisma.order.update({
      where: { id: order.id },
      data: {
        courierStatus: status,
        events: {
          create: {
            status: `COURIER_${status.toUpperCase()}`,
            note: note || `Courier status: ${status}`,
            actor: 'courier-webhook',
          },
        },
      },
    });

    return { updated: true };
  }
}