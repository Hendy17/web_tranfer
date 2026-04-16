import { LancamentoCategoria, PrismaClient } from "@prisma/client";

export { LancamentoCategoria };
export type { LancamentoCategoria as PrismaLancamentoCategoria } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
	prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = prisma;
}