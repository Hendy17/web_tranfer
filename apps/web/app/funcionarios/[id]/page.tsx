"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DashboardEficienciaEnergetica, DashboardPeriodFilter } from "common-types";
import { useParams } from "next/navigation";
import {
	AuditOutlined,
	CarOutlined,
	DollarOutlined,
	FileExcelOutlined,
	FilePdfOutlined,
	FilterOutlined,
	ThunderboltOutlined,
	ToolOutlined,
} from "@ant-design/icons";
import {
	Button,
	Card,
	Col,
	Divider,
	Empty,
	Form,
	Input,
	InputNumber,
	Pagination,
	Popconfirm,
	Row,
	Select,
	Space,
	Spin,
	Tag,
	Typography,
	message,
} from "antd";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import AuthenticatedHeader from "@/components/authenticated-header";
import { fetchJson } from "@/lib/http";
import styles from "./page.module.css";

interface FuncionarioDetalhe {
	id: number;
	name: string;
	createdAt: string;
}

interface FuncionarioResumo {
	totalGanhos: number;
	totalGastos: number;
	saldo: number;
	totalKm: number;
	custoPorKm: number;
	ganhoPorKm: number;
}

interface Veiculo {
	id: number;
	nome: string;
	placa: string | null;
	eletrico: boolean;
	createdAt: string;
}

interface ResumoPorVeiculo {
	veiculoId: number;
	nome: string;
	placa: string | null;
	resumo: FuncionarioResumo;
}

type Categoria =
	| "UBER"
	| "N99"
	| "BLABLACAR"
	| "TRANSFER"
	| "PARTICULAR"
	| "RECARGA"
	| "PEDAGIOS"
	| "PRESTACAO"
	| "SEGURO"
	| "LIMPEZA"
	| "REVISAO"
	| "MANUTENCAO";

interface FuncionarioLancamento {
	id: number;
	tipo: "GANHO" | "GASTO";
	categoria: Categoria;
	valor: number;
	kmRodados: number | null;
	bateriaConsumidaPercentual: number | null;
	observacao: string | null;
	dataReferencia: string;
	createdAt: string;
	veiculo: {
		id: number;
		nome: string;
		placa: string | null;
	} | null;
}

interface FuncionarioDetalheResponse {
	funcionario: FuncionarioDetalhe;
	filtros: {
		period: DashboardPeriodFilter;
		periodStart: string;
		periodEnd: string;
		veiculoId: number | null;
		categories: Categoria[];
	};
	pagination: {
		page: number;
		pageSize: number;
		totalItems: number;
		totalPages: number;
	};
	veiculos: Veiculo[];
	eficienciaEnergetica: DashboardEficienciaEnergetica;
	resumo: FuncionarioResumo;
	resumoPorVeiculo: ResumoPorVeiculo[];
	lancamentos: FuncionarioLancamento[];
}

type VeiculoFilterValue = number | "all";

interface LancamentoFormValues {
	tipo: "GANHO" | "GASTO";
	categoria: Categoria;
	veiculoId: number;
	valor: number;
	kmRodados?: number;
	bateriaConsumidaPercentual?: number;
	observacao?: string;
	dataReferencia: string;
}

interface VeiculoFormValues {
	nome: string;
	placa?: string;
}

interface CategoriaOption {
	value: Categoria;
	label: string;
}

const ganhoCategorias = [
	{ value: "UBER", label: "Uber" },
	{ value: "N99", label: "99" },
	{ value: "BLABLACAR", label: "Blablacar" },
	{ value: "TRANSFER", label: "Transfer" },
	{ value: "PARTICULAR", label: "Corrida particular" },
] as const;

const gastoCategorias = [
	{ value: "RECARGA", label: "Recarga" },
	{ value: "PEDAGIOS", label: "Pedágios" },
	{ value: "PRESTACAO", label: "Prestação do carro" },
	{ value: "SEGURO", label: "Seguro do carro" },
	{ value: "LIMPEZA", label: "Limpeza" },
	{ value: "REVISAO", label: "Revisão" },
	{ value: "MANUTENCAO", label: "Manutenção" },
] as const;

const allCategoriaOptions: CategoriaOption[] = [
	...ganhoCategorias,
	...gastoCategorias,
].map((item) => ({ value: item.value, label: item.label }));

const categoriaLabels: Record<Categoria, string> = {
	UBER: "Uber",
	N99: "99",
	BLABLACAR: "Blablacar",
	TRANSFER: "Transfer",
	PARTICULAR: "Corrida particular",
	RECARGA: "Recarga",
	PEDAGIOS: "Pedágios",
	PRESTACAO: "Prestação do carro",
	SEGURO: "Seguro do carro",
	LIMPEZA: "Limpeza",
	REVISAO: "Revisão",
	MANUTENCAO: "Manutenção",
};

const categoriaTipoMap: Record<Categoria, LancamentoFormValues["tipo"]> = {
	UBER: "GANHO",
	N99: "GANHO",
	BLABLACAR: "GANHO",
	TRANSFER: "GANHO",
	PARTICULAR: "GANHO",
	RECARGA: "GASTO",
	PEDAGIOS: "GASTO",
	PRESTACAO: "GASTO",
	SEGURO: "GASTO",
	LIMPEZA: "GASTO",
	REVISAO: "GASTO",
	MANUTENCAO: "GASTO",
};

const periodLabels: Record<DashboardPeriodFilter, string> = {
	day: "Hoje",
	week: "Esta semana",
	month: "Este mês",
	custom: "Intervalo customizado",
};

function formatCurrency(value: number) {
	return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatPercentage(value: number) {
	return `${value.toFixed(1)}%`;
}

function calcularCustoCombustao(kmRodados: number) {
	return kmRodados * 0.65;
}

function isRecargaLancamento(lancamento: Pick<FuncionarioLancamento, "tipo" | "categoria">) {
	return lancamento.tipo === "GASTO" && lancamento.categoria === "RECARGA";
}

function isCustoRecorrenteMensal(lancamento: Pick<FuncionarioLancamento, "tipo" | "categoria">) {
	return (
		lancamento.tipo === "GASTO"
		&& (lancamento.categoria === "PRESTACAO" || lancamento.categoria === "SEGURO")
	);
}

function formatInputDate(value: string) {
	return value.slice(0, 10);
}

function formatPeriodLabel(period: DashboardPeriodFilter, start: string, end: string) {
	if (period !== "custom") {
		return periodLabels[period];
	}

	return `${new Date(start).toLocaleDateString("pt-BR")} até ${new Date(end).toLocaleDateString("pt-BR")}`;
}

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : "Erro inesperado.";
}

function buildDetailUrl(
	funcionarioId: string,
	period: DashboardPeriodFilter,
	periodStart: string,
	periodEnd: string,
	veiculoId: number | null,
	categories: Categoria[],
	page: number,
	pageSize: number,
) {
	const params = new URLSearchParams({
		period,
		page: String(page),
		pageSize: String(pageSize),
	});
	if (period === "custom") {
		params.set("periodStart", periodStart);
		params.set("periodEnd", periodEnd);
	}
	if (veiculoId) {
		params.set("veiculoId", String(veiculoId));
	}
	if (categories.length > 0) {
		params.set("categories", categories.join(","));
	}
	return `/api/funcionarios/${funcionarioId}?${params.toString()}`;
}

export default function FuncionarioDetalhePage() {
	const params = useParams<{ id: string }>();
	const funcionarioId = params?.id;
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [savingVeiculo, setSavingVeiculo] = useState(false);
	const [downloadingExcel, setDownloadingExcel] = useState(false);
	const [downloadingPdf, setDownloadingPdf] = useState(false);
	const [editingLancamento, setEditingLancamento] = useState<FuncionarioLancamento | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [data, setData] = useState<FuncionarioDetalheResponse | null>(null);
	const [period, setPeriod] = useState<DashboardPeriodFilter>("month");
	const [customPeriodStart, setCustomPeriodStart] = useState(() => {
		const today = new Date();
		return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
	});
	const [customPeriodEnd, setCustomPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
	const [selectedVeiculoId, setSelectedVeiculoId] = useState<number | null>(null);
	const [selectedCategories, setSelectedCategories] = useState<Categoria[]>([]);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(8);
	const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
	const [chartWidth, setChartWidth] = useState(0);
	const [form] = Form.useForm<LancamentoFormValues>();
	const [veiculoForm] = Form.useForm<VeiculoFormValues>();
	const tipoSelecionado = Form.useWatch("tipo", form) ?? "GANHO";
	const categoriaSelecionada = Form.useWatch("categoria", form);
	const ultimoTipoRef = useRef<LancamentoFormValues["tipo"] | null>(null);
	const chartWrapRef = useRef<HTMLDivElement | null>(null);
	const recargaSelecionada = tipoSelecionado === "GASTO" && categoriaSelecionada === "RECARGA";
	const prestacaoSelecionada = tipoSelecionado === "GASTO" && categoriaSelecionada === "PRESTACAO";
	const seguroSelecionado = tipoSelecionado === "GASTO" && categoriaSelecionada === "SEGURO";
	const despesaMensalSelecionada = prestacaoSelecionada || seguroSelecionado;

	const categoriaOptions = useMemo<CategoriaOption[]>(() => allCategoriaOptions, []);

	const chartData = useMemo(
		() =>
			(data?.resumoPorVeiculo ?? []).map((item) => ({
				name: item.placa ? `${item.nome} (${item.placa})` : item.nome,
				lucro: Number(item.resumo.saldo.toFixed(2)),
				gastos: Number(item.resumo.totalGastos.toFixed(2)),
				km: Number(item.resumo.totalKm.toFixed(2)),
			})),
		[data],
	);

	const activeFilterCount = (selectedVeiculoId ? 1 : 0) + selectedCategories.length + 1 + (period === "custom" ? 2 : 0);

	const loadFuncionario = useCallback(async () => {
		if (!funcionarioId) {
			return;
		}

		setLoading(true);
		try {
			const response = await fetchJson<FuncionarioDetalheResponse>(
				buildDetailUrl(funcionarioId, period, customPeriodStart, customPeriodEnd, selectedVeiculoId, selectedCategories, page, pageSize),
			);
			setData(response);
			const firstVeiculo = response.veiculos[0];
			if (firstVeiculo) {
				const defaultVeiculoId = selectedVeiculoId ?? firstVeiculo.id;
				form.setFieldsValue({ veiculoId: defaultVeiculoId, tipo: form.getFieldValue("tipo") ?? "GANHO" });
			}
		} catch (error: unknown) {
			message.error(getErrorMessage(error));
		} finally {
			setLoading(false);
		}
	}, [customPeriodEnd, customPeriodStart, form, funcionarioId, page, pageSize, period, selectedCategories, selectedVeiculoId]);

	useEffect(() => {
		void loadFuncionario();
	}, [loadFuncionario]);

	useEffect(() => {
		if (!chartWrapRef.current) {
			return;
		}

		const element = chartWrapRef.current;
		const updateChartWidth = (nextWidth: number) => {
			setChartWidth(nextWidth > 0 ? Math.max(Math.floor(nextWidth), 320) : 0);
		};

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) {
				return;
			}

			updateChartWidth(entry.contentRect.width);
		});

		observer.observe(element);
		const frame = window.requestAnimationFrame(() => {
			updateChartWidth(element.clientWidth);
		});

		return () => {
			window.cancelAnimationFrame(frame);
			observer.disconnect();
		};
	}, []);

	useEffect(() => {
		if (!data) {
			return;
		}

		setCustomPeriodStart(formatInputDate(data.filtros.periodStart));
		setCustomPeriodEnd(formatInputDate(data.filtros.periodEnd));
	}, [data]);

	useEffect(() => {
		if (ultimoTipoRef.current && ultimoTipoRef.current !== tipoSelecionado) {
			const categoriaAtual = form.getFieldValue("categoria") as Categoria | undefined;

			if (categoriaAtual && categoriaTipoMap[categoriaAtual] !== tipoSelecionado) {
				form.setFieldValue("categoria", undefined);
				form.setFieldValue("bateriaConsumidaPercentual", undefined);
				message.info("Selecione uma categoria compatível com o tipo escolhido.");
			}
		}

		ultimoTipoRef.current = tipoSelecionado;
	}, [form, tipoSelecionado]);

	useEffect(() => {
		if (!recargaSelecionada && form.getFieldValue("bateriaConsumidaPercentual") != null) {
			form.setFieldValue("bateriaConsumidaPercentual", undefined);
		}
	}, [form, recargaSelecionada]);

	useEffect(() => {
		if (despesaMensalSelecionada && form.getFieldValue("kmRodados") != null) {
			form.setFieldValue("kmRodados", undefined);
		}
	}, [despesaMensalSelecionada, form]);

	function resetLancamentoForm(defaultVeiculoId?: number) {
		form.resetFields();
		form.setFieldsValue({
			tipo: "GANHO",
			dataReferencia: new Date().toISOString().slice(0, 10),
			veiculoId: defaultVeiculoId,
		});
		setEditingLancamento(null);
		setIsEditing(false);
	}

	const onFinish = async (values: LancamentoFormValues) => {
		if (!funcionarioId) {
			return;
		}

		setSubmitting(true);
		try {
			if (editingLancamento) {
				await fetchJson(`/api/funcionarios/${funcionarioId}/lancamentos/${editingLancamento.id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ...values, kmRodados: values.kmRodados || null }),
				});
				message.success("Lançamento atualizado com sucesso.");
			} else {
				await fetchJson(`/api/funcionarios/${funcionarioId}/lancamentos`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ...values, kmRodados: values.kmRodados || null }),
				});
				message.success("Lançamento salvo com sucesso.");
			}

			await loadFuncionario();
			resetLancamentoForm(data?.veiculos[0]?.id);
		} catch (error: unknown) {
			message.error(getErrorMessage(error));
		} finally {
			setSubmitting(false);
		}
	};

	const onCreateVeiculo = async (values: VeiculoFormValues) => {
		if (!funcionarioId) {
			return;
		}

		setSavingVeiculo(true);
		try {
			const response = await fetchJson<{ veiculo: Veiculo }>(`/api/funcionarios/${funcionarioId}/veiculos`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(values),
			});
			veiculoForm.resetFields();
			message.success("Veículo cadastrado com sucesso.");
			form.setFieldsValue({ veiculoId: response.veiculo.id });
			await loadFuncionario();
		} catch (error: unknown) {
			message.error(getErrorMessage(error));
		} finally {
			setSavingVeiculo(false);
		}
	};

	function handleEditLancamento(lancamento: FuncionarioLancamento) {
		setEditingLancamento(lancamento);
		setIsEditing(true);
		form.setFieldsValue({
			tipo: lancamento.tipo,
			categoria: lancamento.categoria,
			veiculoId: lancamento.veiculo?.id,
			valor: lancamento.valor,
			kmRodados: lancamento.kmRodados ?? undefined,
			bateriaConsumidaPercentual: lancamento.bateriaConsumidaPercentual ?? undefined,
			observacao: lancamento.observacao ?? undefined,
			dataReferencia: lancamento.dataReferencia.slice(0, 10),
		});
	}

	async function handleDeleteLancamento(lancamentoId: number) {
		if (!funcionarioId) {
			return;
		}

		try {
			await fetchJson(`/api/funcionarios/${funcionarioId}/lancamentos/${lancamentoId}`, {
				method: "DELETE",
			});
			message.success("Lançamento excluído com sucesso.");
			await loadFuncionario();
			if (editingLancamento?.id === lancamentoId) {
				resetLancamentoForm(data?.veiculos[0]?.id);
			}
		} catch (error: unknown) {
			message.error(getErrorMessage(error));
		}
	}

	function downloadReport(format: "xlsx" | "pdf") {
		if (!funcionarioId) {
			return;
		}
		window.location.assign(`/api/funcionarios/${funcionarioId}/relatorio?month=${reportMonth}&format=${format}`);
	}

	function handleChangePeriod(value: DashboardPeriodFilter) {
		setPeriod(value);
		setPage(1);
	}

	function handleChangeCustomPeriodStart(value: string) {
		setCustomPeriodStart(value);
		setPage(1);
	}

	function handleChangeCustomPeriodEnd(value: string) {
		setCustomPeriodEnd(value);
		setPage(1);
	}

	function handleChangeVeiculo(value: VeiculoFilterValue) {
		setSelectedVeiculoId(value === "all" ? null : value);
		setPage(1);
	}

	function handleChangeCategories(values: Categoria[]) {
		setSelectedCategories(values);
		setPage(1);
	}

	function handleChangeCategoria(value: Categoria) {
		const tipoEsperado = categoriaTipoMap[value];

		if (tipoEsperado !== tipoSelecionado) {
			form.setFieldValue("tipo", tipoEsperado);
		}

		if (value !== "RECARGA") {
			form.setFieldValue("bateriaConsumidaPercentual", undefined);
		}
	}

	return (
		<div className={styles.page}>
			<div className={styles.backgroundGlowA} />
			<div className={styles.backgroundGlowB} />
			<AuthenticatedHeader
				title={data?.funcionario.name ? `Painel de ${data.funcionario.name}` : "Funcionário"}
				subtitle="Ganhos, gastos, gráficos por carro, manutenção e fechamento mensal visual"
			/>
			<div className={styles.container}>
				{loading ? (
					<div className={styles.loadingState}><Spin size="large" /></div>
				) : !data ? (
					<Card className={styles.emptyCard}><Empty description="Não foi possível carregar este funcionário." /></Card>
				) : (
					<>
						<section className={styles.heroSection}>
							<div className={styles.heroPanel}>
								<div className={styles.heroBadge}>TEP Fleet</div>
								<div className={styles.heroHeader}>
									<div>
										<Typography.Title level={2} className={styles.heroTitle}>Operação financeira por veículo</Typography.Title>
										<Typography.Paragraph className={styles.heroDescription}>Visão consolidada de receita, custos, quilometragem e histórico operacional do funcionário.</Typography.Paragraph>
									</div>
									<div className={styles.heroMeta}>
										<span><FilterOutlined /> {activeFilterCount} filtros ativos</span>
										<span><CarOutlined /> {data.veiculos.length} carros cadastrados</span>
										<span><AuditOutlined /> {data.pagination.totalItems} lançamentos no recorte</span>
									</div>
								</div>
									<div className={styles.summaryStrip}>
										<div className={styles.summaryItem}><span>Período</span><strong>{formatPeriodLabel(period, data.filtros.periodStart, data.filtros.periodEnd)}</strong></div>
									<div className={styles.summaryItem}><span>Saldo líquido</span><strong>{formatCurrency(data.resumo.saldo)}</strong></div>
									<div className={styles.summaryItem}><span>Ganho por KM</span><strong>{formatCurrency(data.resumo.ganhoPorKm)}</strong></div>
								</div>
							</div>

							<Card className={styles.filterCard}>
								<div className={styles.sectionHeading}>
									<div>
										<Typography.Title level={4} className={styles.sectionTitle}>Filtro operacional</Typography.Title>
										<Typography.Text className={styles.sectionSubtitle}>Combine período, carro e categoria para alinhar gráfico, cards e histórico.</Typography.Text>
									</div>
									<div className={styles.exportGroup}>
										<Input className={styles.monthInput} type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} />
										<Button className={styles.excelButton} onClick={() => { setDownloadingExcel(true); downloadReport("xlsx"); setTimeout(() => setDownloadingExcel(false), 600); }} loading={downloadingExcel}><FileExcelOutlined /> Excel</Button>
										<Button className={styles.pdfButton} onClick={() => { setDownloadingPdf(true); downloadReport("pdf"); setTimeout(() => setDownloadingPdf(false), 600); }} loading={downloadingPdf}><FilePdfOutlined /> PDF visual</Button>
									</div>
								</div>
								<Row gutter={[16, 16]}>
											<Col xs={24} md={8}><div className={styles.filterField}><label className={styles.filterLabel}>Período analisado</label><Select<DashboardPeriodFilter> className={styles.selectField} value={period} onChange={handleChangePeriod} options={Object.entries(periodLabels).map(([value, label]) => ({ value: value as DashboardPeriodFilter, label }))} /></div></Col>
											<Col xs={24} md={8}><div className={styles.filterField}><label className={styles.filterLabel}>Início do intervalo</label><Input className={styles.monthInput} type="date" value={customPeriodStart} disabled={period !== "custom"} onChange={(event) => handleChangeCustomPeriodStart(event.target.value)} /></div></Col>
											<Col xs={24} md={8}><div className={styles.filterField}><label className={styles.filterLabel}>Fim do intervalo</label><Input className={styles.monthInput} type="date" value={customPeriodEnd} disabled={period !== "custom"} onChange={(event) => handleChangeCustomPeriodEnd(event.target.value)} /></div></Col>
											<Col xs={24} md={12}><div className={styles.filterField}><label className={styles.filterLabel}>Filtrar por carro</label><Select<VeiculoFilterValue> className={styles.selectField} value={selectedVeiculoId ?? "all"} onChange={handleChangeVeiculo} options={[{ value: "all", label: "Todos os carros" }, ...data.veiculos.map((veiculo) => ({ value: veiculo.id, label: veiculo.placa ? `${veiculo.nome} • ${veiculo.placa}` : veiculo.nome }))]} /></div></Col>
											<Col xs={24} md={12}><div className={styles.filterField}><label className={styles.filterLabel}>Categorias</label><Select<Categoria[]> mode="multiple" allowClear className={styles.selectField} value={selectedCategories} onChange={handleChangeCategories} placeholder="Todas as categorias" options={allCategoriaOptions} /></div></Col>
								</Row>
							</Card>
						</section>

						<section className={styles.statsGrid}>
							<Card className={styles.metricCard}><div className={styles.metricIcon}><DollarOutlined /></div><Typography.Text className={styles.metricLabel}>Ganhos totais</Typography.Text><Typography.Title level={3} className={styles.metricValue}>{formatCurrency(data.resumo.totalGanhos)}</Typography.Title></Card>
							<Card className={styles.metricCard}><div className={styles.metricIconDanger}><ToolOutlined /></div><Typography.Text className={styles.metricLabel}>Gastos totais</Typography.Text><Typography.Title level={3} className={styles.metricValueDanger}>{formatCurrency(data.resumo.totalGastos)}</Typography.Title></Card>
							<Card className={styles.metricCard}><div className={styles.metricIconPrimary}><AuditOutlined /></div><Typography.Text className={styles.metricLabel}>Saldo real</Typography.Text><Typography.Title level={3} className={data.resumo.saldo >= 0 ? styles.metricValuePrimary : styles.metricValueDanger}>{formatCurrency(data.resumo.saldo)}</Typography.Title></Card>
							<Card className={styles.metricCard}><div className={styles.metricIconAccent}><ThunderboltOutlined /></div><Typography.Text className={styles.metricLabel}>CPK operacional</Typography.Text><Typography.Title level={3} className={styles.metricValue}>{formatCurrency(data.resumo.custoPorKm)}</Typography.Title><Typography.Text className={styles.metricHint}>{data.resumo.totalKm.toFixed(2)} km registrados</Typography.Text></Card>
						</section>

						<Card className={styles.energyCard}>
							<div className={styles.sectionHeading}>
								<div>
									<Typography.Title level={4} className={styles.sectionTitle}>Eficiência energética</Typography.Title>
									<Typography.Text className={styles.sectionSubtitle}>Comparativo entre o custo real das recargas do EV e o cenário hipotético de um veículo a combustão no mesmo período.</Typography.Text>
								</div>
								<div className={styles.tagRow}>
									<Tag className={styles.softTag}>Base combustão: {data.eficienciaEnergetica.parametrosCombustao.kmPorLitro} km/L</Tag>
									<Tag className={styles.softTagAlt}>Combustível: {formatCurrency(data.eficienciaEnergetica.parametrosCombustao.precoLitro)}/L</Tag>
								</div>
							</div>
							<div className={styles.energyMetrics}>
								<div className={styles.energyMetric}><span>CPK real EV</span><strong>{formatCurrency(data.eficienciaEnergetica.resumo.cpkReal)}</strong><small>{formatCurrency(data.eficienciaEnergetica.resumo.custoRealRecargas)} em recargas</small></div>
								<div className={styles.energyMetric}><span>CPK combustão</span><strong>{formatCurrency(data.eficienciaEnergetica.resumo.cpkCombustao)}</strong><small>{formatCurrency(data.eficienciaEnergetica.resumo.custoCombustaoHipotetico)} no cenário teórico</small></div>
								<div className={styles.energyMetric}><span>Economia total</span><strong>{formatCurrency(data.eficienciaEnergetica.resumo.economiaTotal)}</strong><small>{data.eficienciaEnergetica.resumo.totalKm.toFixed(2)} km considerados</small></div>
								<div className={styles.energyMetric}><span>Recargas gratuitas</span><strong>{formatPercentage(data.eficienciaEnergetica.resumo.percentualRecargasGratuitas)}</strong><small>{data.eficienciaEnergetica.resumo.recargasGratuitas} de {data.eficienciaEnergetica.resumo.totalRecargas} recargas</small></div>
							</div>
							<div className={styles.energyVehicleGrid}>
								{data.eficienciaEnergetica.porVeiculo.map((item) => (
									<div key={item.veiculoId} className={styles.energyVehicleCard}>
										<div>
											<Typography.Title level={5} className={styles.vehicleTitle}>{item.nome}</Typography.Title>
											<Typography.Text className={styles.vehicleSubtitle}>{item.placa || "Sem placa informada"}</Typography.Text>
										</div>
										<div className={styles.energyVehicleStats}>
											<div><span>CPK EV</span><strong>{formatCurrency(item.cpkReal)}</strong></div>
											<div><span>Economia</span><strong>{formatCurrency(item.economiaTotal)}</strong></div>
											<div><span>Gratuitas</span><strong>{formatPercentage(item.percentualRecargasGratuitas)}</strong></div>
										</div>
									</div>
								))}
							</div>
						</Card>

						<Card className={styles.chartCard}>
							<div className={styles.sectionHeading}>
								<div>
									<Typography.Title level={4} className={styles.sectionTitle}>Gráfico por carro</Typography.Title>
									<Typography.Text className={styles.sectionSubtitle}>Lucro, gastos e km rodado comparados entre os veículos do funcionário.</Typography.Text>
								</div>
								<div className={styles.tagRow}>
									<Tag className={styles.softTag}>{periodLabels[period]}</Tag>
									{selectedCategories.map((category) => <Tag key={category} className={styles.softTagAlt}>{categoriaLabels[category]}</Tag>)}
								</div>
							</div>
							<div className={styles.chartWrap} ref={chartWrapRef}>
								{chartData.length === 0 ? (
									<Empty description="Cadastre veículos e lançamentos para visualizar o gráfico." />
								) : chartWidth === 0 ? (
									<div className={styles.chartLoadingState}><Spin size="large" /></div>
								) : (
									<BarChart width={chartWidth} height={340} data={chartData} barGap={8}>
											<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d8e0f0" />
											<XAxis dataKey="name" tick={{ fill: "#42526b", fontSize: 12 }} />
											<YAxis yAxisId="money" tick={{ fill: "#42526b", fontSize: 12 }} />
											<YAxis yAxisId="km" orientation="right" tick={{ fill: "#42526b", fontSize: 12 }} />
											<Tooltip formatter={(value, name) => {
												const numericValue = typeof value === "number" ? value : Number(value ?? 0);
												return name === "km" ? `${numericValue} km` : formatCurrency(numericValue);
											}} />
											<Legend />
											<Bar yAxisId="money" dataKey="lucro" fill="#1455c0" radius={[8, 8, 0, 0]} />
											<Bar yAxisId="money" dataKey="gastos" fill="#e3624b" radius={[8, 8, 0, 0]} />
											<Bar yAxisId="km" dataKey="km" fill="#0e8b72" radius={[8, 8, 0, 0]} />
									</BarChart>
								)}
							</div>
						</Card>

						<div className={styles.vehicleGrid}>
							{data.resumoPorVeiculo.map((item) => (
								<Card className={styles.vehicleCard} key={item.veiculoId}>
									<div className={styles.vehicleCardHeader}>
										<div>
											<Typography.Title level={5} className={styles.vehicleTitle}>{item.nome}</Typography.Title>
											<Typography.Text className={styles.vehicleSubtitle}>{item.placa || "Sem placa informada"}</Typography.Text>
										</div>
										<Tag className={styles.vehicleTag}>Operação ativa</Tag>
									</div>
									<div className={styles.vehicleStats}>
										<div><span>Saldo</span><strong>{formatCurrency(item.resumo.saldo)}</strong></div>
										<div><span>Gastos</span><strong>{formatCurrency(item.resumo.totalGastos)}</strong></div>
										<div><span>KM</span><strong>{item.resumo.totalKm.toFixed(2)}</strong></div>
									</div>
								</Card>
							))}
						</div>

						<Row gutter={[18, 18]} className={styles.contentGrid}>
							<Col xs={24} lg={9}>
								<Card className={styles.sideCard}>
									<Typography.Title level={4} className={styles.sectionTitle}>Frota elétrica</Typography.Title>
									<Typography.Paragraph className={styles.sectionSubtitleBlock}>Cadastre os carros usados por este funcionário para separar ganhos, recargas, pedágios, limpeza, revisão e manutenção por veículo.</Typography.Paragraph>
									{data.veiculos.length === 0 ? <Empty description="Nenhum carro cadastrado ainda." image={Empty.PRESENTED_IMAGE_SIMPLE} /> : <div className={styles.vehicleList}>{data.veiculos.map((veiculo) => <div key={veiculo.id} className={styles.vehicleListItem}><div><strong>{veiculo.nome}</strong><span>{veiculo.placa || "Sem placa"}</span></div><Tag className={styles.energyTag}>Elétrico</Tag></div>)}</div>}
									<Divider />
									<Form form={veiculoForm} layout="vertical" onFinish={onCreateVeiculo}>
										<Form.Item name="nome" label="Nome do carro" rules={[{ required: true, message: "Informe o nome do carro" }]}><Input placeholder="Ex.: BYD Dolphin Branco" /></Form.Item>
										<Form.Item name="placa" label="Placa"><Input placeholder="ABC1D23" maxLength={10} /></Form.Item>
										<Button className={styles.dashedAction} htmlType="submit" block loading={savingVeiculo}>Cadastrar carro</Button>
									</Form>
								</Card>

								<Card className={styles.sideCard}>
									<Typography.Title level={4} className={styles.sectionTitle}>{isEditing ? "Editar lançamento" : "Novo lançamento"}</Typography.Title>
									<Typography.Paragraph className={styles.sectionSubtitleBlock}>
										Cadastre ganhos por aplicativo e custos do carro por veículo. Para recarga, informe o valor pago para carregar,
										 os km percorridos com essa bateria e o percentual consumido. Para prestação e seguro,
										 lance o valor mensal para melhorar a análise do custo do mês.
									</Typography.Paragraph>
									<Form<LancamentoFormValues> form={form} layout="vertical" onFinish={onFinish} initialValues={{ tipo: "GANHO", dataReferencia: new Date().toISOString().slice(0, 10), veiculoId: data.veiculos[0]?.id }}>
										<Form.Item name="veiculoId" label="Carro" rules={[{ required: true, message: "Selecione o carro" }]}><Select disabled={data.veiculos.length === 0} placeholder={data.veiculos.length === 0 ? "Cadastre um carro antes" : "Selecione o carro"} options={data.veiculos.map((veiculo) => ({ value: veiculo.id, label: veiculo.placa ? `${veiculo.nome} • ${veiculo.placa}` : veiculo.nome }))} /></Form.Item>
										<Form.Item
											name="tipo"
											label="Tipo"
											extra="Ao selecionar Recarga, o tipo muda automaticamente para Gasto."
											rules={[{ required: true, message: "Selecione o tipo" }]}
										><Select options={[{ value: "GANHO", label: "Ganho" }, { value: "GASTO", label: "Gasto" }]} /></Form.Item>
										<Form.Item
											name="categoria"
											label="Categoria"
											extra={
												categoriaSelecionada === "RECARGA"
													? "Recarga selecionada: o campo abaixo mostra o valor gasto para carregar."
													: categoriaSelecionada === "PRESTACAO"
														? "Prestação selecionada: informe o valor mensal da parcela do carro."
														: categoriaSelecionada === "SEGURO"
															? "Seguro selecionado: informe o valor mensal do seguro do carro."
															: "Escolha Recarga, Prestação do carro ou Seguro do carro para detalhar custos mensais do veículo."
											}
											rules={[{ required: true, message: "Selecione a categoria" }]}
										><Select options={categoriaOptions} onChange={handleChangeCategoria} /></Form.Item>
										<Form.Item
											name="valor"
											label={
												recargaSelecionada
													? "Valor gasto para carregar (R$)"
													: prestacaoSelecionada
														? "Valor da prestação mensal (R$)"
														: seguroSelecionado
															? "Valor do seguro mensal (R$)"
															: "Valor (R$)"
											}
											extra={
												recargaSelecionada
													? "Informe quanto foi pago nesta recarga."
													: prestacaoSelecionada
														? "Use o valor mensal da prestação deste veículo."
														: seguroSelecionado
															? "Use o valor mensal do seguro deste veículo."
															: undefined
											}
											rules={[
												{ required: true, message: "Informe o valor" },
												({ getFieldValue }) => ({
													validator(_, value) {
														const numericValue = Number(value);
														const categoria = getFieldValue("categoria");

														if (value == null || Number.isNaN(numericValue)) {
															return Promise.reject(new Error("Informe o valor."));
														}

														if (numericValue < 0) {
															return Promise.reject(new Error("Valor não pode ser negativo."));
														}

														if (numericValue === 0 && categoria !== "RECARGA") {
															return Promise.reject(new Error("Apenas recarga pode ter valor zero."));
														}

														return Promise.resolve();
													},
												}),
											]}
										><InputNumber style={{ width: "100%" }} min={0} precision={2} step={10} placeholder={recargaSelecionada ? "Ex.: 45,00" : "0,00"} /></Form.Item>
										{!despesaMensalSelecionada ? (
											<Form.Item
												name="kmRodados"
												label={recargaSelecionada ? "KM percorridos com essa bateria" : "KM rodados no período"}
												extra={recargaSelecionada ? "Use a quilometragem que essa carga efetivamente entregou ao veículo." : undefined}
											><InputNumber style={{ width: "100%" }} min={0} precision={2} step={1} placeholder={recargaSelecionada ? "Ex.: 320" : "0,00"} /></Form.Item>
										) : null}
										{recargaSelecionada ? (
											<Form.Item
												name="bateriaConsumidaPercentual"
												label="Bateria consumida (%)"
												extra="Informe quanto da bateria foi usada para gerar essa quilometragem antes da recarga."
												rules={[
													{ required: true, message: "Informe o percentual de bateria consumida." },
													{
														validator(_, value) {
															const numericValue = Number(value);

															if (value == null || Number.isNaN(numericValue)) {
																return Promise.reject(new Error("Informe o percentual de bateria consumida."));
															}

															if (numericValue <= 0 || numericValue > 100) {
																return Promise.reject(new Error("Use um valor entre 0,01 e 100."));
															}

															return Promise.resolve();
														},
													},
												]}
											>
												<Space.Compact className={styles.percentInputCompact} block>
													<InputNumber style={{ width: "100%" }} min={0.01} max={100} precision={2} step={1} placeholder="Ex.: 72" />
													<span className={styles.percentSuffix}>%</span>
												</Space.Compact>
											</Form.Item>
										) : null}
										<Form.Item name="dataReferencia" label="Data de referência" rules={[{ required: true, message: "Informe a data" }]}><Input type="date" /></Form.Item>
										<Form.Item name="observacao" label="Observação"><Input.TextArea rows={3} placeholder="Ex.: corrida aeroporto, pedágio da rodovia, recarga rápida, revisão de freio regenerativo..." /></Form.Item>
										<div className={styles.formActions}>
											<Button type="primary" htmlType="submit" size="large" className={styles.primaryAction} loading={submitting} disabled={data.veiculos.length === 0}>{isEditing ? "Salvar edição" : "Salvar lançamento"}</Button>
											{isEditing ? <Button onClick={() => resetLancamentoForm(data.veiculos[0]?.id)}>Cancelar edição</Button> : null}
										</div>
									</Form>
								</Card>
							</Col>

							<Col xs={24} lg={15}>
								<Card className={styles.historyCard}>
									<div className={styles.sectionHeading}>
										<div>
											<Typography.Title level={4} className={styles.sectionTitle}>Histórico financeiro</Typography.Title>
											<Typography.Text className={styles.sectionSubtitle}>{formatPeriodLabel(period, data.filtros.periodStart, data.filtros.periodEnd)} • {selectedVeiculoId ? "Filtrado por carro" : "Todos os carros"}</Typography.Text>
										</div>
										<div className={styles.tagRow}>
											<Tag className={styles.softTag}>Ganho/KM: {formatCurrency(data.resumo.ganhoPorKm)}</Tag>
											{selectedCategories.map((category) => <Tag key={category} className={styles.softTagAlt}>{categoriaLabels[category]}</Tag>)}
										</div>
									</div>
									{data.lancamentos.length === 0 ? (
										<Empty description="Nenhum lançamento encontrado para os filtros selecionados." />
									) : (
										<>
											<div className={styles.historyList}>
												{data.lancamentos.map((lancamento) => {
													const comparativoCombustao = lancamento.kmRodados ? calcularCustoCombustao(lancamento.kmRodados) : 0;
													const economiaRecarga = comparativoCombustao - lancamento.valor;
													const recorrenteMensal = isCustoRecorrenteMensal(lancamento);

													return <div key={lancamento.id} className={lancamento.tipo === "GANHO" ? styles.historyItemGain : styles.historyItemExpense}>
														<div className={styles.historyItemMain}>
															<div className={styles.historyBadges}>
																	<Tag color={lancamento.tipo === "GANHO" ? "green" : "red"}>{lancamento.tipo === "GANHO" ? "Ganho" : "Gasto"}</Tag>
																	<Tag className={styles.categoryTag}>{categoriaLabels[lancamento.categoria]}</Tag>
																	{recorrenteMensal ? <Tag className={styles.recurringTag}>Recorrente mensal</Tag> : null}
																	{lancamento.veiculo ? <Tag className={styles.vehiclePill}>{lancamento.veiculo.placa ? `${lancamento.veiculo.nome} • ${lancamento.veiculo.placa}` : lancamento.veiculo.nome}</Tag> : null}
															</div>
															<Typography.Text className={styles.historyDate}>Referência: {new Date(lancamento.dataReferencia).toLocaleDateString("pt-BR")}</Typography.Text>
																	{isRecargaLancamento(lancamento) && lancamento.kmRodados ? (
																		<div className={styles.energyComparisonPanel}>
																			<div className={styles.energyComparisonItem}><span>Você pagou no elétrico</span><strong>{formatCurrency(lancamento.valor)}</strong></div>
																			<div className={styles.energyComparisonItem}><span>Gastaria na combustão</span><strong>{formatCurrency(comparativoCombustao)}</strong></div>
																			<div className={styles.energyComparisonItem}><span>Economia nesta recarga</span><strong>{formatCurrency(economiaRecarga)}</strong></div>
																			{lancamento.bateriaConsumidaPercentual ? <div className={styles.energyComparisonItem}><span>Bateria usada</span><strong>{formatPercentage(lancamento.bateriaConsumidaPercentual)}</strong></div> : null}
																		</div>
																	) : recorrenteMensal ? (
																		<div className={styles.recurringPanel}>
																			<div className={styles.energyComparisonItem}><span>Natureza</span><strong>Custo fixo mensal</strong></div>
																			<div className={styles.energyComparisonItem}><span>Competência</span><strong>{new Date(lancamento.dataReferencia).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}</strong></div>
																			<div className={styles.energyComparisonItem}><span>Categoria</span><strong>{categoriaLabels[lancamento.categoria]}</strong></div>
																		</div>
																	) : null}
															{lancamento.observacao ? <Typography.Paragraph className={styles.historyNote}>{lancamento.observacao}</Typography.Paragraph> : null}
															</div>
															<div className={styles.historyValueBlock}>
																<Typography.Title level={5} className={lancamento.tipo === "GANHO" ? styles.valueGain : styles.valueExpense}>{formatCurrency(lancamento.valor)}</Typography.Title>
																<Typography.Text className={styles.historyKm}>{recorrenteMensal ? "Custo fixo recorrente" : lancamento.kmRodados ? `${lancamento.kmRodados.toFixed(2)} km` : "Sem KM informado"}</Typography.Text>
																		{isRecargaLancamento(lancamento) && lancamento.bateriaConsumidaPercentual ? <Typography.Text className={styles.historyBattery}>{formatPercentage(lancamento.bateriaConsumidaPercentual)} da bateria</Typography.Text> : null}
																{recorrenteMensal ? <Typography.Text className={styles.historyRecurringLabel}>Entrará no consolidado mensal executivo.</Typography.Text> : null}
																<div className={styles.historyActions}>
																	<Button size="small" onClick={() => handleEditLancamento(lancamento)}>Editar</Button>
																	<Popconfirm title="Excluir lançamento" description="Essa ação não pode ser desfeita." onConfirm={() => handleDeleteLancamento(lancamento.id)} okText="Excluir" cancelText="Cancelar">
																		<Button danger size="small">Excluir</Button>
																	</Popconfirm>
																</div>
															</div>
													</div>;
												})}
											</div>
											<div className={styles.paginationWrap}>
												<Pagination
													current={data.pagination.page}
													pageSize={data.pagination.pageSize}
													total={data.pagination.totalItems}
													showSizeChanger
													pageSizeOptions={[8, 16, 24, 40]}
													onChange={(nextPage, nextPageSize) => {
														setPage(nextPage);
														setPageSize(nextPageSize);
													}}
												/>
											</div>
										</>
									)}
								</Card>
							</Col>
						</Row>
					</>
				)}
			</div>
		</div>
	);
}
