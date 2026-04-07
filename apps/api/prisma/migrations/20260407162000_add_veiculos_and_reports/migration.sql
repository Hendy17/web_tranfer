CREATE TABLE "Veiculo" (
    "id" SERIAL NOT NULL,
    "funcionarioId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "placa" TEXT,
    "eletrico" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Veiculo_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FuncionarioLancamento" ADD COLUMN "veiculoId" INTEGER;

CREATE INDEX "Veiculo_funcionarioId_idx" ON "Veiculo"("funcionarioId");
CREATE INDEX "FuncionarioLancamento_veiculoId_idx" ON "FuncionarioLancamento"("veiculoId");

ALTER TABLE "Veiculo"
ADD CONSTRAINT "Veiculo_funcionarioId_fkey"
FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FuncionarioLancamento"
ADD CONSTRAINT "FuncionarioLancamento_veiculoId_fkey"
FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
