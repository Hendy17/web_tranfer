import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookies, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toNumber(value: { toString(): string } | null | undefined) {
	return value ? Number(value.toString()) : 0;
}

function formatMonthLabel(month: string) {
	const [year, monthNumber] = month.split("-").map(Number);
	return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
		new Date(year, monthNumber - 1, 1),
	);
}

function findCompanyLogoPath() {
	const candidates = ["company-logo.png", "company-logo.jpg", "company-logo.jpeg"];

	for (const fileName of candidates) {
		const logoPath = path.join(process.cwd(), "public", fileName);
		if (existsSync(logoPath)) {
			return logoPath;
		}
	}

	return null;
}

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { session, response } = await requireAuth(request);
	if (response || !session) {
		return response;
	}

	const { id } = await context.params;
	const funcionarioId = Number(id);
	const month = request.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
	const format = request.nextUrl.searchParams.get("format") ?? "xlsx";

	if (!Number.isInteger(funcionarioId) || funcionarioId <= 0) {
		return NextResponse.json({ error: "Funcionário inválido." }, { status: 400 });
	}

	if (!/^\d{4}-\d{2}$/.test(month)) {
		return NextResponse.json({ error: "Mês inválido para o relatório." }, { status: 400 });
	}

	if (!["xlsx", "pdf"].includes(format)) {
		return NextResponse.json({ error: "Formato inválido para o relatório." }, { status: 400 });
	}

	const [year, monthNumber] = month.split("-").map(Number);
	const start = new Date(year, monthNumber - 1, 1, 0, 0, 0, 0);
	const end = new Date(year, monthNumber, 0, 23, 59, 59, 999);

	const funcionario = await prisma.funcionario.findUnique({
		where: { id: funcionarioId },
		include: {
			lancamentos: {
				where: {
					dataReferencia: {
						gte: start,
						lte: end,
					},
				},
				include: {
					veiculo: true,
				},
				orderBy: [{ dataReferencia: "asc" }, { createdAt: "asc" }],
			},
		},
	});

	if (!funcionario) {
		return NextResponse.json({ error: "Funcionário não encontrado." }, { status: 404 });
	}

	const totalGanhos = funcionario.lancamentos
		.filter((item) => item.tipo === "GANHO")
		.reduce((sum, item) => sum + toNumber(item.valor), 0);
	const totalGastos = funcionario.lancamentos
		.filter((item) => item.tipo === "GASTO")
		.reduce((sum, item) => sum + toNumber(item.valor), 0);
	const totalKm = funcionario.lancamentos.reduce((sum, item) => sum + toNumber(item.kmRodados), 0);
	const saldo = totalGanhos - totalGastos;
	const custoPorKm = totalKm > 0 ? totalGastos / totalKm : 0;
	const ganhoPorKm = totalKm > 0 ? totalGanhos / totalKm : 0;

	if (format === "pdf") {
		const doc = new PDFDocument({ size: "A4", margin: 40 });
		const logoPath = findCompanyLogoPath();
		const chunks: Buffer[] = [];
		doc.on("data", (chunk: Buffer) => chunks.push(chunk));
		const pdfBufferPromise = new Promise<Buffer>((resolve) => {
			doc.on("end", () => resolve(Buffer.concat(chunks)));
		});

		doc.roundedRect(40, 32, 515, 90, 18).fill("#0f172a");
		if (logoPath) {
			doc.roundedRect(54, 51, 56, 52, 12).fill("#ffffff");
			doc.image(logoPath, 60, 57, { fit: [44, 40], align: "center", valign: "center" });
		} else {
			doc.circle(82, 77, 26).fill("#14b8a6");
			doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold").text("TEP", 67, 70, { width: 30, align: "center" });
		}
		doc.fillColor("#ffffff").fontSize(22).font("Helvetica-Bold").text("Transfer Executivo Premium", 126, 52);
		doc.fillColor("#cbd5e1").fontSize(11).font("Helvetica").text("Fechamento mensal visual do funcionário", 126, 82);

		doc.roundedRect(40, 136, 515, 58, 14).fill("#f8fafc");
		doc.fillColor("#0f172a").fontSize(12).font("Helvetica-Bold").text(`Funcionário: ${funcionario.name}`, 58, 154);
		doc.fillColor("#475569").font("Helvetica").text(`Período: ${formatMonthLabel(month)}`, 320, 154);

		const metrics = [
			["Ganhos", totalGanhos],
			["Gastos", totalGastos],
			["Saldo", saldo],
			["KM", totalKm],
			["Custo/KM", custoPorKm],
			["Ganho/KM", ganhoPorKm],
		] as const;

		metrics.forEach(([label, value], index) => {
			const x = 40 + (index % 2) * 260;
			const y = 216 + Math.floor(index / 2) * 76;
			doc.roundedRect(x, y, 230, 58, 12).fillAndStroke("#ffffff", "#dbe4f0");
			doc.fillColor("#64748b").fontSize(10).font("Helvetica").text(label, x + 14, y + 11);
			doc.fillColor("#0f172a").fontSize(17).font("Helvetica-Bold").text(label === "KM" ? value.toFixed(2) : `R$ ${value.toFixed(2)}`, x + 14, y + 28);
		});

		doc.fillColor("#0f172a").fontSize(14).font("Helvetica-Bold").text("Lançamentos do mês", 40, 458);
		doc.fillColor("#64748b").fontSize(10).font("Helvetica").text("Resumo operacional com foco em receitas, custos do carro elétrico e km rodado.", 40, 478);
		let currentY = 506;
		funcionario.lancamentos.slice(0, 18).forEach((item) => {
			doc.roundedRect(40, currentY, 515, 42, 10).fillAndStroke(item.tipo === "GANHO" ? "#f0fdf4" : "#fff1f2", item.tipo === "GANHO" ? "#86efac" : "#fda4af");
			doc.fillColor("#0f172a").fontSize(10).font("Helvetica-Bold").text(`${item.tipo} • ${item.categoria}`, 54, currentY + 9);
			doc.fillColor("#475569").font("Helvetica").text(`${item.veiculo?.nome ?? "Sem veículo"} • ${new Date(item.dataReferencia).toLocaleDateString("pt-BR")}`, 180, currentY + 9);
			doc.fillColor(item.tipo === "GANHO" ? "#15803d" : "#be123c").font("Helvetica-Bold").text(`R$ ${toNumber(item.valor).toFixed(2)}`, 446, currentY + 9);
			if (item.observacao) {
				doc.fillColor("#64748b").fontSize(9).font("Helvetica").text(item.observacao, 54, currentY + 24, { width: 330, ellipsis: true });
			}
			currentY += 50;
			if (currentY > 760) {
				doc.addPage();
				doc.roundedRect(40, 32, 515, 54, 14).fill("#0f172a");
				if (logoPath) {
					doc.roundedRect(50, 42, 38, 34, 10).fill("#ffffff");
					doc.image(logoPath, 54, 46, { fit: [30, 26], align: "center", valign: "center" });
				}
				doc.fillColor("#ffffff").fontSize(16).font("Helvetica-Bold").text("Transfer Executivo Premium", logoPath ? 100 : 58, 53);
				currentY = 110;
			}
		});

		doc.end();
		const pdfBuffer = await pdfBufferPromise;
		const fileName = `relatorio-${funcionario.name.toLowerCase().replace(/\s+/g, "-")}-${month}.pdf`;
		const fileResponse = new NextResponse(new Uint8Array(pdfBuffer), {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="${fileName}"`,
			},
		});

		return attachSessionCookies(fileResponse, {
			sessionId: session.session.id,
			user: session.session.user,
		});
	}

	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Transfer Web";
	workbook.created = new Date();

	const resumoSheet = workbook.addWorksheet("Resumo mensal");
	resumoSheet.columns = [
		{ header: "Indicador", key: "indicador", width: 28 },
		{ header: "Valor", key: "valor", width: 22 },
	];
	resumoSheet.addRow({ indicador: "Funcionário", valor: funcionario.name });
	resumoSheet.addRow({ indicador: "Período", valor: formatMonthLabel(month) });
	resumoSheet.addRow({ indicador: "Ganhos totais", valor: totalGanhos });
	resumoSheet.addRow({ indicador: "Gastos totais", valor: totalGastos });
	resumoSheet.addRow({ indicador: "Saldo real", valor: saldo });
	resumoSheet.addRow({ indicador: "KM rodados", valor: totalKm });
	resumoSheet.addRow({ indicador: "Custo por KM", valor: custoPorKm });
	resumoSheet.addRow({ indicador: "Ganho por KM", valor: ganhoPorKm });
	resumoSheet.getColumn("valor").numFmt = 'R$ #,##0.00';
	resumoSheet.getCell("B6").numFmt = '0.00';

	const detalhesSheet = workbook.addWorksheet("Lancamentos");
	detalhesSheet.columns = [
		{ header: "Data", key: "data", width: 14 },
		{ header: "Tipo", key: "tipo", width: 12 },
		{ header: "Categoria", key: "categoria", width: 18 },
		{ header: "Veículo", key: "veiculo", width: 24 },
		{ header: "Placa", key: "placa", width: 16 },
		{ header: "Valor", key: "valor", width: 16 },
		{ header: "KM rodados", key: "km", width: 16 },
		{ header: "Observação", key: "observacao", width: 40 },
	];

	funcionario.lancamentos.forEach((item) => {
		detalhesSheet.addRow({
			data: item.dataReferencia,
			tipo: item.tipo,
			categoria: item.categoria,
			veiculo: item.veiculo?.nome ?? "Sem veículo",
			placa: item.veiculo?.placa ?? "-",
			valor: toNumber(item.valor),
			km: toNumber(item.kmRodados),
			observacao: item.observacao ?? "",
		});
	});

	detalhesSheet.getColumn("data").numFmt = 'dd/mm/yyyy';
	detalhesSheet.getColumn("valor").numFmt = 'R$ #,##0.00';
	detalhesSheet.getColumn("km").numFmt = '0.00';

	const buffer = await workbook.xlsx.writeBuffer();
	const fileName = `relatorio-${funcionario.name.toLowerCase().replace(/\s+/g, "-")}-${month}.xlsx`;
	const fileResponse = new NextResponse(buffer, {
		status: 200,
		headers: {
			"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"Content-Disposition": `attachment; filename="${fileName}"`,
		},
	});

	return attachSessionCookies(fileResponse, {
		sessionId: session.session.id,
		user: session.session.user,
	});
}
