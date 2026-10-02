import { getCategory, GROUP_LABELS } from './categories';
import { Category, Currency, Group, Mode, Transaction } from './types';
import { convert, formatMoney, formatPct } from './utils/money';
import { daysInMonth, monthLabel, todayISO, currentMonth } from './utils/dates';

export function txAmountIn(tx: Transaction, currency: Currency): number {
  return convert(tx.amount, tx.currency, currency, tx.rate);
}

function groupOf(tx: Transaction): Group {
  const cat = getCategory(tx.categoryId);
  if (cat) return cat.group;
  return tx.type === 'ingreso' ? 'otros_ingresos' : tx.mode === 'personal' ? 'deseos' : 'gastos_operativos';
}

export interface CategoryTotal {
  category: Category | undefined;
  categoryId: string;
  total: number;
  count: number;
  share: number;
}

export interface Statement {
  currency: Currency;
  count: number;
  groups: Record<Group, number>;
  ingresos: number;
  gastos: number;
  // Estado de resultados (negocio)
  ventas: number;
  costoVentas: number;
  utilidadBruta: number;
  gastosOperativos: number;
  utilidadOperativa: number;
  otrosIngresos: number;
  gastosFinancieros: number;
  utilidadAntesImpuestos: number;
  impuestos: number;
  utilidadNeta: number;
  margenBruto: number | null;
  margenOperativo: number | null;
  margenNeto: number | null;
  /** Ventas mínimas para no perder: gastos fijos / margen de contribución. */
  puntoEquilibrio: number | null;
  // Personal
  tasaAhorro: number | null;
  expensesByCategory: CategoryTotal[];
  incomesByCategory: CategoryTotal[];
}

const EMPTY_GROUPS = (): Record<Group, number> => ({
  ventas: 0, otros_ingresos: 0, costo_ventas: 0, gastos_operativos: 0,
  gastos_financieros: 0, impuestos: 0, necesidades: 0, deseos: 0, ahorro: 0,
});

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

export function computeStatement(txs: Transaction[], currency: Currency): Statement {
  const groups = EMPTY_GROUPS();
  const byCat = new Map<string, { total: number; count: number; type: string }>();
  let ingresos = 0;
  let gastos = 0;

  for (const tx of txs) {
    const value = txAmountIn(tx, currency);
    groups[groupOf(tx)] += value;
    if (tx.type === 'ingreso') ingresos += value;
    else gastos += value;
    const entry = byCat.get(tx.categoryId) ?? { total: 0, count: 0, type: tx.type };
    entry.total += value;
    entry.count += 1;
    byCat.set(tx.categoryId, entry);
  }

  const ventas = groups.ventas;
  const costoVentas = groups.costo_ventas;
  const utilidadBruta = ventas - costoVentas;
  const gastosOperativos = groups.gastos_operativos;
  const utilidadOperativa = utilidadBruta - gastosOperativos;
  const otrosIngresos = groups.otros_ingresos;
  const gastosFinancieros = groups.gastos_financieros;
  const utilidadAntesImpuestos = utilidadOperativa + otrosIngresos - gastosFinancieros;
  const impuestos = groups.impuestos;
  // Para modo personal equivale a ingresos - gastos (saldo disponible).
  const utilidadNeta = ingresos - gastos;

  const margenContribucion = ratio(ventas - costoVentas, ventas);
  const puntoEquilibrio =
    margenContribucion !== null && margenContribucion > 0 && gastosOperativos > 0
      ? gastosOperativos / margenContribucion
      : null;

  const toList = (type: string, base: number): CategoryTotal[] =>
    [...byCat.entries()]
      .filter(([, v]) => v.type === type)
      .map(([categoryId, v]) => ({
        categoryId,
        category: getCategory(categoryId),
        total: v.total,
        count: v.count,
        share: base > 0 ? v.total / base : 0,
      }))
      .sort((a, b) => b.total - a.total);

  const ahorroReal = groups.ahorro + Math.max(utilidadNeta, 0);

  return {
    currency,
    count: txs.length,
    groups,
    ingresos,
    gastos,
    ventas,
    costoVentas,
    utilidadBruta,
    gastosOperativos,
    utilidadOperativa,
    otrosIngresos,
    gastosFinancieros,
    utilidadAntesImpuestos,
    impuestos,
    utilidadNeta,
    margenBruto: ratio(utilidadBruta, ventas),
    margenOperativo: ratio(utilidadOperativa, ventas),
    margenNeto: ratio(utilidadNeta, ventas + otrosIngresos),
    puntoEquilibrio,
    tasaAhorro: ratio(ahorroReal, ingresos),
    expensesByCategory: toList('gasto', gastos),
    incomesByCategory: toList('ingreso', ingresos),
  };
}

export function variation(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

/**
 * Proyección lineal del mes en curso a partir del ritmo diario.
 * Antes del día 7 no es confiable: pagos únicos (alquiler, planilla) distorsionan el promedio.
 */
export function projection(month: string, value: number): { elapsed: number; total: number; projected: number } | null {
  if (month !== currentMonth()) return null;
  const elapsed = Number(todayISO().slice(8, 10));
  if (elapsed < 7) return null;
  const total = daysInMonth(month);
  return { elapsed, total, projected: (value / elapsed) * total };
}

export type InsightTone = 'good' | 'warn' | 'bad' | 'info';
export interface Insight {
  tone: InsightTone;
  title: string;
  text: string;
}

export function buildInsights(s: Statement, prev: Statement | null, mode: Mode): Insight[] {
  const out: Insight[] = [];
  const fmt = (v: number) => formatMoney(v, s.currency);

  if (s.count === 0) {
    return [{ tone: 'info', title: 'Sin movimientos', text: 'Registre ingresos y gastos para generar el análisis del mes.' }];
  }

  if (mode === 'negocio') {
    if (s.utilidadNeta < 0) {
      out.push({ tone: 'bad', title: 'El mes cerró con pérdida', text: `Los gastos superaron los ingresos por ${fmt(-s.utilidadNeta)}. Revise los gastos operativos y su estructura de precios.` });
    } else if (s.margenNeto !== null && s.margenNeto >= 0.15) {
      out.push({ tone: 'good', title: 'Rentabilidad saludable', text: `Margen neto de ${formatPct(s.margenNeto)}. Considere reservar parte de la utilidad como fondo de operación.` });
    }
    if (s.ventas > 0 && s.margenBruto !== null && s.margenBruto < 0.3) {
      out.push({ tone: 'warn', title: 'Margen bruto bajo', text: `Solo ${formatPct(s.margenBruto)} de cada venta queda tras el costo de ventas. Negocie con proveedores o revise precios.` });
    }
    if (s.ventas > 0 && s.gastosOperativos / s.ventas > 0.4) {
      out.push({ tone: 'warn', title: 'Gastos operativos altos', text: `Los gastos fijos consumen ${formatPct(s.gastosOperativos / s.ventas)} de las ventas. Una referencia sana es menos de 35%.` });
    }
    if (s.puntoEquilibrio !== null) {
      const ok = s.ventas >= s.puntoEquilibrio;
      out.push({
        tone: ok ? 'good' : 'warn',
        title: 'Punto de equilibrio',
        text: ok
          ? `Necesita vender ${fmt(s.puntoEquilibrio)} al mes para cubrir costos; este mes lo superó por ${fmt(s.ventas - s.puntoEquilibrio)}.`
          : `Necesita vender ${fmt(s.puntoEquilibrio)} al mes para no perder; le faltaron ${fmt(s.puntoEquilibrio - s.ventas)}.`,
      });
    }
    if (s.ventas === 0 && s.otrosIngresos === 0) {
      out.push({ tone: 'warn', title: 'Sin ventas registradas', text: 'No hay ingresos por ventas este mes. Verifique que todo esté registrado antes de cerrar.' });
    }
  } else {
    const inc = s.ingresos;
    if (s.utilidadNeta < 0) {
      out.push({ tone: 'bad', title: 'Gastó más de lo que ganó', text: `Le faltaron ${fmt(-s.utilidadNeta)} este mes. Identifique gastos de "Deseos" que pueda recortar.` });
    }
    if (inc > 0) {
      const nec = s.groups.necesidades / inc;
      const des = s.groups.deseos / inc;
      if (nec > 0.5) out.push({ tone: 'warn', title: 'Necesidades por encima del 50%', text: `Sus gastos básicos representan ${formatPct(nec)} del ingreso. La regla 50/30/20 sugiere un máximo de 50%.` });
      if (des > 0.3) out.push({ tone: 'warn', title: 'Deseos por encima del 30%', text: `Gastos no esenciales: ${formatPct(des)} del ingreso. Reducirlos al 30% liberaría ${fmt(s.groups.deseos - inc * 0.3)}.` });
      if (s.tasaAhorro !== null) {
        out.push(
          s.tasaAhorro >= 0.2
            ? { tone: 'good', title: 'Excelente capacidad de ahorro', text: `Su tasa de ahorro es ${formatPct(s.tasaAhorro)}. Mantenga un fondo de emergencia de 3 a 6 meses de gastos.` }
            : { tone: 'warn', title: 'Ahorro por debajo del 20%', text: `Su tasa de ahorro es ${formatPct(s.tasaAhorro)}. Intente apartar el ahorro al recibir el salario, no al final del mes.` },
        );
      }
    }
  }

  const top = s.expensesByCategory[0];
  if (top && s.gastos > 0 && top.share > 0.35 && s.expensesByCategory.length > 1) {
    out.push({ tone: 'info', title: 'Concentración de gasto', text: `"${top.category?.name ?? 'Otro'}" representa ${formatPct(top.share)} de todo el gasto del mes.` });
  }

  if (prev && prev.count > 0) {
    const vi = variation(s.ingresos, prev.ingresos);
    const vg = variation(s.gastos, prev.gastos);
    if (vi !== null && vg !== null && vg > vi + 0.05 && vg > 0) {
      out.push({ tone: 'warn', title: 'Los gastos crecen más rápido', text: `Gastos ${formatPct(vg)} vs. ingresos ${formatPct(vi)} respecto al mes anterior.` });
    } else if (vi !== null && vi > 0.05) {
      out.push({ tone: 'good', title: 'Ingresos en crecimiento', text: `Sus ingresos subieron ${formatPct(vi)} respecto al mes anterior.` });
    }
  }

  return out;
}

/** Reporte de cierre en texto plano para compartir por WhatsApp/correo. */
export function buildReportText(
  s: Statement,
  prev: Statement | null,
  mode: Mode,
  month: string,
  name: string,
  closedAt?: string,
): string {
  const f = (v: number) => formatMoney(v, s.currency);
  const line = (label: string, v: number) => `${label}: ${f(v)}`;
  const L = GROUP_LABELS[mode];
  const rows: string[] = [];
  rows.push(`CIERRE DE MES — ${monthLabel(month).toUpperCase()}`);
  rows.push(`${name} (${mode === 'negocio' ? 'Negocio' : 'Personal'})`);
  if (closedAt) rows.push(`Cerrado: ${closedAt}`);
  rows.push('');

  if (mode === 'negocio') {
    rows.push('ESTADO DE RESULTADOS');
    rows.push(line(L.ventas!, s.ventas));
    rows.push(line(`(-) ${L.costo_ventas}`, s.costoVentas));
    rows.push(line('= Utilidad bruta', s.utilidadBruta));
    rows.push(line(`(-) ${L.gastos_operativos}`, s.gastosOperativos));
    rows.push(line('= Utilidad operativa', s.utilidadOperativa));
    rows.push(line(`(+) ${L.otros_ingresos}`, s.otrosIngresos));
    rows.push(line(`(-) ${L.gastos_financieros}`, s.gastosFinancieros));
    rows.push(line(`(-) ${L.impuestos}`, s.impuestos));
    rows.push(line('= UTILIDAD NETA', s.utilidadNeta));
    rows.push('');
    rows.push(`Margen bruto: ${formatPct(s.margenBruto)}`);
    rows.push(`Margen neto: ${formatPct(s.margenNeto)}`);
    if (s.puntoEquilibrio !== null) rows.push(line('Punto de equilibrio', s.puntoEquilibrio));
  } else {
    rows.push('RESUMEN');
    rows.push(line('Ingresos', s.ingresos));
    rows.push(line(`(-) ${L.necesidades}`, s.groups.necesidades));
    rows.push(line(`(-) ${L.deseos}`, s.groups.deseos));
    rows.push(line(`(-) ${L.ahorro}`, s.groups.ahorro));
    rows.push(line('= Saldo disponible', s.utilidadNeta));
    rows.push(`Tasa de ahorro: ${formatPct(s.tasaAhorro)}`);
  }

  if (s.expensesByCategory.length) {
    rows.push('');
    rows.push('GASTOS POR CATEGORÍA');
    for (const c of s.expensesByCategory) {
      rows.push(`• ${c.category?.name ?? 'Otro'}: ${f(c.total)} (${formatPct(c.share)})`);
    }
  }

  if (prev && prev.count > 0) {
    rows.push('');
    rows.push('VS. MES ANTERIOR');
    rows.push(`Ingresos: ${formatPct(variation(s.ingresos, prev.ingresos))}`);
    rows.push(`Gastos: ${formatPct(variation(s.gastos, prev.gastos))}`);
    rows.push(`Resultado: ${formatPct(variation(s.utilidadNeta, prev.utilidadNeta))}`);
  }

  const insights = buildInsights(s, prev, mode);
  if (insights.length) {
    rows.push('');
    rows.push('RECOMENDACIONES');
    for (const i of insights) rows.push(`• ${i.title}: ${i.text}`);
  }

  rows.push('');
  rows.push(`${s.count} movimientos · Generado con AppContador`);
  return rows.join('\n');
}
