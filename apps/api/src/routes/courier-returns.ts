import type { FastifyInstance } from 'fastify';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';

export async function courierReturnRoutes(app: FastifyInstance) {
  // GET /api/courier-returns
  app.get(
    '/',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const q = req.query as { courierId?: string; status?: string };
      const where: any = {};
      if (q.courierId) where.courierId = q.courierId;
      if (q.status === 'received') where.receivedAt = { not: null };
      if (q.status === 'pending') where.receivedAt = null;

      const returns = await app.prisma.courierReturn.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              customerPhone: true,
              district: true,
              total: true,
              status: true,
            },
          },
          courier: {
            select: { id: true, name: true, slug: true, logo: true },
          },
        },
      });

      return reply.send({ success: true, data: returns });
    }
  );

  // GET /api/courier-returns/stats
  app.get(
    '/stats',
    { preHandler: [app.authenticate, requireStaff] },
    async (_req, reply) => {
      const [total, pending, received, lossAgg] = await Promise.all([
        app.prisma.courierReturn.count(),
        app.prisma.courierReturn.count({ where: { receivedAt: null } }),
        app.prisma.courierReturn.count({ where: { receivedAt: { not: null } } }),
        app.prisma.courierReturn.aggregate({
          _sum: { totalLoss: true },
        }),
      ]);

      return reply.send({
        success: true,
        data: {
          total,
          pending,
          received,
          totalLoss: Number(lossAgg._sum.totalLoss || 0),
        },
      });
    }
  );

  // POST /api/courier-returns/:id/receive
  // Mark parcel received back at shop
  app.post(
    '/:id/receive',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string } | undefined;
      const { id } = req.params as { id: string };
      const body = req.body as {
        inspectionNote?: string;
        restock?: boolean;
      };

      const ret = await app.prisma.courierReturn.findUnique({
        where: { id },
        include: {
          order: {
            include: { items: true },
          },
        },
      });
      if (!ret) {
        return reply.code(404).send({
          success: false,
          error: 'NOT_FOUND',
          message: 'Return not found',
        });
      }

      const updated = await app.prisma.$transaction(async (tx) => {
        // Mark received
        const r = await tx.courierReturn.update({
          where: { id },
          data: {
            receivedAt: new Date(),
            receivedBy: user?.id || null,
            inspectionNote: body.inspectionNote || null,
            itemsRestocked: body.restock === true,
          },
        });

        // If restock requested, add qty back
        if (body.restock) {
          for (const item of ret.order.items) {
            // Find variant by product+size+color
            const variant = await tx.variant.findFirst({
              where: {
                productId: item.productId,
                size: item.size,
                color: item.color,
              },
            });
            if (!variant) continue;

            await tx.variant.update({
              where: { id: variant.id },
              data: { qty: { increment: item.qty } },
            });

            await tx.stockMovement.create({
              data: {
                variantId: variant.id,
                type: 'IN',
                qty: item.qty,
                reason: `Return restock from ${ret.order.orderNumber}`,
                orderId: ret.order.id,
                userId: user?.id,
              },
            });
          }
        }

        return r;
      });

      if (user?.id) {
        await app.prisma.auditLog.create({
          data: {
            userId: user.id,
            actor: user.id,
            action: 'COURIER_RETURN_RECEIVE',
            detail: `Received return for ${ret.order.orderNumber}${
              body.restock ? ' + restocked' : ''
            }`,
          },
        });
      }

      return reply.send({ success: true, data: updated });
    }
  );
}