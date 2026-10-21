import type { FastifyInstance } from 'fastify';
import { OrderService } from '../services/order.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';
import { validate } from '../middleware/validate.js';
import { PlaceOrderSchema } from '@tanavia/shared';

export async function orderRoutes(app: FastifyInstance) {
  // ============================================
  // POST /api/orders — public: place online order
  // ============================================
  app.post(
    '/',
    {
      preHandler: [validate(PlaceOrderSchema, 'body')],
      config: {
        rateLimit: { max: 10, timeWindow: '1 hour' },
      },
    },
    async (req, reply) => {
      const input = req.body as any;
      const order = await OrderService.placeOnlineOrder(input, app.prisma);
      return reply.code(201).send({ success: true, data: order });
    }
  );

  // ============================================
  // POST /api/orders/offline — staff: POS sale
  // ============================================
  app.post(
    '/offline',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const input = req.body as any;
      const order = await OrderService.placeOfflineOrder(input, app.prisma, req.user.sub);
      return reply.code(201).send({ success: true, data: order });
    }
  );

  // ============================================
  // GET /api/orders/track/:orderNumber — public
  // ============================================
  app.get('/track/:orderNumber', async (req, reply) => {
    const { orderNumber } = req.params as { orderNumber: string };
    const order = await OrderService.getByOrderNumber(orderNumber.toUpperCase(), app.prisma);
    return reply.send({ success: true, data: order });
  });

  // ============================================
  // GET /api/orders/my — customer's orders
  // ============================================
  app.get(
    '/my',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const query = req.query as { page?: string; limit?: string };
      const page = query.page ? Number(query.page) : 1;
      const limit = query.limit ? Number(query.limit) : 20;
      const result = await OrderService.getMyOrders(req.user.sub, app.prisma, page, limit);
      return reply.send({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    }
  );

  // ============================================
  // GET /api/orders — list with filters
  // ============================================
  app.get(
    '/',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const user = req.user as any;

      const result = await OrderService.list(
        {
          status: q.status,
          channel: q.channel as any,
          paymentStatus: q.paymentStatus,
          paymentMethod: q.paymentMethod,
          search: q.q,
          from: q.from,
          to: q.to,
          sort: q.sort as any,
          page: q.page ? Number(q.page) : 1,
          limit: q.limit ? Number(q.limit) : 25,
          role: user.role,
          userId: user.sub,
        },
        app.prisma
      );

      return reply.send({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    }
  );

  // ============================================
  // GET /api/orders/counts
  // ============================================
  app.get(
    '/counts',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as any;
      const isAdmin = user.role === 'ADMIN';
      const q = req.query as Record<string, string | undefined>;

      const baseWhere: any = {};
      if (q.status) baseWhere.status = q.status;
      if (q.paymentStatus) baseWhere.paymentStatus = q.paymentStatus;
      if (q.paymentMethod) baseWhere.paymentMethod = q.paymentMethod;
      if (q.q) {
        baseWhere.OR = [
          { orderNumber: { contains: q.q } },
          { customerName: { contains: q.q } },
          { customerPhone: { contains: q.q } },
        ];
      }
      if (q.from || q.to) {
        baseWhere.createdAt = {};
        if (q.from) baseWhere.createdAt.gte = new Date(q.from);
        if (q.to) {
          const to = new Date(q.to);
          to.setHours(23, 59, 59, 999);
          baseWhere.createdAt.lte = to;
        }
      }

      const [all, online, offline] = await Promise.all([
        isAdmin
          ? app.prisma.order.count({ where: { ...baseWhere } })
          : app.prisma.order.count({
              where: { ...baseWhere, channel: 'OFFLINE', createdById: user.sub },
            }),
        app.prisma.order.count({ where: { ...baseWhere, channel: 'ONLINE' } }),
        app.prisma.order.count({
          where: isAdmin
            ? { ...baseWhere, channel: 'OFFLINE' }
            : { ...baseWhere, channel: 'OFFLINE', createdById: user.sub },
        }),
      ]);

      return reply.send({ success: true, data: { all, online, offline } });
    }
  );

  // ============================================
  // GET /api/orders/stats
  // ============================================
  app.get(
    '/stats',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const [todayOrders, needsAction, todayRevenue, codToCollect] = await Promise.all([
        app.prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
        app.prisma.order.count({
          where: {
            OR: [{ status: 'PLACED' }, { paymentStatus: 'REVIEW' }],
          },
        }),
        app.prisma.order.aggregate({
          where: {
            createdAt: { gte: startOfDay },
            OR: [{ paymentStatus: 'PAID' }, { status: 'DELIVERED' }],
          },
          _sum: { total: true },
        }),
        app.prisma.order.aggregate({
          where: {
            paymentMethod: 'COD',
            status: 'DELIVERED',
            codSettledAt: null,
          },
          _sum: { total: true },
        }),
      ]);

      return reply.send({
        success: true,
        data: {
          todayOrders,
          needsAction,
          todayRevenue: Number(todayRevenue._sum.total || 0),
          codToCollect: Number(codToCollect._sum.total || 0),
        },
      });
    }
  );

  // ============================================
  // GET /api/orders/:id — detail
  // ============================================
  app.get(
    '/:id',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const user = req.user as any;

      const order = await OrderService.getById(id, app.prisma, {
        role: user.role,
        userId: user.sub,
      });

      return reply.send({ success: true, data: order });
    }
  );

  // ============================================
  // PATCH /api/orders/:id/status
  // ============================================
  app.patch(
    '/:id/status',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { status, note } = req.body as { status: string; note?: string };
      const order = await OrderService.updateStatus(id, status, note, app.prisma, req.user.sub);
      return reply.send({ success: true, data: order });
    }
  );

  // ============================================
  // PATCH /api/orders/:id/payment
  // ============================================
  app.patch(
    '/:id/payment',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const order = await OrderService.markPaid(id, app.prisma, req.user.sub);
      return reply.send({ success: true, data: order });
    }
  );

  // ============================================
  // POST /api/orders/manual — admin: create manual order
  // ============================================
  app.post(
    '/manual',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const body = req.body as any;
      const user = req.user as any;

      if (!body.items?.length) {
        return reply.code(400).send({
          success: false,
          message: 'At least one item is required',
        });
      }

      const result = await app.prisma.$transaction(
        async (tx) => {
          let orderNumber = '';
          for (let i = 0; i < 10; i++) {
            const num = 'TN-' + String(Math.floor(100000 + Math.random() * 900000));
            const existing = await tx.order.findUnique({ where: { orderNumber: num } });
            if (!existing) {
              orderNumber = num;
              break;
            }
          }
          if (!orderNumber) throw new Error('Failed to generate order number');

          let subtotal = 0;
          const lineItems: any[] = [];

          for (const item of body.items) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
              select: {
                id: true, name: true, price: true, cost: true, discount: true, active: true,
              },
            });
            if (!product) throw new Error(`Product not found: ${item.productId}`);
            if (!product.active) throw new Error(`Product inactive: ${product.name}`);

            const variant = await tx.variant.findUnique({
              where: {
                productId_size_color: {
                  productId: item.productId,
                  size: item.size,
                  color: item.color,
                },
              },
            });
            if (!variant) throw new Error(`Invalid size/color for ${product.name}`);

            const available = variant.qty - variant.reserved;
            if (available < item.qty) {
              throw new Error(
                `Insufficient stock for ${product.name} (${item.size}/${item.color}). Available: ${available}`
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

          const deliveryFee = Number(body.deliveryFee ?? 0);
          const total = subtotal + deliveryFee;

          // Upsert Customer (for tracking)
          const cleanPhone = body.customerPhone.replace(/\D/g, '');
          let customer = await tx.customer.findUnique({ where: { phone: cleanPhone } });

          if (!customer) {
            customer = await tx.customer.create({
              data: {
                name: body.customerName,
                phone: cleanPhone,
                email: body.customerEmail || null,
                source: body.source || 'OTHER',
                totalOrders: 1,
                totalSpent: total,
                lastOrderAt: new Date(),
              },
            });
          } else {
            customer = await tx.customer.update({
              where: { id: customer.id },
              data: {
                totalOrders: { increment: 1 },
                totalSpent: { increment: total },
                lastOrderAt: new Date(),
              },
            });
          }

          // ✅ FIXED: Create order with both userId AND customerId
          const order = await tx.order.create({
            data: {
              orderNumber,
              channel: 'OFFLINE',
              userId: user?.sub || null,       // Admin user who created it
              customerId: customer.id,          // Customer record linked
              createdById: user?.sub || null,
              status: 'CONFIRMED',
              customerName: body.customerName,
              customerPhone: cleanPhone,
              customerEmail: body.customerEmail || null,
              address: body.address,
              district: body.district,
              note: body.note
                ? `[${body.source || 'SOCIAL'}] ${body.note}`
                : `Source: ${body.source || 'SOCIAL'}`,
              subtotal,
              discount: 0,
              deliveryFee,
              total,
              paymentMethod: body.paymentMethod,
              paymentStatus: body.paymentMethod === 'COD' ? 'WAITING' : 'REVIEW',
              paymentTxId: body.paymentTxId || null,
            },
          });

          for (const li of lineItems) {
            await tx.orderItem.create({
              data: {
                orderId: order.id,
                productId: li.productId,
                name: li.name,
                size: li.size,
                color: li.color,
                qty: li.qty,
                price: li.price,
                cost: li.cost,
              },
            });
          }

          await tx.orderEvent.create({
            data: {
              orderId: order.id,
              status: 'CONFIRMED',
              note: `Manual order from ${body.source || 'Social'}`,
              actor: user?.sub || 'admin',
            },
          });

          for (const li of lineItems) {
            await tx.variant.update({
              where: { id: li.variantId },
              data: { reserved: { increment: li.qty } },
            });
            await tx.product.update({
              where: { id: li.productId },
              data: { soldCount: { increment: li.qty } },
            });
          }

          return order;
        },
        { isolationLevel: 'Serializable', timeout: 15000 }
      );

      return reply.code(201).send({ success: true, data: result });
    }
  );
}