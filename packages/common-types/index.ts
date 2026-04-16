// Tipos compartilhados para o monorepo


export interface User {
  id: number;
  email: string;
  name?: string;
  createdAt: string;
}

export type DashboardPeriodFilter = "day" | "week" | "month" | "custom";

export interface ParametrosCombustaoHipotetica {
  kmPorLitro: number;
  precoLitro: number;
  cpk: number;
}

export interface ResumoEficienciaEnergetica {
  totalKm: number;
  custoRealRecargas: number;
  cpkReal: number;
  cpkCombustao: number;
  custoCombustaoHipotetico: number;
  economiaTotal: number;
  totalRecargas: number;
  recargasGratuitas: number;
  percentualRecargasGratuitas: number;
}

export interface EficienciaEnergeticaPorVeiculo extends ResumoEficienciaEnergetica {
  veiculoId: number;
  nome: string;
  placa: string | null;
}

export interface DashboardEficienciaEnergetica {
  periodoInicio: string;
  periodoFim: string;
  veiculoId: number | null;
  parametrosCombustao: ParametrosCombustaoHipotetica;
  resumo: ResumoEficienciaEnergetica;
  porVeiculo: EficienciaEnergeticaPorVeiculo[];
}

export interface EficienciaEnergeticaPorFuncionario extends ResumoEficienciaEnergetica {
  funcionarioId: number;
  nome: string;
  veiculosAtivos: number;
}

export interface DashboardExecutivoResumoMensal {
  referenciaMes: string;
  label: string;
  totalGanhos: number;
  totalGastos: number;
  saldo: number;
  totalRecargas: number;
  totalPrestacao: number;
  totalSeguro: number;
  totalCustosFixos: number;
  percentualCustosFixosSobreGastos: number;
}

export interface DashboardExecutivoEmpresa {
  empresa: string;
  periodo: DashboardPeriodFilter;
  periodoInicio: string;
  periodoFim: string;
  parametrosCombustao: ParametrosCombustaoHipotetica;
  resumo: ResumoEficienciaEnergetica;
  totais: {
    funcionariosAtivos: number;
    veiculosAtivos: number;
  };
  resumoMensal: DashboardExecutivoResumoMensal[];
  porFuncionario: EficienciaEnergeticaPorFuncionario[];
  porVeiculo: EficienciaEnergeticaPorVeiculo[];
}
