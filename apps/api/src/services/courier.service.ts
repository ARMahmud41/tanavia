import type { PrismaClient, Prisma } from '@prisma/client';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';

// ============================================
// Types
// ============================================
interface CreateCourierInput {
  name: string;
  slug?: string;
  logo?: string;
  phone?: string;
  email?: string;
  website?: string;
  apiBaseUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  active?: boolean;
  isDefault?: boolean;
  codEnabled?: boolean;
  codFeePercent?: number;
  codFeeFixed?: number;
  contactPerson?: string;
  paymentCycle?: string;
  notes?: string;
}

interface UpdateCourierInput extends Partial<CreateCourierInput> {}

interface CreateRateInput {
  district: string;
  weightUpTo?: number;
  deliveryFee: number;
  extraPerKg?: number;
  codFee?: number;
  returnFee: number;
  active?: boolean;
}

// ============================================
// Helpers
// ============================================
function slugify(text: string): string {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================
// Selects
// ============================================
const COURIER_PUBLIC_SELECT = {
  id: true,
  name: true,
  slug: true,
  logo: true,
  phone: true,
  email: true,
  website: true,
  active: true,
  isDefault: true,
  codEnabled: true,
  codFeePercent: true,
  codFeeFixed: true,
  contactPerson: true,
  paymentCycle: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      orders: true,
      rates: true,
      returns: true,
      settlements: true,
    },
  },
} satisfies Prisma.CourierSelect;

const COURIER_ADMIN_SELECT = {
  ...COURIER_PUBLIC_SELECT,
  apiBaseUrl: true,
  apiKey: true,
  apiSecret: true,
  apiToken: true,
  apiTokenExpiresAt: true,
} satisfies Prisma.CourierSelect;

const RATE_SELECT = {
  id: true,
  courierId: true,
  district: true,
  weightUpTo: true,
  deliveryFee: true,
  extraPerKg: true,
  codFee: true,
  returnFee: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CourierRateSelect;

// ============================================
// Courier Service
// ============================================
export class CourierService {
  // ============================================
  // List couriers (role-aware)
  // ============================================
  static async list(
    filters: { active?: boolean; search?: string } = {},
    prisma: PrismaClient,
    options: { role?: 'STAFF' | 'ADMIN' } = {}
  ) {
    const isAdmin = options.role === 'ADMIN';

    const where: Prisma.CourierWhereInput = {};
    if (filters.active !== undefined) where.active = filters.active;
    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const couriers = await prisma.courier.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: isAdmin ? COURIER_ADMIN_SELECT : COURIER_PUBLIC_SELECT,
    });

    // Strip API credentials for staff
    if (!isAdmin) {
      return couriers.map((c: any) => {
        const { apiBaseUrl, apiKey, apiSecret, apiToken, apiTokenExpiresAt, ...rest } = c;
        return rest;
      });
    }

    return couriers;
  }

  // ============================================
  // Stats
  // ============================================
  static async stats(prisma: PrismaClient) {
    const [total, active, inactive] = await Promise.all([
      prisma.courier.count(),
      prisma.courier.count({ where: { active: true } }),
      prisma.courier.count({ where: { active: false } }),
    ]);

    return { total, active, inactive };
  }

  // ============================================
  // Get by ID (role-aware)
  // ============================================
  static async getById(
    id: string,
    prisma: PrismaClient,
    options: { role?: 'STAFF' | 'ADMIN' } = {}
  ) {
    const isAdmin = options.role === 'ADMIN';

    const courier = await prisma.courier.findUnique({
      where: { id },
      select: isAdmin ? COURIER_ADMIN_SELECT : COURIER_PUBLIC_SELECT,
    });

    if (!courier) throw new NotFoundError('Courier not found');

    if (!isAdmin) {
      const { apiBaseUrl, apiKey, apiSecret, apiToken, apiTokenExpiresAt, ...rest } =
        courier as any;
      return rest;
    }

    return courier;
  }

  // ============================================
  // Create courier (ADMIN)
  // ============================================
  static async create(
    input: CreateCourierInput,
    prisma: PrismaClient,
    actorId?: string
  ) {
    if (!input.name?.trim()) {
      throw new BadRequestError('Courier name is required');
    }

    const name = input.name.trim();
    let slug = input.slug?.trim() || slugify(name);

    // Unique slug
    let baseSlug = slug;
    let n = 1;
    while (await prisma.courier.findUnique({ where: { slug } })) {
      n++;
      slug = `${baseSlug}-${n}`;
    }

    // If isDefault true, unset other defaults
    if (input.isDefault) {
      await prisma.courier.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const courier = await prisma.courier.create({
      data: {
        name,
        slug,
        logo: input.logo || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        website: input.website?.trim() || null,
        apiBaseUrl: input.apiBaseUrl?.trim() || null,
        apiKey: input.apiKey?.trim() || null,
        apiSecret: input.apiSecret?.trim() || null,
        active: input.active ?? true,
        isDefault: input.isDefault ?? false,
        codEnabled: input.codEnabled ?? true,
        codFeePercent: input.codFeePercent ?? 1,
        codFeeFixed: input.codFeeFixed ?? 0,
        contactPerson: input.contactPerson?.trim() || null,
        paymentCycle: input.paymentCycle?.trim() || null,
        notes: input.notes?.trim() || null,
      },
      select: COURIER_ADMIN_SELECT,
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'COURIER_CREATE',
          detail: `Created courier: ${courier.name}`,
        },
      });
    }

    return courier;
  }

  // ============================================
  // Update courier (ADMIN)
  // ============================================
  static async update(
    id: string,
    input: UpdateCourierInput,
    prisma: PrismaClient,
    actorId?: string
  ) {
    const existing = await prisma.courier.findUnique({
      where: { id },
      select: { id: true, name: true, isDefault: true },
    });
    if (!existing) throw new NotFoundError('Courier not found');

    // If isDefault true, unset others
    if (input.isDefault === true && !existing.isDefault) {
      await prisma.courier.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const data: Prisma.CourierUpdateInput = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.logo !== undefined) data.logo = input.logo || null;
    if (input.phone !== undefined) data.phone = input.phone?.trim() || null;
    if (input.email !== undefined) data.email = input.email?.trim() || null;
    if (input.website !== undefined) data.website = input.website?.trim() || null;
    if (input.apiBaseUrl !== undefined)
      data.apiBaseUrl = input.apiBaseUrl?.trim() || null;
    if (input.apiKey !== undefined) data.apiKey = input.apiKey?.trim() || null;
    if (input.apiSecret !== undefined)
      data.apiSecret = input.apiSecret?.trim() || null;
    if (input.active !== undefined) data.active = input.active;
    if (input.isDefault !== undefined) data.isDefault = input.isDefault;
    if (input.codEnabled !== undefined) data.codEnabled = input.codEnabled;
    if (input.codFeePercent !== undefined)
      data.codFeePercent = input.codFeePercent;
    if (input.codFeeFixed !== undefined) data.codFeeFixed = input.codFeeFixed;
    if (input.contactPerson !== undefined)
      data.contactPerson = input.contactPerson?.trim() || null;
    if (input.paymentCycle !== undefined)
      data.paymentCycle = input.paymentCycle?.trim() || null;
    if (input.notes !== undefined) data.notes = input.notes?.trim() || null;

    const updated = await prisma.courier.update({
      where: { id },
      data,
      select: COURIER_ADMIN_SELECT,
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'COURIER_UPDATE',
          detail: `Updated courier: ${updated.name}`,
        },
      });
    }

    return updated;
  }

  // ============================================
  // Delete courier (ADMIN)
  // ============================================
  static async remove(id: string, prisma: PrismaClient, actorId?: string) {
    const existing = await prisma.courier.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: { select: { orders: true, settlements: true } },
      },
    });
    if (!existing) throw new NotFoundError('Courier not found');

    if (existing._count.orders > 0 || existing._count.settlements > 0) {
      throw new ConflictError(
        `Cannot delete "${existing.name}" — has ${existing._count.orders} orders and ${existing._count.settlements} settlements. Mark inactive instead.`
      );
    }

    await prisma.courier.delete({ where: { id } });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'COURIER_DELETE',
          detail: `Deleted courier: ${existing.name}`,
        },
      });
    }

    return { success: true };
  }

  // ============================================
  // Rates — List (for a courier)
  // ============================================
  static async listRates(courierId: string, prisma: PrismaClient) {
    const courier = await prisma.courier.findUnique({
      where: { id: courierId },
      select: { id: true },
    });
    if (!courier) throw new NotFoundError('Courier not found');

    return prisma.courierRate.findMany({
      where: { courierId },
      orderBy: [{ district: 'asc' }, { weightUpTo: 'asc' }],
      select: RATE_SELECT,
    });
  }

  // ============================================
  // Rates — Create (ADMIN)
  // ============================================
  static async createRate(
    courierId: string,
    input: CreateRateInput,
    prisma: PrismaClient,
    actorId?: string
  ) {
    if (!input.district?.trim()) {
      throw new BadRequestError('District is required');
    }
    if (input.deliveryFee == null || input.deliveryFee < 0) {
      throw new BadRequestError('Delivery fee is required');
    }

    const courier = await prisma.courier.findUnique({
      where: { id: courierId },
      select: { id: true, name: true },
    });
    if (!courier) throw new NotFoundError('Courier not found');

    const weightUpTo = input.weightUpTo ?? 0.5;

    // Check duplicate
    const existing = await prisma.courierRate.findUnique({
      where: {
        courierId_district_weightUpTo: {
          courierId,
          district: input.district.trim(),
          weightUpTo,
        },
      },
    });
    if (existing) {
      throw new ConflictError(
        `Rate for ${input.district} up to ${weightUpTo}kg already exists`
      );
    }

    const rate = await prisma.courierRate.create({
      data: {
        courierId,
        district: input.district.trim(),
        weightUpTo,
        deliveryFee: input.deliveryFee,
        extraPerKg: input.extraPerKg ?? 0,
        codFee: input.codFee ?? 0,
        returnFee: input.returnFee,
        active: input.active ?? true,
      },
      select: RATE_SELECT,
    });

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'COURIER_RATE_CREATE',
          detail: `${courier.name}: ${rate.district} ≤ ${rate.weightUpTo}kg @ ৳${rate.deliveryFee}`,
        },
      });
    }

    return rate;
  }

  // ============================================
  // Rates — Update (ADMIN)
  // ============================================
  static async updateRate(
    rateId: string,
    input: Partial<CreateRateInput>,
    prisma: PrismaClient,
    actorId?: string
  ) {
    const rate = await prisma.courierRate.findUnique({
      where: { id: rateId },
      select: { id: true, courierId: true, district: true },
    });
    if (!rate) throw new NotFoundError('Rate not found');

    const data: Prisma.CourierRateUpdateInput = {};
    if (input.district !== undefined) data.district = input.district.trim();
    if (input.weightUpTo !== undefined) data.weightUpTo = input.weightUpTo;
    if (input.deliveryFee !== undefined) data.deliveryFee = input.deliveryFee;
    if (input.extraPerKg !== undefined) data.extraPerKg = input.extraPerKg;
    if (input.codFee !== undefined) data.codFee = input.codFee;
    if (input.returnFee !== undefined) data.returnFee = input.returnFee;
    if (input.active !== undefined) data.active = input.active;

    return prisma.courierRate.update({
      where: { id: rateId },
      data,
      select: RATE_SELECT,
    });
  }

  // ============================================
  // Rates — Delete (ADMIN)
  // ============================================
  static async deleteRate(rateId: string, prisma: PrismaClient) {
    const rate = await prisma.courierRate.findUnique({
      where: { id: rateId },
    });
    if (!rate) throw new NotFoundError('Rate not found');

    await prisma.courierRate.delete({ where: { id: rateId } });
    return { success: true };
  }

  // ============================================
  // Rates — CSV Bulk Import (ADMIN)
  // ============================================
  static async importRates(
    courierId: string,
    rows: Array<{
      district: string;
      weightUpTo?: number;
      deliveryFee: number;
      extraPerKg?: number;
      codFee?: number;
      returnFee: number;
    }>,
    prisma: PrismaClient,
    actorId?: string
  ) {
    const courier = await prisma.courier.findUnique({
      where: { id: courierId },
      select: { id: true, name: true },
    });
    if (!courier) throw new NotFoundError('Courier not found');

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      if (!row.district || row.deliveryFee == null || row.returnFee == null) {
        skipped++;
        continue;
      }

      const weightUpTo = row.weightUpTo ?? 0.5;

      try {
        const existing = await prisma.courierRate.findUnique({
          where: {
            courierId_district_weightUpTo: {
              courierId,
              district: row.district.trim(),
              weightUpTo,
            },
          },
        });

        if (existing) {
          await prisma.courierRate.update({
            where: { id: existing.id },
            data: {
              deliveryFee: row.deliveryFee,
              extraPerKg: row.extraPerKg ?? 0,
              codFee: row.codFee ?? 0,
              returnFee: row.returnFee,
            },
          });
          updated++;
        } else {
          await prisma.courierRate.create({
            data: {
              courierId,
              district: row.district.trim(),
              weightUpTo,
              deliveryFee: row.deliveryFee,
              extraPerKg: row.extraPerKg ?? 0,
              codFee: row.codFee ?? 0,
              returnFee: row.returnFee,
            },
          });
          created++;
        }
      } catch {
        skipped++;
      }
    }

    if (actorId) {
      await prisma.auditLog.create({
        data: {
          userId: actorId,
          actor: actorId,
          action: 'COURIER_RATE_IMPORT',
          detail: `${courier.name}: ${created} created, ${updated} updated, ${skipped} skipped`,
        },
      });
    }

    return { created, updated, skipped };
  }

  // ============================================
  // Calculate shipping charge for an order
  // ============================================
  static async calculateCharge(
    courierId: string,
    district: string,
    weightKg: number,
    codAmount: number,
    prisma: PrismaClient
  ) {
    const courier = await prisma.courier.findUnique({
      where: { id: courierId },
      select: {
        id: true,
        name: true,
        codFeePercent: true,
        codFeeFixed: true,
      },
    });
    if (!courier) throw new NotFoundError('Courier not found');

    // Find best rate: lowest weight bracket that covers weightKg
    const rate = await prisma.courierRate.findFirst({
      where: {
        courierId,
        district: district.trim(),
        active: true,
        weightUpTo: { gte: weightKg },
      },
      orderBy: { weightUpTo: 'asc' },
    });

    if (!rate) {
      throw new BadRequestError(
        `No courier rate found for ${district} up to ${weightKg}kg`
      );
    }

    const deliveryFee = Number(rate.deliveryFee);
    const extraKg = Math.max(0, weightKg - Number(rate.weightUpTo));
    const extraCharge = extraKg * Number(rate.extraPerKg);
    const codFeeFromRate = Number(rate.codFee);
    const codFeeFromPercent = (Number(courier.codFeePercent) / 100) * codAmount;
    const codFee = Math.max(codFeeFromRate, codFeeFromPercent) + Number(courier.codFeeFixed);

    const total = deliveryFee + extraCharge + codFee;

    return {
      courierId,
      courierName: courier.name,
      district,
      weightKg,
      rateId: rate.id,
      rateBracketKg: Number(rate.weightUpTo),
      deliveryFee,
      extraCharge,
      codFee,
      returnFee: Number(rate.returnFee),
      total,
    };
  }
}