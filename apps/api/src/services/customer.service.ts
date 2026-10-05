import type { PrismaClient, Prisma } from '@prisma/client';
import { StockService } from './stock.service.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';
import { normalizePhone } from '../utils/phone.js';

// ============================================
// Types
// ============================================
type Status =
  | 'BLOCKED'
  | 'VIP'
  | 'AT_RISK'
  | 'REPEAT'
  | 'ACTIVE'
  | 'NEW'
  | 'INACTIVE';

interface ListFilters {
  search?: string;
  segment?: string;
  sort?: 'newest' | 'recently-ordered' | 'most-orders' | 'highest-spend';
  page?: number;
  limit?: number;
  role?: 'STAFF' | 'ADMIN';
}

interface ListOptions {
  role?: 'STAFF' | 'ADMIN';
}

// ============================================
// Customer Service
// ============================================
export class CustomerService {
  // ============================================
  // List (role-aware)
  // ============================================
  static async list(filters: ListFilters, prisma: PrismaClient) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 25));
    const skip = (page - 1) * limit;

    const isAdmin = filters.role === 'ADMIN';

    // Build where
    const where: Prisma.CustomerWhereInput = {};

    // Search (name, phone, email)
    if (filters.search) {
      const raw = filters.search.trim();
      const normalized = normalizePhone(raw);
      const orClauses: Prisma.CustomerWhereInput[] = [
        { name: { contains: raw, mode: 'insensitive' } },
        { email: { contains: raw, mode: 'insensitive' } },
      ];
      if (normalized) {
        orClauses.push({ phone: normalized });
      } else {
        orClauses.push({ phone: { contains: raw } });
      }
      where.OR = orClauses;
    }

    // Segment filter
    if (filters.segment && filters.segment !== 'ALL') {
      const seg = filters.segment.toUpperCase();
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (seg === 'BLOCKED') {
        where.blockedAt = { not: null };
      } else if (seg === 'NEW') {
        where.orders = { none: { status: { not: 'CANCELLED' } } };
      } else if (seg === 'ACTIVE') {
        where.orders = {
          some: {
            status: { not: 'CANCELLED' },
            createdAt: { gte: thirtyDaysAgo },
          },
        };
      } else if (seg === 'REPEAT') {
        // Will filter after query (need count)
      } else if (seg === 'VIP' || seg === 'AT_RISK' || seg === 'RETURN_PRONE') {
        // Will filter after query
      }
    }

    // Sort
    let orderBy: Prisma.CustomerOrderByWithRelationInput = { createdAt: 'desc' };
    if (filters.sort === 'newest') orderBy = { createdAt: 'desc' };
    else if (filters.sort === 'recently-ordered')
      orderBy = { updatedAt: 'desc' };
    // most-orders and highest-spend handled after query

    // Fetch customers with orders relation count
    const [rawCustomers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          userId: true,
          blockedAt: true,
          blockedReason: isAdmin ? true : false,
          blockedById: isAdmin ? true : false,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { orders: true, notes: true },
          },
          orders: {
            where: { status: { not: 'CANCELLED' } },
            select: {
              id: true,
              status: true,
              total: true,
              createdAt: true,
            },
          },
          tags: {
            select: { tag: true },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    // Compute derived values
    let enriched = rawCustomers.map((c) => {
      const nonCancelled = c.orders.length;
      const delivered = c.orders.filter((o) => o.status === 'DELIVERED');
      const totalSpent = delivered.reduce(
        (sum, o) => sum + Number(o.total),
        0
      );
      const lastOrder =
        c.orders.length > 0
          ? c.orders.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )[0].createdAt
          : null;

      const daysSinceLast = lastOrder
        ? Math.floor(
            (Date.now() - new Date(lastOrder).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null;

      // Status computation
      let status: Status = 'NEW';
      if (c.blockedAt) status = 'BLOCKED';
      else if (nonCancelled >= 5 || totalSpent >= 50000) status = 'VIP';
      else if (nonCancelled >= 2 && daysSinceLast !== null && daysSinceLast > 60)
        status = 'AT_RISK';
      else if (nonCancelled >= 2) status = 'REPEAT';
      else if (
        nonCancelled >= 1 &&
        daysSinceLast !== null &&
        daysSinceLast <= 30
      )
        status = 'ACTIVE';
      else if (nonCancelled === 0) status = 'NEW';
      else status = 'INACTIVE';

      // Return rate (compute later — need returns query)
      const returnRate = 0;
      const needsReview = false;

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        userId: c.userId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        orders: nonCancelled,
        totalSpent,
        lastOrder,
        status,
        tags: c.tags.map((t) => t.tag),
        // Admin-only fields
        ...(isAdmin && {
          blockedReason: c.blockedReason,
          blockedById: c.blockedById,
          needsReview,
          returnRate,
        }),
      };
    });

    // Filter by segment (for computed segments)
    if (filters.segment && filters.segment !== 'ALL') {
      const seg = filters.segment.toUpperCase();
      if (seg === 'REPEAT') {
        enriched = enriched.filter((c) => c.orders >= 2);
      } else if (seg === 'VIP') {
        enriched = enriched.filter(
          (c) => c.orders >= 5 || c.totalSpent >= 50000
        );
      } else if (seg === 'AT_RISK') {
        enriched = enriched.filter((c) => c.status === 'AT_RISK');
      }
    }

    // Sort by computed fields
    if (filters.sort === 'most-orders') {
      enriched.sort((a, b) => b.orders - a.orders);
    } else if (filters.sort === 'highest-spend' && isAdmin) {
      enriched.sort((a, b) => b.totalSpent - a.totalSpent);
    }

    // Strip admin fields for staff
    if (!isAdmin) {
      enriched = enriched.map((c: any) => {
        const { totalSpent, needsReview, returnRate, ...rest } = c;
        return rest;
      });
    }

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

  // ============================================
  // Stats (dashboard cards)
  // ============================================
  static async stats(
    options: { role?: 'STAFF' | 'ADMIN' } = {},
    prisma: PrismaClient
  ) {
    const isAdmin = options.role === 'ADMIN';

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [total, newThisMonth, active30d, repeat] = await Promise.all([
      prisma.customer.count(),

      prisma.customer.count({
        where: { createdAt: { gte: startOfMonth } },
      }),

      prisma.customer.count({
        where: {
          orders: {
            some: {
              status: { not: 'CANCELLED' },
              createdAt: { gte: thirtyDaysAgo },
            },
          },
        },
      }),

      prisma.customer.count({
        where: {
          orders: {
            some: { status: { not: 'CANCELLED' } },
          },
        },
      }),
    ]);

    if (isAdmin) {
      return { total, newThisMonth, active30d, repeat };
    }

    // Staff sees fewer cards
    return { total, active30d };
  }

  // ============================================
  // Segment Counts
  // ============================================
  static async segmentCounts(
    filters: { search?: string; role?: 'STAFF' | 'ADMIN' },
    prisma: PrismaClient
  ) {
    const isAdmin = filters.role === 'ADMIN';

    // Build base search filter
    const searchWhere: Prisma.CustomerWhereInput = {};
    if (filters.search) {
      const raw = filters.search.trim();
      const normalized = normalizePhone(raw);
      const orClauses: Prisma.CustomerWhereInput[] = [
        { name: { contains: raw, mode: 'insensitive' } },
        { email: { contains: raw, mode: 'insensitive' } },
      ];
      if (normalized) orClauses.push({ phone: normalized });
      else orClauses.push({ phone: { contains: raw } });
      searchWhere.OR = orClauses;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Count each segment
    const [all, newCount, active, repeat, blocked] = await Promise.all([
      prisma.customer.count({ where: searchWhere }),

      prisma.customer.count({
        where: {
          ...searchWhere,
          orders: { none: { status: { not: 'CANCELLED' } } },
        },
      }),

      prisma.customer.count({
        where: {
          ...searchWhere,
          orders: {
            some: {
              status: { not: 'CANCELLED' },
              createdAt: { gte: thirtyDaysAgo },
            },
          },
        },
      }),

      prisma.customer.count({
        where: {
          ...searchWhere,
          orders: {
            some: { status: { not: 'CANCELLED' } },
          },
        },
      }),

      prisma.customer.count({
        where: { ...searchWhere, blockedAt: { not: null } },
      }),
    ]);

    // Admin-only counts
    let vip = 0;
    let atRisk = 0;
    let returnProne = 0;

    if (isAdmin) {
      // Fetch all customers for computation (ok for small datasets)
      const customers = await prisma.customer.findMany({
        where: searchWhere,
        select: {
          id: true,
          orders: {
            where: { status: { not: 'CANCELLED' } },
            select: { status: true, total: true, createdAt: true },
          },
        },
      });

      for (const c of customers) {
        const orderCount = c.orders.length;
        const totalSpent = c.orders
          .filter((o) => o.status === 'DELIVERED')
          .reduce((s, o) => s + Number(o.total), 0);
        const lastOrder =
          c.orders.length > 0
            ? c.orders.reduce((latest, o) =>
                new Date(o.createdAt) > new Date(latest.createdAt) ? o : latest
              ).createdAt
            : null;

        // VIP
        if (orderCount >= 5 || totalSpent >= 50000) vip++;

        // At risk: 2+ orders, last > 60 days ago
        if (orderCount >= 2 && lastOrder) {
          const daysSince = Math.floor(
            (Date.now() - new Date(lastOrder).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSince > 60) atRisk++;
        }

        // Return-prone: 3+ returns
        const returnCount = await prisma.return.count({
          where: {
            order: { customerId: c.id },
            status: { in: ['COMPLETED', 'REFUNDED'] },
          },
        });
        if (returnCount >= 3) returnProne++;
      }
    }

    return {
      ALL: all,
      NEW: newCount,
      ACTIVE: active,
      REPEAT: repeat,
      BLOCKED: blocked,
      ...(isAdmin && { VIP: vip, AT_RISK: atRisk, RETURN_PRONE: returnProne }),
    };
  }

  // ============================================
  // Get by id (profile)
  // ============================================
  static async getById(
    id: string,
    prisma: PrismaClient,
    options: { role?: 'STAFF' | 'ADMIN' } = {}
  ) {
    const isAdmin = options.role === 'ADMIN';

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        userId: true,
        blockedAt: true,
        blockedReason: isAdmin ? true : false,
        blockedById: isAdmin ? true : false,
        createdAt: true,
        updatedAt: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            paymentMethod: true,
            paymentStatus: true,
            createdAt: true,
            _count: { select: { items: true } },
          },
        },
        tags: isAdmin
          ? { select: { id: true, tag: true, createdAt: true } }
          : false,
        notes: isAdmin
          ? {
              orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
              select: {
                id: true,
                text: true,
                pinned: true,
                createdAt: true,
                authorId: true,
              },
            }
          : {
              orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
              select: {
                id: true,
                text: true,
                pinned: true,
                createdAt: true,
                authorId: true,
              },
            },
      },
    });

    if (!customer) throw new NotFoundError('Customer not found');

    // Compute stats
    const nonCancelled = customer.orders.filter(
      (o) => o.status !== 'CANCELLED'
    );
    const delivered = customer.orders.filter((o) => o.status === 'DELIVERED');
    const totalSpent = delivered.reduce((sum, o) => sum + Number(o.total), 0);
    const avgOrder = delivered.length > 0 ? totalSpent / delivered.length : 0;

    // Returns
    const returnCount = await prisma.return.count({
      where: {
        order: { customerId: id },
        status: { in: ['COMPLETED', 'REFUNDED'] },
      },
    });

    const returnRate =
      delivered.length > 0 ? returnCount / delivered.length : 0;
    const needsReview = delivered.length >= 3 && returnRate >= 0.4;

    const lastOrder =
      customer.orders.length > 0 ? customer.orders[0].createdAt : null;

    return {
      ...customer,
      stats: {
        orders: nonCancelled.length,
        totalSpent: isAdmin ? totalSpent : undefined,
        avgOrder: isAdmin ? avgOrder : undefined,
        returns: returnCount,
        returnRate: isAdmin ? returnRate : undefined,
        needsReview: isAdmin ? needsReview : undefined,
        lastOrder,
      },
    };
  }

  // ============================================
  // Create
  // ============================================
  static async create(
    input: { name: string; phone: string; email?: string },
    prisma: PrismaClient
  ) {
    const phone = normalizePhone(input.phone);
    if (!phone) {
      throw new BadRequestError(
        'Invalid phone number. Use format: 01XXXXXXXXX'
      );
    }

    // Check duplicate
    const existing = await prisma.customer.findUnique({
      where: { phone },
      select: { id: true, name: true, phone: true },
    });
    if (existing) {
      throw new ConflictError(
        `Customer with this phone already exists (id: ${existing.id})`
      );
    }

    const created = await prisma.customer.create({
      data: {
        name: input.name.trim(),
        phone,
        email: input.email?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });

    return created;
  }

  // ============================================
  // Update (ADMIN only)
  // ============================================
  static async update(
    id: string,
    input: { name?: string; email?: string; phone?: string },
    prisma: PrismaClient
  ) {
    const data: Prisma.CustomerUpdateInput = {};

    if (input.name) data.name = input.name.trim();

    if (input.email !== undefined) {
      data.email = input.email?.trim() || null;
    }

    if (input.phone) {
      const phone = normalizePhone(input.phone);
      if (!phone) {
        throw new BadRequestError('Invalid phone number');
      }

      const existing = await prisma.customer.findUnique({
        where: { phone },
        select: { id: true },
      });
      if (existing && existing.id !== id) {
        throw new ConflictError('Another customer has this phone');
      }
      data.phone = phone;
    }

    return prisma.customer.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        updatedAt: true,
      },
    });
  }

  // ============================================
  // Block / Unblock (ADMIN)
  // ============================================
  static async block(
    id: string,
    reason: string,
    prisma: PrismaClient,
    actorId: string
  ) {
    if (!reason?.trim()) {
      throw new BadRequestError('Block reason is required');
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        blockedAt: new Date(),
        blockedReason: reason.trim(),
        blockedById: actorId,
      },
      select: { id: true, name: true, blockedAt: true, blockedReason: true },
    });

    // AuditLog
    await prisma.auditLog.create({
      data: {
        userId: actorId,
        actor: actorId,
        action: 'CUSTOMER_BLOCK',
        detail: `Blocked customer ${updated.name} (${id}): ${reason}`,
      },
    });

    return updated;
  }

  static async unblock(
    id: string,
    prisma: PrismaClient,
    actorId: string,
    reason?: string
  ) {
    const updated = await prisma.customer.update({
      where: { id },
      data: {
        blockedAt: null,
        blockedReason: null,
        blockedById: null,
      },
      select: { id: true, name: true, blockedAt: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        actor: actorId,
        action: 'CUSTOMER_UNBLOCK',
        detail: `Unblocked customer ${updated.name} (${id})${
          reason ? `: ${reason}` : ''
        }`,
      },
    });

    return updated;
  }

  // ============================================
  // Orders / Returns history
  // ============================================
  static async getOrders(id: string, prisma: PrismaClient) {
    return prisma.order.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        channel: true,
        status: true,
        total: true,
        subtotal: true,
        discount: true,
        paymentMethod: true,
        paymentStatus: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    });
  }

  static async getReturns(
    id: string,
    prisma: PrismaClient,
    options: { role?: 'STAFF' | 'ADMIN' } = {}
  ) {
    const isAdmin = options.role === 'ADMIN';

    const returns = await prisma.return.findMany({
      where: {
        order: { customerId: id },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        returnNumber: true,
        status: true,
        reason: true,
        refundAmount: isAdmin ? true : false,
        refundMethod: isAdmin ? true : false,
        createdAt: true,
        refundedAt: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        items: {
          select: {
            id: true,
            name: true,
            size: true,
            color: true,
            qty: true,
          },
        },
      },
    });

    return returns;
  }

  // ============================================
  // Addresses
  // ============================================
  static async getAddresses(id: string, prisma: PrismaClient) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!customer) throw new NotFoundError('Customer not found');

    if (!customer.userId) return [];

    return prisma.address.findMany({
      where: { userId: customer.userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  // ============================================
  // Notes
  // ============================================
  static async addNote(
    id: string,
    text: string,
    prisma: PrismaClient,
    authorId: string
  ) {
    if (!text?.trim()) {
      throw new BadRequestError('Note text is required');
    }

    return prisma.customerNote.create({
      data: {
        customerId: id,
        authorId,
        text: text.trim(),
      },
      select: {
        id: true,
        text: true,
        pinned: true,
        createdAt: true,
        authorId: true,
      },
    });
  }

  static async pinNote(
    id: string,
    noteId: string,
    pinned: boolean,
    prisma: PrismaClient,
    actorId: string
  ) {
    const note = await prisma.customerNote.findFirst({
      where: { id: noteId, customerId: id },
    });
    if (!note) throw new NotFoundError('Note not found');

    return prisma.customerNote.update({
      where: { id: noteId },
      data: { pinned },
      select: { id: true, text: true, pinned: true },
    });
  }

  static async deleteNote(
    id: string,
    noteId: string,
    prisma: PrismaClient,
    actorId: string
  ) {
    const note = await prisma.customerNote.findFirst({
      where: { id: noteId, customerId: id },
    });
    if (!note) throw new NotFoundError('Note not found');

    await prisma.customerNote.delete({ where: { id: noteId } });

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        actor: actorId,
        action: 'CUSTOMER_NOTE_DELETE',
        detail: `Deleted note ${noteId} for customer ${id}`,
      },
    });

    return { success: true };
  }

  // ============================================
  // Tags
  // ============================================
  static async addTag(
    id: string,
    tag: string,
    prisma: PrismaClient,
    actorId: string
  ) {
    if (!tag?.trim()) throw new BadRequestError('Tag is required');

    const clean = tag.trim().toLowerCase();

    try {
      return await prisma.customerTag.create({
        data: { customerId: id, tag: clean },
        select: { id: true, tag: true, createdAt: true },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictError('Tag already exists for this customer');
      }
      throw err;
    }
  }

  static async removeTag(
    id: string,
    tag: string,
    prisma: PrismaClient,
    actorId: string
  ) {
    const clean = tag.trim().toLowerCase();

    const existing = await prisma.customerTag.findFirst({
      where: { customerId: id, tag: clean },
    });
    if (!existing) throw new NotFoundError('Tag not found');

    await prisma.customerTag.delete({ where: { id: existing.id } });

    return { success: true };
  }

  // ============================================
  // Export CSV (ADMIN only)
  // ============================================
  static async exportCsv(
    filters: ListFilters,
    prisma: PrismaClient,
    actorId: string
  ) {
    // Fetch all matching (no pagination)
    const result = await this.list(
      { ...filters, limit: 10000, role: 'ADMIN' },
      prisma
    );

    const headers = [
      'ID',
      'Name',
      'Phone',
      'Email',
      'Orders',
      'Total Spent',
      'Last Order',
      'Status',
      'Tags',
      'Joined',
    ];

    const rows = result.items.map((c: any) => [
      c.id,
      c.name,
      c.phone,
      c.email || '',
      String(c.orders),
      String(c.totalSpent),
      c.lastOrder ? new Date(c.lastOrder).toISOString().split('T')[0] : '',
      c.status,
      (c.tags || []).join('; '),
      new Date(c.createdAt).toISOString().split('T')[0],
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? '');
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
              return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
          })
          .join(',')
      )
      .join('\n');

    // AuditLog
    await prisma.auditLog.create({
      data: {
        userId: actorId,
        actor: actorId,
        action: 'CUSTOMER_EXPORT',
        detail: `Exported ${result.items.length} customers to CSV`,
      },
    });

    return csv;
  }
}