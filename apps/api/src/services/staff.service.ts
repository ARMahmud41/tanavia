import type { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../utils/password.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../utils/errors.js';

type Role = 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN';

interface CreateStaffInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
}

interface UpdateStaffInput {
  name?: string;
  phone?: string;
  role?: Role;
  active?: boolean;
}

interface OpenShiftInput {
  openingCash: number;
  note?: string;
}

interface CloseShiftInput {
  closingCash: number;
  note?: string;
}

interface CreateReportInput {
  type:
    | 'WRONG_PRODUCT'
    | 'DAMAGE'
    | 'MISSING'
    | 'PRICE_ERROR'
    | 'CUSTOMER_ISSUE'
    | 'OTHER';
  title: string;
  description: string;
  productId?: string;
  orderId?: string;
  proofUrl?: string;
}

const STAFF_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const SHIFT_SELECT = {
  id: true,
  userId: true,
  status: true,
  openingCash: true,
  closingCash: true,
  openedAt: true,
  closedAt: true,
  note: true,
  user: {
    select: { id: true, name: true, email: true, role: true },
  },
} satisfies Prisma.ShiftSelect;

const REPORT_SELECT = {
  id: true,
  type: true,
  status: true,
  title: true,
  description: true,
  productId: true,
  orderId: true,
  proofUrl: true,
  adminNote: true,
  createdAt: true,
  resolvedAt: true,
  reporter: {
    select: { id: true, name: true, email: true, role: true },
  },
  resolver: {
    select: { id: true, name: true, email: true },
  },
} satisfies Prisma.StaffReportSelect;

export class StaffService {
  // ============================================
  // STAFF MANAGEMENT (admin only)
  // ============================================

  static async create(input: CreateStaffInput, prisma: PrismaClient) {
    if (input.role === 'CUSTOMER') {
      throw new BadRequestError('Use /api/auth/register for customer accounts');
    }

    const email = input.email.toLowerCase().trim();
    const phone = input.phone.trim();

    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingEmail) {
      throw new ConflictError('Email already in use');
    }

    const existingPhone = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (existingPhone) {
      throw new ConflictError('Phone already in use');
    }

    const passwordHash = await hashPassword(input.password);

    const staff = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        phone,
        passwordHash,
        role: input.role,
      },
      select: STAFF_SELECT,
    });

    return staff;
  }

  static async list(
    filters: { role?: Role; active?: boolean },
    prisma: PrismaClient
  ) {
    const where: Prisma.UserWhereInput = {
      role: { in: ['STAFF', 'MANAGER', 'ADMIN'] },
    };

    if (filters.role) where.role = filters.role;
    if (filters.active !== undefined) where.active = filters.active;

    const items = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: STAFF_SELECT,
    });

    return items;
  }

  static async getById(id: string, prisma: PrismaClient) {
    const staff = await prisma.user.findUnique({
      where: { id },
      select: STAFF_SELECT,
    });
    if (!staff) throw new NotFoundError('Staff not found');
    return staff;
  }

  static async update(
    id: string,
    input: UpdateStaffInput,
    prisma: PrismaClient
  ) {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!existing) throw new NotFoundError('Staff not found');

    if (input.role === 'CUSTOMER') {
      throw new BadRequestError('Cannot change staff to CUSTOMER role');
    }

    if (input.phone) {
      const phoneTaken = await prisma.user.findUnique({
        where: { phone: input.phone },
        select: { id: true },
      });
      if (phoneTaken && phoneTaken.id !== id) {
        throw new ConflictError('Phone already in use');
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.phone !== undefined) data.phone = input.phone.trim();
    if (input.role !== undefined) data.role = input.role;
    if (input.active !== undefined) data.active = input.active;

    const staff = await prisma.user.update({
      where: { id },
      data,
      select: STAFF_SELECT,
    });

    return staff;
  }

  static async deactivate(id: string, prisma: PrismaClient) {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!existing) throw new NotFoundError('Staff not found');

    // Prevent deactivating the last admin
    if (existing.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN', active: true },
      });
      if (adminCount <= 1) {
        throw new ForbiddenError('Cannot deactivate the last admin');
      }
    }

    const staff = await prisma.user.update({
      where: { id },
      data: { active: false },
      select: STAFF_SELECT,
    });

    return staff;
  }

  // ============================================
  // SHIFT MANAGEMENT
  // ============================================

  static async openShift(
    userId: string,
    input: OpenShiftInput,
    prisma: PrismaClient
  ) {
    if (typeof input.openingCash !== 'number' || input.openingCash < 0) {
      throw new BadRequestError('openingCash must be a non-negative number');
    }

    const existing = await prisma.shift.findFirst({
      where: { userId, status: 'OPEN' },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError('You already have an open shift. Close it first.');
    }

    const shift = await prisma.shift.create({
      data: {
        userId,
        status: 'OPEN',
        openingCash: input.openingCash,
        note: input.note,
      },
      select: SHIFT_SELECT,
    });

    return shift;
  }

  static async closeShift(
    userId: string,
    input: CloseShiftInput,
    prisma: PrismaClient
  ) {
    if (typeof input.closingCash !== 'number' || input.closingCash < 0) {
      throw new BadRequestError('closingCash must be a non-negative number');
    }

    const shift = await prisma.shift.findFirst({
      where: { userId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });
    if (!shift) {
      throw new NotFoundError('No open shift found');
    }

    // Compute expected cash: openingCash + offline CASH sales during shift
    const offlineOrders = await prisma.order.findMany({
      where: {
        shiftId: shift.id,
        channel: 'OFFLINE',
        paymentMethod: 'CASH',
        status: { in: ['DELIVERED', 'CONFIRMED', 'PACKED'] },
      },
      select: { total: true },
    });

    const cashSales = offlineOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0
    );
    const expectedCash = Number(shift.openingCash) + cashSales;
    const difference = input.closingCash - expectedCash;

    const updated = await prisma.shift.update({
      where: { id: shift.id },
      data: {
        status: 'CLOSED',
        closingCash: input.closingCash,
        closedAt: new Date(),
        note: input.note || shift.note,
      },
      select: SHIFT_SELECT,
    });

    return {
      ...updated,
      expectedCash,
      difference,
      cashSales,
    };
  }

  static async currentShift(userId: string, prisma: PrismaClient) {
    const shift = await prisma.shift.findFirst({
      where: { userId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
      select: SHIFT_SELECT,
    });
    return shift;
  }

  static async listShifts(
    filters: { userId?: string; status?: 'OPEN' | 'CLOSED'; from?: string; to?: string; page?: number; limit?: number },
    prisma: PrismaClient
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ShiftWhereInput = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.openedAt = {};
      if (filters.from) where.openedAt.gte = new Date(filters.from);
      if (filters.to) {
        const to = new Date(filters.to);
        to.setHours(23, 59, 59, 999);
        where.openedAt.lte = to;
      }
    }

    const [items, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        skip,
        take: limit,
        select: SHIFT_SELECT,
      }),
      prisma.shift.count({ where }),
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

  // ============================================
  // STAFF REPORTS
  // ============================================

  static async createReport(
    userId: string,
    input: CreateReportInput,
    prisma: PrismaClient
  ) {
    if (!input.title || input.title.trim().length < 3) {
      throw new BadRequestError('Title must be at least 3 characters');
    }
    if (!input.description || input.description.trim().length < 10) {
      throw new BadRequestError('Description must be at least 10 characters');
    }

    const report = await prisma.staffReport.create({
      data: {
        reportedBy: userId,
        type: input.type,
        title: input.title.trim(),
        description: input.description.trim(),
        productId: input.productId,
        orderId: input.orderId,
        proofUrl: input.proofUrl,
        status: 'OPEN',
      },
      select: REPORT_SELECT,
    });

    return report;
  }

  static async listReports(
    filters: { status?: string; type?: string; page?: number; limit?: number },
    prisma: PrismaClient
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.StaffReportWhereInput = {};
    if (filters.status) where.status = filters.status as any;
    if (filters.type) where.type = filters.type as any;

    const [items, total] = await Promise.all([
      prisma.staffReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: REPORT_SELECT,
      }),
      prisma.staffReport.count({ where }),
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

  static async resolveReport(
    id: string,
    resolverId: string,
    input: { status: 'IN_REVIEW' | 'RESOLVED' | 'REJECTED'; adminNote?: string },
    prisma: PrismaClient
  ) {
    const report = await prisma.staffReport.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!report) throw new NotFoundError('Report not found');

    const resolvedAt =
      input.status === 'RESOLVED' || input.status === 'REJECTED'
        ? new Date()
        : null;

    const updated = await prisma.staffReport.update({
      where: { id },
      data: {
        status: input.status,
        adminNote: input.adminNote,
        resolvedBy: resolverId,
        resolvedAt,
      },
      select: REPORT_SELECT,
    });

    return updated;
  }

  static async myReports(userId: string, prisma: PrismaClient) {
    const items = await prisma.staffReport.findMany({
      where: { reportedBy: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: REPORT_SELECT,
    });
    return items;
  }
}