import { PrismaClient } from "../../node_modules/.prisma/client";

export { LancamentoCategoria } from "../../node_modules/.prisma/client";
export type { LancamentoCategoria as PrismaLancamentoCategoria } from "../../node_modules/.prisma/client";

const globalForPrisma = globalThis as unknown as {
	prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = prisma;
}