import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton.
 *
 * In development Next.js hot-reloads modules, which would otherwise create a new
 * PrismaClient (and a new connection pool) on every reload and exhaust the database.
 * Caching the instance on `globalThis` avoids that. In production a fresh module
 * graph is created per serverless instance, so the guard is a no-op there.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
