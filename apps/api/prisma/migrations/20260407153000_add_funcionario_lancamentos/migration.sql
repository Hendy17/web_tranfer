CREATE TYPE "LancamentoTipo" AS ENUM ('GANHO', 'GASTO');
CREATE TYPE "LancamentoCategoria" AS ENUM (
    'UBER',
    'N99',
    'BLABLACAR',
    'TRANSFER',
    'PARTICULAR',
    'RECARGA',
    'LIMPEZA',
    'REVISAO',
    'MANUTENCAO'
);

CREATE TABLE "FuncionarioLancamento" (
    "id" SERIAL NOT NULL,
    "funcionarioId" INTEGER NOT NULL,
    "tipo" "LancamentoTipo" NOT NULL,
    "categoria" "LancamentoCategoria" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "kmRodados" DECIMAL(10,2),
    "observacao" TEXT,
    "dataReferencia" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuncionarioLancamento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FuncionarioLancamento_funcionarioId_dataReferencia_idx" ON "FuncionarioLancamento"("funcionarioId", "dataReferencia");

ALTER TABLE "FuncionarioLancamento"
ADD CONSTRAINT "FuncionarioLancamento_funcionarioId_fkey"
FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
