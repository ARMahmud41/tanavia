import type { FastifyInstance } from 'fastify';
import { FinanceService } from '../services/finance.service.js';
import { CashOutService } from '../services/cashout.service.js';
import { requireAdmin, requireStaff } from '../middleware/require-role.js';

export async function financeRoutes(app: FastifyInstance) {
  // ============================================
  // GET /api/finance/summary — revenue + profit
  // ============================================
  app.get(
    '/summary',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const q = req.query as { from?: string; to?: string };
      const summary = await FinanceService.getSummary(
        { from: q.from, to: q.to },
        app.prisma
      );
      return reply.send({ success: true, data: summary });
    }
  );

  // ============================================
  // GET /api/finance/transactions — COD / payments
  // ============================================
  app.get(
    '/transactions',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const q = req.query as {
        type?: string;
        status?: string;
        orderId?: string;
        from?: string;
        to?: string;
        page?: string;
        limit?: string;
      };

      const result = await FinanceService.listTransactions(
        {
          type: q.type,
          status: q.status,
          orderId: q.orderId,
          from: q.from,
          to: q.to,
          page: q.page ? Number(q.page) : undefined,
          limit: q.limit ? Number(q.limit) : undefined,
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
  // EXPENSES
  // ============================================

  // GET /api/finance/expenses
  app.get(
    '/expenses',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const q = req.query as {
        category?: string;
        from?: string;
        to?: string;
        page?: string;
        limit?: string;
      };

      const result = await FinanceService.listExpenses(
        {
          category: q.category,
          from: q.from,
          to: q.to,
          page: q.page ? Number(q.page) : undefined,
          limit: q.limit ? Number(q.limit) : undefined,
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

  // POST /api/finance/expenses
  app.post(
    '/expenses',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const expense = await FinanceService.addExpense(
        req.body as any,
        app.prisma,
        req.user.sub
      );
      return reply.code(201).send({ success: true, data: expense });
    }
  );

  // GET /api/finance/expenses/summary
  app.get(
    '/expenses/summary',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const q = req.query as { from?: string; to?: string };
      const summary = await FinanceService.getExpenseSummary(
        { from: q.from, to: q.to },
        app.prisma
      );
      return reply.send({ success: true, data: summary });
    }
  );

  // DELETE /api/finance/expenses/:id
  app.delete(
    '/expenses/:id',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const result = await FinanceService.deleteExpense(id, app.prisma);
      return reply.send({ success: true, data: result });
    }
  );

  // ============================================
  // CASH DRAWER (Staff+)
  // ============================================

  // POST /api/finance/cash-drawer/open
  app.post(
    '/cash-drawer/open',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const drawer = await FinanceService.openCashDrawer(
        req.user.sub,
        req.body as any,
        app.prisma
      );
      return reply.code(201).send({ success: true, data: drawer });
    }
  );

  // POST /api/finance/cash-drawer/close
  app.post(
    '/cash-drawer/close',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const result = await FinanceService.closeCashDrawer(
        req.user.sub,
        req.body as any,
        app.prisma
      );
      return reply.send({ success: true, data: result });
    }
  );

  // GET /api/finance/cash-drawer/current
  app.get(
    '/cash-drawer/current',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const drawer = await FinanceService.currentCashDrawer(
        req.user.sub,
        app.prisma
      );
      return reply.send({ success: true, data: drawer });
    }
  );

  // GET /api/finance/cash-drawers — history (admin)
  app.get(
    '/cash-drawers',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const q = req.query as {
        userId?: string;
        status?: string;
        from?: string;
        to?: string;
        page?: string;
        limit?: string;
      };

      const result = await FinanceService.listCashDrawers(
        {
          userId: q.userId,
          status: q.status as any,
          from: q.from,
          to: q.to,
          page: q.page ? Number(q.page) : undefined,
          limit: q.limit ? Number(q.limit) : undefined,
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
  // CASH-OUT APPROVAL ROUTES
  // ============================================

  // POST /api/finance/cash-outs (STAFF creates PENDING)
  app.post(
    '/cash-outs',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as { id?: string; sub?: string; userId?: string } | undefined;
      const actorId = user?.id || user?.sub || user?.userId;
      const body = req.body as {
        amount: number;
        reason?: string;
        description?: string;
        category?: string;
      };

      const expense = await CashOutService.create(
        {
          amount: Number(body.amount),
          description: body.reason || body.description || 'Cash out',
          category: body.category,
        },
        app.prisma,
        actorId
      );

      return reply.code(201).send({ success: true, data: expense });
    }
  );

  // GET /api/finance/cash-outs/pending (ADMIN inbox)
  app.get(
    '/cash-outs/pending',
    { preHandler: [app.authenticate, requireAdmin] },
    async (_req, reply) => {
      const items = await CashOutService.listPending(app.prisma);
      return reply.send({ success: true, data: items });
    }
  );

  // PATCH /api/finance/cash-outs/:id/approve (ADMIN)
  app.patch(
    '/cash-outs/:id/approve',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string; sub?: string; userId?: string } | undefined;
      const actorId = user?.id || user?.sub || user?.userId;
      const { id } = req.params as { id: string };
      const expense = await CashOutService.approve(id, app.prisma, actorId);
      return reply.send({ success: true, data: expense });
    }
  );

  // PATCH /api/finance/cash-outs/:id/reject (ADMIN)
  app.patch(
    '/cash-outs/:id/reject',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string; sub?: string; userId?: string } | undefined;
      const actorId = user?.id || user?.sub || user?.userId;
      const { id } = req.params as { id: string };
      const body = req.body as { reason: string };

      const expense = await CashOutService.reject(
        id,
        body.reason,
        app.prisma,
        actorId
      );

      return reply.send({ success: true, data: expense });
    }
  );

  // ============================================
  // EXPENSE REVERSAL
  // ============================================

  app.post(
    '/expenses/:id/reverse',
    { preHandler: [app.authenticate, requireAdmin] },
    async (req, reply) => {
      const user = req.user as { id?: string; sub?: string; userId?: string } | undefined;
      const actorId = user?.id || user?.sub || user?.userId;
      const { id } = req.params as { id: string };
      const body = req.body as { reason: string };

      const result = await CashOutService.reverse(
        id,
        body.reason,
        app.prisma,
        actorId
      );

      return reply.send({ success: true, data: result });
    }
  );

  // ============================================
  // MY SHIFT (STAFF)
  // ============================================

  app.get(
    '/my-shift',
    { preHandler: [app.authenticate, requireStaff] },
    async (req, reply) => {
      const user = req.user as { id?: string; sub?: string; userId?: string } | undefined;
      const actorId = user?.id || user?.sub || user?.userId;
      if (!actorId) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }
      const data = await CashOutService.myShift(actorId, app.prisma);
      return reply.send({ success: true, data });
    }
  );

  // ============================================
  // ACCOUNTS (ADMIN)
  // ============================================

  app.get(
    '/accounts',
    { preHandler: [app.authenticate, requireAdmin] },
    async (_req, reply) => {
      const data = await CashOutService.accounts(app.prisma);
      return reply.send({ success: true, data });
    }
  );
}