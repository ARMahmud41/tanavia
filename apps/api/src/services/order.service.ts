import type { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { StockService } from './stock.service.js';
import { WhatsAppService } from './whatsapp.service.js';
import { TelegramService } from './telegram.service.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';

type PaymentMethod = 'COD' | 'BKASH' | 'NAGAD' | 'ROCKET' | 'CARD' | 'CASH';
type OrderChannel = 'ONLINE' | 'OFFLINE';

interface OrderItemInput {
  productId: string;
  size: string;
  color: string;
  qty: number;
}

interface PlaceOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address?: string;
  district?: string;
  note?: string;
  paymentMethod: PaymentMethod;
  paymentTxId?: string;
  couponCode?: string;
  items: OrderItemInput[];
}

interface PlaceOfflineOrderInput {
  customerName?: string;
  customerPhone?: string;
  note?: string;
  paymentMethod: 'CASH' | 'BKASH' | 'NAGAD' | 'CARD';
  items: OrderItemInput[];
  discountAmount?: number;
  shiftId?: string;
}

interface ListFilters {
  status?: string;
  channel?: OrderChannel;
  paymentStatus?: string;
  paymentMethod?: string;
  search?: string;
  from?: string;
  to?: string;
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
  page?: number;
  limit?: number;
}

// ============================================
// Selects
// ============================================

const ORDER_ITEM_SELECT = {
  id: true,
  productId: true,
  name: true,
  size: true,
  color: true,
  qty: true,
  price: true,
  cost: true,
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
    },
  },
};

const ORDER_SELECT = {
  id: true,
  orderNumber: true,
  channel: true,
  status: true,
  customerName: true,
  customerPhone: true,
  customerEmail: true,
  address: true,
  district: true,
  note: true,
  subtotal: true,
  discount: true,
  deliveryFee: true,
  total: true,
  couponCode: true,
  paymentMethod: true,
  paymentStatus: true,
  paymentTxId: true,
  courier: true,
  courierId: true,
  courierRef: {
    select: { id: true, name: true, slug: true, logo: true },
  },
  consignmentId: true,
  courierStatus: true,
  courierStatusDetail: true,
  courierBookedAt: true,
  courierDeliveredAt: true,
  courierAttempts: true,
  codAmount: true,
  codSettledAt: true,
  settlementId: true,
  trackingUrl: true,
  createdAt: true,
  updatedAt: true,
  items: { select: ORDER_ITEM_SELECT },
};

// ============================================
// Order Service
// ============================================

export class OrderService {
  /**
   * Generate a unique order number: TN-XXXXXX
   */
  private static async generateOrderNumber(
    prisma: PrismaClient | Prisma.TransactionClient
  ): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const num = 'TN-' + String(Math.floor(100000 + Math.random() * 900000));
      const existing = await prisma.order.findUnique({
        where: { orderNumber: num },
        select: { id: true },
      });
      if (!existing) return num;
    }
    throw new Error('Failed to generate unique order number');
  }

  /**
   * Validate coupon and compute discount.
   */
  private static async applyCoupon(
    couponCode: string,
    subtotal: number,
    prisma: PrismaClient | Prisma.TransactionClient
  ): Promise<{ discount: number; code: string }> {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode.toUpperCase() },
    });

    if (!coupon) {
      throw new BadRequestError('Invalid coupon code');
    }
    if (!coupon.active) {
      throw new BadRequestError('This coupon is not active');
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestError('This coupon has expired');
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestError('This coupon has reached its usage limit');
    }
    if (subtotal < Number(coupon.minSpend)) {
      throw new BadRequestError(
        `Minimum spend ${coupon.minSpend} required for this coupon`
      );
    }

    let discount = 0;
    if (coupon.type === 'PERCENT') {
      discount = Math.round((subtotal * Number(coupon.value)) / 100);
      if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
        discount = Number(coupon.maxDiscount);
      }
    } else if (coupon.type === 'FIXED') {
      discount = Number(coupon.value);
      if (discount > subtotal) discount = subtotal;
    }

    return { discount, code: coupon.code };
  }

  /**
   * Compute delivery fee based on settings.
   */
  private static computeDeliveryFee(
    subtotal: number,
    district: string | undefined,
    freeShipOver: number,
    insideFee: number,
    outsideFee: number,
    hasShippingCoupon: boolean
  ): number {
    if (hasShippingCoupon) return 0;
    if (subtotal >= freeShipOver) return 0;
    const isDhaka = district?.toLowerCase().includes('dhaka') ?? true;
    return isDhaka ? insideFee : outsideFee;
  }

  /**
   * Place an ONLINE order (from website).
   */
  static async placeOnlineOrder(
    input: PlaceOrderInput,
    prisma: PrismaClient
  ) {
    if (!input.items || input.items.length === 0) {
      throw new BadRequestError('At least one item is required');
    }

    const settings = await this.getSettings(prisma);
    const freeShipOver = Number(settings.freeShipOver || 1000);
    const insideFee = Number(settings.deliveryInside || 70);
    const outsideFee = Number(settings.deliveryOutside || 130);

    const order = await prisma.$transaction(
      async (tx) => {
        const lineItems: Array<{
          productId: string;
          variantId: string;
          name: string;
          size: string;
          color: string;
          qty: number;
          price: number;
          cost: number;
        }> = [];

        let subtotal = 0;

        for (const item of input.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: {
              id: true,
              name: true,
              active: true,
              price: true,
              cost: true,
              discount: true,
            },
          });

          if (!product) {
            throw new NotFoundError(`Product not found: ${item.productId}`);
          }
          if (!product.active) {
            throw new BadRequestError(`${product.name} is not available`);
          }

          const variant = await tx.variant.findUnique({
            where: {
              productId_size_color: {
                productId: item.productId,
                size: item.size,
                color: item.color,
              },
            },
          });

          if (!variant) {
            throw new BadRequestError(
              `${product.name} — invalid size/color combination`
            );
          }

          const available = variant.qty - variant.reserved;
          if (available < item.qty) {
            throw new ConflictError(
              `${product.name} (${item.size}/${item.color}) — only ${available} left in stock`
            );
          }

          const basePrice = Number(product.price);
          const discountPct = Number(product.discount || 0);
          const finalPrice = Math.round(basePrice * (1 - discountPct / 100));

          lineItems.push({
            productId: product.id,
            variantId: variant.id,
            name: product.name,
            size: item.size,
            color: item.color,
            qty: item.qty,
            price: finalPrice,
            cost: Number(product.cost),
          });

          subtotal += finalPrice * item.qty;
        }

        let discount = 0;
        let couponCode: string | null = null;
        let isShippingCoupon = false;

        if (input.couponCode) {
          const result = await this.applyCoupon(input.couponCode, subtotal, tx);
          discount = result.discount;
          couponCode = result.code;

          const coupon = await tx.coupon.findUnique({
            where: { code: couponCode },
          });
          isShippingCoupon = coupon?.type === 'SHIPPING';
        }

        const deliveryFee = this.computeDeliveryFee(
          subtotal,
          input.district,
          freeShipOver,
          insideFee,
          outsideFee,
          isShippingCoupon
        );

        const total = Math.max(0, subtotal - discount) + deliveryFee;

        let customer = await tx.user.findUnique({
          where: { phone: input.customerPhone },
          select: { id: true },
        });

        if (!customer) {
          const placeholderEmail = `guest_${input.customerPhone}_${Date.now()}@tanavia.local`;
          customer = await tx.user.create({
            data: {
              name: input.customerName,
              email: placeholderEmail,
              phone: input.customerPhone,
              passwordHash: randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, ''),
              role: 'CUSTOMER',
            },
            select: { id: true },
          });
        }

        const orderNumber = await this.generateOrderNumber(tx);

        const paymentStatus =
          input.paymentMethod === 'COD' ? 'WAITING' : 'REVIEW';

        const orderId = randomUUID();

        await tx.$executeRaw`
          INSERT INTO "Order" (
            id, "orderNumber", channel, "userId", status,
            "customerName", "customerPhone", "customerEmail",
            address, district, note, subtotal, discount,
            "deliveryFee", total, "couponCode",
            "paymentMethod", "paymentStatus", "paymentTxId",
            "createdAt", "updatedAt"
          ) VALUES (
            ${orderId},
            ${orderNumber},
            'ONLINE'::"OrderChannel",
            ${customer.id},
            'PLACED'::"OrderStatus",
            ${input.customerName},
            ${input.customerPhone},
            ${input.customerEmail ?? null},
            ${input.address ?? null},
            ${input.district ?? null},
            ${input.note ?? null},
            ${subtotal},
            ${discount},
            ${deliveryFee},
            ${total},
            ${couponCode},
            ${input.paymentMethod}::"PaymentMethod",
            ${paymentStatus}::"PaymentStatus",
            ${input.paymentTxId ?? null},
            NOW(), NOW()
          )
        `;

        for (const li of lineItems) {
          await tx.$executeRaw`
            INSERT INTO "OrderItem" (
              id, "orderId", "productId", name, size, color, qty, price, cost
            ) VALUES (
              ${randomUUID()}, ${orderId}, ${li.productId},
              ${li.name}, ${li.size}, ${li.color}, ${li.qty},
              ${li.price}, ${li.cost}
            )
          `;
        }

        await tx.$executeRaw`
          INSERT INTO "OrderEvent" (id, "orderId", status, note, actor, "createdAt")
          VALUES (
            ${randomUUID()}, ${orderId}, 'PLACED',
            'Order placed by customer', 'system', NOW()
          )
        `;

        const createdOrder = await tx.order.findUnique({
          where: { id: orderId },
          select: ORDER_SELECT,
        });

        if (!createdOrder) {
          throw new Error('Order created but could not be fetched');
        }

        for (const li of lineItems) {
          const variant = await tx.variant.findUnique({
            where: { id: li.variantId },
          });
          if (!variant) continue;

          const beforeQty = variant.qty;
          const beforeReserved = variant.reserved;

          await tx.variant.update({
            where: { id: li.variantId },
            data: {
              reserved: { increment: li.qty },
            },
          });

          await tx.product.update({
            where: { id: li.productId },
            data: { soldCount: { increment: li.qty } },
          });

          await StockService.log(
            {
              productId: li.productId,
              variantId: li.variantId,
              type: 'RESERVE',
              qty: li.qty,
              before: beforeQty,
              after: beforeQty,
              reason: `Reserved for online order ${orderNumber} (reserved: ${beforeReserved} → ${beforeReserved + li.qty})`,
              refId: createdOrder.id,
            },
            tx
          );
        }

        if (couponCode) {
          await tx.coupon.update({
            where: { code: couponCode },
            data: { usedCount: { increment: 1 } },
          });
        }

        return createdOrder;
      },
      {
        isolationLevel: 'Serializable',
        timeout: 15000,
      }
    );

    WhatsAppService.notifyNewOrder({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      district: order.district || '—',
      total: order.total,
      paymentMethod: order.paymentMethod,
      itemsCount: order.items?.length || 0,
      channel: 'ONLINE',
    }).catch((err) => {
      console.error('[Order] WhatsApp notification failed:', err);
    });

    TelegramService.notifyNewOrder({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      district: order.district || '—',
      address: order.address,
      total: order.total,
      paymentMethod: order.paymentMethod,
      itemsCount: order.items?.length || 0,
      channel: 'ONLINE',
      items: order.items?.map((it) => ({
        name: it.name,
        size: it.size,
        color: it.color,
        qty: it.qty,
      })),
    }).catch((err) => {
      console.error('[Order] Telegram notification failed:', err);
    });

    return order;
  }

  /**
   * Load shop settings from DB.
   */
  private static async getSettings(prisma: PrismaClient) {
    const rows = await prisma.setting.findMany();
    const map: Record<string, any> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }

    return {
      freeShipOver: map['freeShipOver'] ?? 1000,
      deliveryInside: map['deliveryInside'] ?? 70,
      deliveryOutside: map['deliveryOutside'] ?? 130,
    };
  }

  /**
   * Place an OFFLINE order (POS / physical shop).
   */
  static async placeOfflineOrder(
    input: PlaceOfflineOrderInput,
    prisma: PrismaClient,
    actorId?: string
  ) {
    if (!input.items || input.items.length === 0) {
      throw new BadRequestError('At least one item is required');
    }

    return prisma.$transaction(
      async (tx) => {
        const lineItems: Array<{
          productId: string;
          variantId: string;
          name: string;
          size: string;
          color: string;
          qty: number;
          price: number;
          cost: number;
        }> = [];

        let subtotal = 0;

        for (const item of input.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: {
              id: true,
              name: true,
              active: true,
              price: true,
              cost: true,
              discount: true,
            },
          });

          if (!product) {
            throw new NotFoundError(`Product not found: ${item.productId}`);
          }

          const variant = await tx.variant.findUnique({
            where: {
              productId_size_color: {
                productId: item.productId,
                size: item.size,
                color: item.color,
              },
            },
          });

          if (!variant) {
            throw new BadRequestError(
              `${product.name} — invalid size/color combination`
            );
          }

          const available = variant.qty - variant.reserved;
          if (available < item.qty) {
            throw new ConflictError(
              `${product.name} (${item.size}/${item.color}) — only ${available} available (${variant.reserved} reserved for online orders)`
            );
          }

          const basePrice = Number(product.price);
          const discountPct = Number(product.discount || 0);
          const finalPrice = Math.round(basePrice * (1 - discountPct / 100));

          lineItems.push({
            productId: product.id,
            variantId: variant.id,
            name: product.name,
            size: item.size,
            color: item.color,
            qty: item.qty,
            price: finalPrice,
            cost: Number(product.cost),
          });

          subtotal += finalPrice * item.qty;
        }

        const discount = Math.min(input.discountAmount || 0, subtotal);
        const total = subtotal - discount;
        const orderNumber = await this.generateOrderNumber(tx);

        const orderId = randomUUID();

        await tx.$executeRaw`
          INSERT INTO "Order" (
            id, "orderNumber", channel, "shiftId", "userId", status,
            "customerName", "customerPhone", note, subtotal, discount,
            "deliveryFee", total, "paymentMethod", "paymentStatus",
            "createdAt", "updatedAt"
          ) VALUES (
            ${orderId},
            ${orderNumber},
            'OFFLINE'::"OrderChannel",
            ${input.shiftId ?? null},
            ${actorId ?? null},
            'DELIVERED'::"OrderStatus",
            ${input.customerName || 'Walk-in Customer'},
            ${input.customerPhone || ''},
            ${input.note ?? null},
            ${subtotal},
            ${discount},
            0,
            ${total},
            ${input.paymentMethod}::"PaymentMethod",
            'PAID'::"PaymentStatus",
            NOW(), NOW()
          )
        `;

        for (const li of lineItems) {
          await tx.$executeRaw`
            INSERT INTO "OrderItem" (
              id, "orderId", "productId", name, size, color, qty, price, cost
            ) VALUES (
              ${randomUUID()}, ${orderId}, ${li.productId},
              ${li.name}, ${li.size}, ${li.color}, ${li.qty},
              ${li.price}, ${li.cost}
            )
          `;
        }

        for (const evt of [
          { status: 'PLACED', note: 'Offline sale', actor: actorId || 'system' },
          {
            status: 'DELIVERED',
            note: 'Completed at counter',
            actor: actorId || 'system',
          },
        ]) {
          await tx.$executeRaw`
            INSERT INTO "OrderEvent" (id, "orderId", status, note, actor, "createdAt")
            VALUES (
              ${randomUUID()}, ${orderId}, ${evt.status},
              ${evt.note}, ${evt.actor}, NOW()
            )
          `;
        }

        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: ORDER_SELECT,
        });

        if (!order) {
          throw new Error('Order created but could not be fetched');
        }

        for (const li of lineItems) {
          const variant = await tx.variant.findUnique({
            where: { id: li.variantId },
          });
          if (!variant) continue;

          const before = variant.qty;
          const after = before - li.qty;

          await tx.variant.update({
            where: { id: li.variantId },
            data: { qty: after },
          });

          await tx.product.update({
            where: { id: li.productId },
            data: { soldCount: { increment: li.qty } },
          });

          await StockService.log(
            {
              productId: li.productId,
              variantId: li.variantId,
              type: 'SALE_OFFLINE',
              qty: -li.qty,
              before,
              after,
              reason: `Offline sale ${orderNumber}`,
              refId: order.id,
              actorId,
            },
            tx
          );
        }

        return order;
      },
      {
        isolationLevel: 'Serializable',
        timeout: 15000,
      }
    );
  }

  /**
   * Get order by ID (role-aware).
   *
   * - ADMIN: full data including cost/profit/adminNote
   * - STAFF: hidden fields (cost, profit, adminNote) removed from response
   *          Staff can only see their OWN offline sales, or ONLINE (read-only)
   */
  static async getById(
    id: string,
    prisma: PrismaClient,
    options?: { role?: 'STAFF' | 'ADMIN'; userId?: string }
  ) {
    const isAdmin = options?.role === 'ADMIN';
    const userId = options?.userId;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        channel: true,
        status: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        address: true,
        district: true,
        note: true,
        subtotal: true,
        discount: true,
        deliveryFee: true,
        total: true,
        couponCode: true,
        paymentMethod: true,
        paymentStatus: true,
        paymentTxId: true,
        senderPhone: isAdmin ? true : false,
        verifiedAt: isAdmin ? true : false,
        codSettledAt: isAdmin ? true : false,
        courier: true,
        consignmentId: true,
        courierStatus: true,
        trackingUrl: true,
        createdAt: true,
        updatedAt: true,
        shiftId: isAdmin ? true : false,
        createdById: true, // always select — needed for authorization check
        cancelReason: isAdmin ? true : false,
        adminNote: isAdmin ? true : false,
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: {
          select: {
            id: true,
            productId: true,
            name: true,
            size: true,
            color: true,
            qty: true,
            price: true,
            cost: isAdmin ? true : false,
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
              },
            },
          },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
        transactions: isAdmin
          ? {
              select: {
                id: true,
                type: true,
                status: true,
                amount: true,
                method: true,
                reference: true,
                createdAt: true,
              },
            }
          : false,
      },
    });

    if (!order) throw new NotFoundError('Order not found');

    // Role-based authorization
    if (!isAdmin) {
      console.log('[DEBUG] getById service:', JSON.stringify({
        orderId: order.id,
        orderCreatedById: order.createdById,
        requestUserId: userId,
        isAdmin,
        match: order.createdById === userId,
      }));

      // STAFF can only see:
      // - Their own OFFLINE sales
      // - Any ONLINE order (read-only)
      if (order.channel === 'OFFLINE' && order.createdById !== userId) {
        throw new NotFoundError('Order not found');
      }
    }

    // Compute profit (admin only)
    if (isAdmin) {
      const items = (order as any).items || [];
      const profit =
        items.reduce(
          (sum: number, it: any) =>
            sum + (Number(it.price) - Number(it.cost || 0)) * it.qty,
          0
        ) - Number(order.discount || 0);

      return { ...order, profit };
    }

    // ─── Strip internal fields before returning to STAFF ───
    if (!isAdmin) {
      // Remove sensitive/internal fields from response
      const sanitized = { ...order } as any;
      delete sanitized.createdById;
      delete sanitized.shiftId;
      delete sanitized.cancelReason;
      delete sanitized.adminNote;
      delete sanitized.senderPhone;
      delete sanitized.verifiedAt;
      delete sanitized.codSettledAt;
      delete sanitized.transactions;
      // Also strip cost from items
      if (Array.isArray(sanitized.items)) {
        sanitized.items = sanitized.items.map((it: any) => {
          const { cost, ...rest } = it;
          return rest;
        });
      }
      return sanitized;
    }

    return order;
  }

  /**
   * Get order by order number (public track).
   */
  static async getByOrderNumber(orderNumber: string, prisma: PrismaClient) {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        channel: true,
        customerName: true,
        customerPhone: true,
        address: true,
        district: true,
        subtotal: true,
        discount: true,
        deliveryFee: true,
        total: true,
        paymentMethod: true,
        paymentStatus: true,
        courier: true,
        consignmentId: true,
        courierStatus: true,
        createdAt: true,
        updatedAt: true,
        items: { select: ORDER_ITEM_SELECT },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  /**
   * List orders (role-aware).
   *
   * - ADMIN: sees all orders (ONLINE + OFFLINE), with cost/profit/adminNote
   * - STAFF: sees only their own OFFLINE sales, or ONLINE (read-only, no cost)
   *          Never sees unitCost, profit, adminNote from other staff
   */
  static async list(
    filters: ListFilters & {
      role?: 'STAFF' | 'ADMIN';
      userId?: string;
    },
    prisma: PrismaClient
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 25));
    const skip = (page - 1) * limit;

    const isAdmin = filters.role === 'ADMIN';
    const userId = filters.userId;

    const where: Prisma.OrderWhereInput = {};

    // ---- Channel scoping ----
    if (isAdmin) {
      // Admin: respect channel filter or show all
      if (filters.channel) where.channel = filters.channel;
    } else {
      // Staff: default OFFLINE + own sales
      if (filters.channel === 'ONLINE') {
        where.channel = 'ONLINE';
      } else {
        where.channel = 'OFFLINE';
        if (userId) where.createdById = userId;
      }
    }

    // ---- Status filter ----
    if (filters.status) {
      where.status = filters.status.toUpperCase() as any;
    }

    // ---- Payment status filter ----
    if (filters.paymentStatus) {
      where.paymentStatus = filters.paymentStatus.toUpperCase() as any;
    }

    // ---- Payment method filter ----
    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod.toUpperCase() as any;
    }

    // ---- Search ----
    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
      ];
    }

    // ---- Date range ----
    if (filters.from || filters.to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filters.from) createdAt.gte = new Date(filters.from);
      if (filters.to) {
        const to = new Date(filters.to);
        to.setHours(23, 59, 59, 999);
        createdAt.lte = to;
      }
      where.createdAt = createdAt;
    }

    // ---- Sort ----
    let orderBy: Prisma.OrderOrderByWithRelationInput = {
      createdAt: 'desc',
    };
    if (filters.sort === 'oldest') orderBy = { createdAt: 'asc' };
    else if (filters.sort === 'highest') orderBy = { total: 'desc' };
    else if (filters.sort === 'lowest') orderBy = { total: 'asc' };

    // ---- Role-based select ----
    const select: Prisma.OrderSelect = {
      id: true,
      orderNumber: true,
      channel: true,
      status: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      district: true,
      address: isAdmin ? true : false,
      subtotal: true,
      discount: true,
      deliveryFee: true,
      total: true,
      paymentMethod: true,
      paymentStatus: true,
      paymentTxId: isAdmin ? true : false,
      senderPhone: isAdmin ? true : false,
      courier: true,
      consignmentId: true,
      courierStatus: true,
      trackingUrl: isAdmin ? true : false,
      createdAt: true,
      updatedAt: true,
      shiftId: isAdmin ? true : false,
      createdById: isAdmin ? true : false,
      cancelReason: isAdmin ? true : false,
      adminNote: false, // never returned in list; only in detail for admin
      items: {
        select: {
          id: true,
          productId: true,
          name: true,
          size: true,
          color: true,
          qty: true,
          price: true,
          cost: isAdmin ? true : false, // ← staff never sees cost
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
            },
          },
        },
      },
      _count: { select: { items: true } },
    };

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select,
      }),
      prisma.order.count({ where }),
    ]);

    // ---- Enrich with profit (admin only) ----
    const enriched = items.map((o: any) => {
      if (!isAdmin) return o;
      const itemProfit = (o.items || []).reduce(
        (sum: number, it: any) =>
          sum + (Number(it.price) - Number(it.cost || 0)) * it.qty,
        0
      );
      return {
        ...o,
        profit: itemProfit - Number(o.discount || 0),
      };
    });

    return {
      items: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update order status.
   */
  static async updateStatus(
    id: string,
    status: string,
    note: string | undefined,
    prisma: PrismaClient,
    actorId?: string
  ) {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, channel: true },
    });
    if (!order) throw new NotFoundError('Order not found');

    const validStatuses = [
      'PLACED',
      'CONFIRMED',
      'PACKED',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'RETURNED',
    ];
    if (!validStatuses.includes(status)) {
      throw new BadRequestError('Invalid status');
    }

    if (
      status === 'SHIPPED' &&
      order.status !== 'SHIPPED' &&
      order.channel === 'ONLINE'
    ) {
      return prisma.$transaction(async (tx) => {
        const fullOrder = await tx.order.findUnique({
          where: { id },
          select: { id: true, orderNumber: true, items: true, channel: true },
        });
        if (!fullOrder) throw new NotFoundError('Order not found');

        for (const item of fullOrder.items) {
          const variant = await tx.variant.findUnique({
            where: {
              productId_size_color: {
                productId: item.productId,
                size: item.size,
                color: item.color,
              },
            },
          });
          if (!variant) continue;

          const beforeQty = variant.qty;
          const afterQty = beforeQty - item.qty;

          await tx.variant.update({
            where: { id: variant.id },
            data: {
              qty: { decrement: item.qty },
              reserved: { decrement: item.qty },
            },
          });

          await StockService.log(
            {
              productId: item.productId,
              variantId: variant.id,
              type: 'SALE_ONLINE',
              qty: -item.qty,
              before: beforeQty,
              after: afterQty,
              reason: `Order ${fullOrder.orderNumber} shipped (reservation released)`,
              refId: id,
              actorId,
            },
            tx
          );
        }

        return tx.order.update({
          where: { id },
          data: {
            status: 'SHIPPED' as any,
            events: {
              create: {
                status: 'SHIPPED',
                note: note || 'Order shipped',
                actor: actorId || 'system',
              },
            },
          },
          select: ORDER_SELECT,
        });
      });
    }

    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      return prisma.$transaction(async (tx) => {
        const fullOrder = await tx.order.findUnique({
          where: { id },
          select: {
            id: true,
            orderNumber: true,
            items: true,
            channel: true,
            status: true,
          },
        });
        if (!fullOrder) throw new NotFoundError('Order not found');

        const wasShipped =
          fullOrder.channel === 'OFFLINE' ||
          (fullOrder.channel === 'ONLINE' &&
            ['SHIPPED', 'DELIVERED'].includes(fullOrder.status));

        for (const item of fullOrder.items) {
          const variant = await tx.variant.findUnique({
            where: {
              productId_size_color: {
                productId: item.productId,
                size: item.size,
                color: item.color,
              },
            },
          });
          if (!variant) continue;

          const beforeQty = variant.qty;
          const afterQty = wasShipped ? beforeQty + item.qty : beforeQty;

          if (wasShipped) {
            await tx.variant.update({
              where: { id: variant.id },
              data: { qty: afterQty },
            });
          } else {
            await tx.variant.update({
              where: { id: variant.id },
              data: { reserved: { decrement: item.qty } },
            });
          }

          await tx.product.update({
            where: { id: item.productId },
            data: { soldCount: { decrement: item.qty } },
          });

          await StockService.log(
            {
              productId: item.productId,
              variantId: variant.id,
              type: wasShipped ? 'RETURN' : 'RESERVE_RELEASE',
              qty: wasShipped ? item.qty : -item.qty,
              before: beforeQty,
              after: afterQty,
              reason: wasShipped
                ? `Order ${fullOrder.orderNumber} cancelled (stock restored)`
                : `Order ${fullOrder.orderNumber} cancelled (reservation released)`,
              refId: id,
              actorId,
            },
            tx
          );
        }

        return tx.order.update({
          where: { id },
          data: {
            status,
            events: {
              create: {
                status,
                note: note || 'Order cancelled',
                actor: actorId || 'system',
              },
            },
          },
          select: ORDER_SELECT,
        });
      });
    }

    return prisma.order.update({
      where: { id },
      data: {
        status: status as any,
        events: {
          create: {
            status,
            note: note || `Status changed to ${status}`,
            actor: actorId || 'system',
          },
        },
      },
      select: ORDER_SELECT,
    });
  }

  /**
   * Mark payment as PAID.
   */
  static async markPaid(
    id: string,
    prisma: PrismaClient,
    actorId?: string
  ) {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, orderNumber: true, paymentStatus: true, total: true },
    });
    if (!order) throw new NotFoundError('Order not found');

    if (order.paymentStatus === 'PAID') {
      throw new BadRequestError('Payment already marked as paid');
    }

    return prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          orderId: id,
          type:
            order.paymentStatus === 'WAITING'
              ? 'COD_RECEIVED'
              : 'ONLINE_PAYMENT',
          status: 'COMPLETED',
          amount: order.total,
          method: 'MANUAL',
          note: `Marked paid by ${actorId || 'system'}`,
          confirmedBy: actorId || null,
          confirmedAt: new Date(),
        },
      });

      return tx.order.update({
        where: { id },
        data: {
          paymentStatus: 'PAID',
          events: {
            create: {
              status: 'PAYMENT_PAID',
              note: 'Payment confirmed',
              actor: actorId || 'system',
            },
          },
        },
        select: ORDER_SELECT,
      });
    });
  }

  /**
   * Get my orders (customer).
   */
  static async getMyOrders(
    userId: string,
    prisma: PrismaClient,
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: ORDER_SELECT,
      }),
      prisma.order.count({ where: { userId } }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}