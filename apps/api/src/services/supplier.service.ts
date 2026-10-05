import type { PrismaClient, Prisma } from '@prisma/client';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';

// ============================================
// Types
// ============================================
interface CreateSupplierInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  note?: string;
  active?: boolean;
}

interface UpdateSupplierInput extends Partial<CreateSupplierInput> {}

// ============================================
// Selects
// ============================================
const SUPPLIER_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  note: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { purchases: true } },
} satisfies Prisma.SupplierSelect;

// ============================================
// Supplier Service
// ============================================
export class SupplierService {
  /**
   * List all suppliers.
   */
  static async list(
    filters: { active?: boolean; search?: string } = {},
    prisma: PrismaClient
  ) {
    const where: Prisma.SupplierWhereInput = {};

    if (filters.active !== undefined) where.active = filters.active;

    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    return prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      select: SUPPLIER_SELECT,
    });
  }

  /**
   * Get by ID.
   */
  static async getById(id: string, prisma: PrismaClient) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      select: SUPPLIER_SELECT,
    });
    if (!supplier) throw new NotFoundError('Supplier not found');
    return supplier;
  }

  /**
   * Create supplier.
   */
  static async create(
    input: CreateSupplierInput,
    prisma: PrismaClient,
    actorId?: string
  ) {
    if (!input.name?.trim()) {
      throw new BadRequestError('Supplier name is required');
    }
    if (!input.phone?.trim()) {
      throw new BadRequestError('Supplier phone is required');
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        note: input.note?.trim() || null,
        active: input.active ?? true,
      },
      select: SUPPLIER_SELECT,
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'SUPPLIER_CREATE',
          detail: `Created supplier: ${supplier.name}`,
        },
      });
    }

    return supplier;
  }

  /**
   * Update supplier.
   */
  static async update(
    id: string,
    input: UpdateSupplierInput,
    prisma: PrismaClient,
    actorId?: string
  ) {
    const existing = await prisma.supplier.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!existing) throw new NotFoundError('Supplier not found');

    const data: Prisma.SupplierUpdateInput = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.phone !== undefined) data.phone = input.phone.trim();
    if (input.email !== undefined) data.email = input.email?.trim() || null;
    if (input.address !== undefined)
      data.address = input.address?.trim() || null;
    if (input.note !== undefined) data.note = input.note?.trim() || null;
    if (input.active !== undefined) data.active = input.active;

    const updated = await prisma.supplier.update({
      where: { id },
      data,
      select: SUPPLIER_SELECT,
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'SUPPLIER_UPDATE',
          detail: `Updated supplier: ${updated.name}`,
        },
      });
    }

    return updated;
  }

  /**
   * Delete supplier (soft — only if no purchases).
   */
  static async remove(id: string, prisma: PrismaClient, actorId?: string) {
    const existing = await prisma.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: { select: { purchases: true } },
      },
    });
    if (!existing) throw new NotFoundError('Supplier not found');

    if (existing._count.purchases > 0) {
      throw new ConflictError(
        `Cannot delete "${existing.name}" — ${existing._count.purchases} purchase orders exist. Mark inactive instead.`
      );
    }

    await prisma.supplier.delete({ where: { id } });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'SUPPLIER_DELETE',
          detail: `Deleted supplier: ${existing.name}`,
        },
      });
    }

    return { success: true };
  }
}