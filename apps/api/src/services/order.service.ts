import type { PrismaClient, Prisma } from '@prisma/client';
import { StockService } from './stock.service.js';
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
  search?: string;
  from?: string;
  to?: string;
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
  consignmentId: true,
  courierStatus: true,
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
    // SHIPPING type handled at delivery fee step

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
   * Uses a transaction to ensure no oversell.
   */
  static async placeOnlineOrder(
    input: PlaceOrderInput,
    prisma: PrismaClient
  ) {
    if (!input.items || input.items.length === 0) {
      throw new BadRequestError('At least one item is required');
    }

    // Load shop settings
    const settings = await this.getSettings(prisma);
    const freeShipOver = Number(settings.freeShipOver || 1000);
    const insideFee = Number(settings.deliveryInside || 70);
    const outsideFee = Number(settings.deliveryOutside || 130);

    return prisma.$transaction(
      async (tx) => {
        // ============================================
        // 1. Lock + validate variants, build line items
        // ============================================
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

        // ============================================
        // 2. Apply coupon
        // ============================================
        let discount = 0;
        let couponCode: string | null = null;
        let isShippingCoupon = false;

        if (input.couponCode) {
          const result = await this.applyCoupon(
            input.couponCode,
            subtotal,
            tx
          );
          discount = result.discount;
          couponCode = result.code;

          const coupon = await tx.coupon.findUnique({
            where: { code: couponCode },
          });
          isShippingCoupon = coupon?.type === 'SHIPPING';
        }

        // ============================================
        // 3. Delivery fee
        // ============================================
        const deliveryFee = this.computeDeliveryFee(
          subtotal,
          input.district,
          freeShipOver,
          insideFee,
          outsideFee,
          isShippingCoupon
        );

        const total = Math.max(0, subtotal - discount) + deliveryFee;

        // ============================================
        // 4. Upsert customer
        // ============================================
        let customer = await tx.user.findUnique({
          where: { phone: input.customerPhone },
          select: { id: true },
        });

        if (!customer) {
          // Guest customer — create a minimal user record
          const crypto = await import('node:crypto');
          const placeholderEmail = `guest_${input.customerPhone}_${Date.now()}@tanavia.local`;
          customer = await tx.user.create({
            data: {
              name: input.customerName,
              email: placeholderEmail,
              phone: input.customerPhone,
              passwordHash: crypto
                .randomBytes(32)
                .toString('hex'), // random — user must register to login
              role: 'CUSTOMER',
            },
            select: { id: true },
          });
        }

        // ============================================
        // 5. Generate order number
        // ============================================
        const orderNumber = await this.generateOrderNumber(tx);

        // ============================================
        // 6. Create order
        // ============================================
        const paymentStatus =
          input.paymentMethod === 'COD' ? 'WAITING' : 'REVIEW';

        const order = await tx.order.create({
          data: {
            orderNumber,
            channel: 'ONLINE',
            userId: customer.id,
            status: 'PLACED',
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            customerEmail: input.customerEmail || null,
            address: input.address || null,
            district: input.district || null,
            note: input.note || null,
            subtotal,
            discount,
            deliveryFee,
            total,
            couponCode,
            paymentMethod: input.paymentMethod,
            paymentStatus,
            paymentTxId: input.paymentTxId || null,
            items: {
              create: lineItems.map((li) => ({
                productId: li.productId,
                name: li.name,
                size: li.size,
                color: li.color,
                qty: li.qty,
                price: li.price,
                cost: li.cost,
              })),
            },
            events: {
              create: {
                status: 'PLACED',
                note: 'Order placed by customer',
                actor: 'system',
              },
            },
          },
          select: ORDER_SELECT,
        });

        // ============================================
        // 7. Reduce stock + log movements
        // ============================================
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
              type: 'SALE_ONLINE',
              qty: -li.qty,
              before,
              after,
              reason: `Online order ${orderNumber}`,
              refId: order.id,
            },
            tx
          );
        }

        // ============================================
        // 8. Increment coupon usage
        // ============================================
        if (couponCode) {
          await tx.coupon.update({
            where: { code: couponCode },
            data: { usedCount: { increment: 1 } },
          });
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
   * Load shop settings from DB (key-value Setting table).
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
   * Place an OFFLINE order (from POS / physical shop).
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

          if (variant.qty < item.qty) {
            throw new ConflictError(
              `${product.name} (${item.size}/${item.color}) — only ${variant.qty} left in stock`
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

        const discount = Math.min(
          input.discountAmount || 0,
          subtotal
        );
        const total = subtotal - discount;
        const orderNumber = await this.generateOrderNumber(tx);

        const order = await tx.order.create({
          data: {
            orderNumber,
            channel: 'OFFLINE',
            shiftId: input.shiftId || null,
            status: 'DELIVERED', // offline sale = instant
            customerName: input.customerName || 'Walk-in Customer',
            customerPhone: input.customerPhone || null,
            note: input.note || null,
            subtotal,
            discount,
            deliveryFee: 0,
            total,
            paymentMethod: input.paymentMethod,
            paymentStatus: 'PAID',
            items: {
              create: lineItems.map((li) => ({
                productId: li.productId,
                name: li.name,
                size: li.size,
                color: li.color,
                qty: li.qty,
                price: li.price,
                cost: li.cost,
              })),
            },
            events: {
              create: [
                {
                  status: 'PLACED',
                  note: 'Offline sale',
                  actor: actorId || 'system',
                },
                {
                  status: 'DELIVERED',
                  note: 'Completed at counter',
                  actor: actorId || 'system',
                },
              ],
            },
          },
          select: ORDER_SELECT,
        });

        // Reduce stock + log
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
   * Get order by ID (admin).
   */
  static async getById(id: string, prisma: PrismaClient) {
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        ...ORDER_SELECT,
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  /**
   * Get order by order number (public track).
   * Hides sensitive fields.
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
        items: {
          select: {
            name: true,
            size: true,
            color: true,
            qty: true,
            price: true,
          },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  /**
   * List orders (admin).
   */
  static async list(filters: ListFilters, prisma: PrismaClient) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (filters.status) where.status = filters.status as any;
    if (filters.channel) where.channel = filters.channel;
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus as any;

    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
      ];
    }

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

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: ORDER_SELECT,
      }),
      prisma.order.count({ where }),
    ]);

    // Compute profit per order (admin only)
    const enriched = items.map((o) => ({
      ...o,
      profit: o.items.reduce(
        (sum, it) => sum + (Number(it.price) - Number(it.cost)) * it.qty,
        0
      ) - Number(o.discount || 0),
    }));

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
   * Update order status. Adds an event.
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
      select: { id: true, status: true },
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

    // Special handling: cancel → restore stock
    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
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

          const before = variant.qty;
          const after = before + item.qty;

          await tx.variant.update({
            where: { id: variant.id },
            data: { qty: after },
          });

          await tx.product.update({
            where: { id: item.productId },
            data: { soldCount: { decrement: item.qty } },
          });

          await StockService.log(
            {
              productId: item.productId,
              variantId: variant.id,
              type: 'RETURN',
              qty: item.qty,
              before,
              after,
              reason: `Order ${fullOrder.orderNumber} cancelled`,
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
              create: { status, note: note || 'Order cancelled', actor: actorId || 'system' },
            },
          },
          select: ORDER_SELECT,
        });
      });
    }

    // Normal status update
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
   * Mark payment as PAID (for COD → cash received, or verify digital).
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