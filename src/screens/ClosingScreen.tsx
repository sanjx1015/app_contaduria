import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { GROUP_LABELS } from '../categories';
import { Badge, Bar, Button, Card, confirm, Money, MonthPicker, SectionTitle } from '../components/ui';
import { buildInsights, buildReportText, computeStatement, Insight, Statement, variation } from '../finance';
import { closeKey, useStore } from '../store';
import { colors, font, radius, space } from '../theme';
import { Currency, MonthClose } from '../types';
import { formatMoney, formatPct } from '../utils/money';
import { addMonths, currentMonth, formatTimestamp, monthLabel } from '../utils/dates';
import { shareText } from '../utils/share';

const TONE: Record<Insight['tone'], { bg: string; fg: string; icon: string }> = {
  good: { bg: colors.incomeSoft, fg: colors.income, icon: '✅' },
  warn: { bg: colors.warnSoft, fg: colors.warn, icon: '⚠️' },
  bad: { bg: colors.expenseSoft, fg: colors.expense, icon: '⛔' },
  info: { bg: colors.infoSoft, fg: colors.info, icon: 'ℹ️' },
};

function Line({
  label,
  value,
  cur,
  base,
  strong,
  sign,
}: {
  label: string;
  value: number;
  cur: Currency;
  base?: number;
  strong?: boolean;
  sign?: '+' | '-';
}) {
  const pct = base && base > 0 ? value / base : null;
  return (
    <View style={[styles.line, strong && styles.lineStrong]}>
      <Text style={[styles.lineLabel, strong && { fontWeight: '800', color: colors.text }]}>
        {sign ? <Text style={{ color: colors.faint }}>{sign === '-' ? '(−) ' : '(+) '}</Text> : null}
        {label}
      </Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Money
          value={value}
          currency={cur}
          colored={strong}
          style={[styles.lineValue, strong && { fontWeight: '800', fontSize: 16 }]}
        />
        {pct !== null ? <Text style={styles.linePct}>{formatPct(pct)}</Text> : null}
      </View>
    </View>
  );
}

function Delta({ label, now, before, cur, inverse }: { label: string; now: number; before: number; cur: Currency; inverse?: boolean }) {
  const v = variation(now, before);
  const good = v === null ? null : inverse ? v <= 0 : v >= 0;
  return (
    <View style={styles.deltaBox}>
      <Text style={styles.deltaLabel}>{label}</Text>
      <Text style={[styles.deltaValue, { color: good === null ? colors.muted : good ? colors.income : colors.expense }]}>
        {v === null ? '—' : `${v >= 0 ? '▲' : '▼'} ${formatPct(Math.abs(v), 0)}`}
      </Text>
      <Text style={styles.deltaPrev}>antes {formatMoney(before, cur)}</Text>
    </View>
  );
}

export function ClosingScreen({ month, setMonth }: { month: string; setMonth: (m: string) => void }) {
  const { state, dispatch, monthTxs, closeMonth } = useStore();
  const { settings } = state;
  const cur = settings.displayCurrency;
  const mode = settings.mode;
  const isBiz = mode === 'negocio';
  const L = GROUP_LABELS[mode];

  const txs = monthTxs(month);
  const prevTxs = monthTxs(addMonths(month, -1));
  const s: Statement = useMemo(() => computeStatement(txs, cur), [txs, cur]);
  const prev: Statement = useMemo(() => computeStatement(prevTxs, cur), [prevTxs, cur]);
  const insights = buildInsights(s, prev, mode);
  const close = state.closes[closeKey(mode, month)];
  const history: MonthClose[] = Object.values(state.closes)
    .filter((c) => c.mode === mode)
    .sort((a, b) => b.month.localeCompare(a.month));

  const doClose = () => {
    const early = month >= currentMonth();
    const msg = [
      `Se cerrará ${monthLabel(month)} con ${s.count} movimientos y un resultado de ${formatMoney(s.utilidadNeta, cur)}.`,
      'Los movimientos quedarán bloqueados para garantizar que el reporte no cambie.',
      early ? '\nAtención: el mes todavía no ha terminado.' : '',
    ].join(' ');
    confirm('Cerrar mes', msg, 'Cerrar mes', () => closeMonth(month));
  };

  const doReopen = () =>
    confirm('Reabrir mes', 'El mes volverá a permitir cambios. Recuerde cerrarlo de nuevo al terminar.', 'Reabrir', () =>
      dispatch({ type: 'reopenMonth', key: closeKey(mode, month) }),
    );

  const doShare = () =>
    shareText(
      `Cierre ${monthLabel(month)}`,
      buildReportText(s, prev, mode, month, settings.businessName, close ? formatTimestamp(close.closedAt) : undefined),
    );

  const base = isBiz ? s.ventas : s.ingresos;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[font.h1, { marginBottom: space.md }]}>Cierre de mes</Text>
      <MonthPicker month={month} onChange={setMonth} />

      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Badge text={close ? '🔒 Cerrado' : '🟢 Abierto'} tone={close ? 'good' : 'info'} />
          <Text style={[font.small, { color: colors.muted, marginTop: 6 }]}>
            {close ? `Cerrado el ${formatTimestamp(close.closedAt)}` : `${s.count} movimientos registrados`}
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: colors.muted }}>{cur === 'CRC' ? 'Colones ₡' : 'Dólares $'}</Text>
      </Card>

      <SectionTitle>{isBiz ? 'Estado de resultados' : 'Resumen del mes'}</SectionTitle>
      <Card>
        {isBiz ? (
          <>
            <Line label={L.ventas!} value={s.ventas} cur={cur} base={base} />
            <Line label={L.costo_ventas!} value={s.costoVentas} cur={cur} base={base} sign="-" />
            <Line label="Utilidad bruta" value={s.utilidadBruta} cur={cur} base={base} strong />
            <Line label={L.gastos_operativos!} value={s.gastosOperativos} cur={cur} base={base} sign="-" />
            <Line label="Utilidad operativa" value={s.utilidadOperativa} cur={cur} base={base} strong />
            <Line label={L.otros_ingresos!} value={s.otrosIngresos} cur={cur} sign="+" />
            <Line label={L.gastos_financieros!} value={s.gastosFinancieros} cur={cur} sign="-" />
            <Line label="Utilidad antes de impuestos" value={s.utilidadAntesImpuestos} cur={cur} base={base} strong />
            <Line label={L.impuestos!} value={s.impuestos} cur={cur} sign="-" />
          </>
        ) : (
          <>
            <Line label="Ingresos" value={s.ingresos} cur={cur} />
            <Line label={L.necesidades!} value={s.groups.necesidades} cur={cur} base={base} sign="-" />
            <Line label={L.deseos!} value={s.groups.deseos} cur={cur} base={base} sign="-" />
            <Line label={L.ahorro!} value={s.groups.ahorro} cur={cur} base={base} sign="-" />
          </>
        )}
        <View style={[styles.netBox, { backgroundColor: s.utilidadNeta < 0 ? colors.expenseSoft : colors.incomeSoft }]}>
          <Text style={[font.h3, { color: s.utilidadNeta < 0 ? colors.expense : colors.income }]}>
            {isBiz ? (s.utilidadNeta < 0 ? 'PÉRDIDA NETA' : 'UTILIDAD NETA') : 'SALDO DISPONIBLE'}
          </Text>
          <Money value={s.utilidadNeta} currency={cur} colored style={{ fontSize: 22, fontWeight: '800' }} />
        </View>
      </Card>

      <SectionTitle>Indicadores clave</SectionTitle>
      <View style={styles.kpis}>
        {isBiz ? (
          <>
            <Kpi label="Margen bruto" value={formatPct(s.margenBruto)} hint="Meta > 30%" />
            <Kpi label="Margen operativo" value={formatPct(s.margenOperativo)} hint="Antes de financieros" />
            <Kpi label="Margen neto" value={formatPct(s.margenNeto)} hint="Lo que queda de cada venta" />
            <Kpi
              label="Punto de equilibrio"
              value={s.puntoEquilibrio !== null ? formatMoney(s.puntoEquilibrio, cur) : '—'}
              hint="Ventas mínimas al mes"
            />
          </>
        ) : (
          <>
            <Kpi label="Tasa de ahorro" value={formatPct(s.tasaAhorro)} hint="Meta ≥ 20%" />
            <Kpi label="Necesidades" value={formatPct(s.ingresos ? s.groups.necesidades / s.ingresos : null)} hint="Meta ≤ 50%" />
            <Kpi label="Deseos" value={formatPct(s.ingresos ? s.groups.deseos / s.ingresos : null)} hint="Meta ≤ 30%" />
            <Kpi label="Gasto diario prom." value={formatMoney(s.gastos / 30, cur)} hint="Sobre 30 días" />
          </>
        )}
      </View>

      <SectionTitle>Comparado con {monthLabel(addMonths(month, -1))}</SectionTitle>
      <Card style={{ flexDirection: 'row', paddingHorizontal: space.sm }}>
        <Delta label="Ingresos" now={s.ingresos} before={prev.ingresos} cur={cur} />
        <Delta label="Gastos" now={s.gastos} before={prev.gastos} cur={cur} inverse />
        <Delta label="Resultado" now={s.utilidadNeta} before={prev.utilidadNeta} cur={cur} />
      </Card>

      {s.expensesByCategory.length ? (
        <>
          <SectionTitle>Gastos por categoría</SectionTitle>
          <Card>
            {s.expensesByCategory.map((c, i) => (
              <View key={c.categoryId} style={{ marginBottom: i === s.expensesByCategory.length - 1 ? 0 : space.md }}>
                <View style={styles.catRow}>
                  <Text style={styles.catName} numberOfLines={1}>
                    {c.category?.icon} {c.category?.name ?? 'Otro'}
                  </Text>
                  <Text style={styles.catValue}>
                    {formatMoney(c.total, cur)} <Text style={{ color: colors.muted, fontWeight: '500' }}>{formatPct(c.share, 0)}</Text>
                  </Text>
                </View>
                <Bar ratio={c.share} color={i === 0 ? colors.expense : '#D9822B'} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionTitle>Análisis y recomendaciones</SectionTitle>
      {insights.map((ins, i) => (
        <View key={i} style={[styles.insight, { backgroundColor: TONE[ins.tone].bg }]}>
          <Text style={[styles.insightTitle, { color: TONE[ins.tone].fg }]}>
            {TONE[ins.tone].icon} {ins.title}
          </Text>
          <Text style={styles.insightText}>{ins.text}</Text>
        </View>
      ))}

      <View style={{ marginTop: space.lg, gap: space.sm }}>
        {close ? (
          <Button title="Reabrir mes" variant="secondary" onPress={doReopen} />
        ) : (
          <Button title="🔒 Cerrar mes" onPress={doClose} disabled={s.count === 0} />
        )}
        <Button title="Compartir reporte" variant="secondary" onPress={doShare} disabled={s.count === 0} />
      </View>

      {history.length ? (
        <>
          <SectionTitle>Historial de cierres</SectionTitle>
          <Card style={{ paddingVertical: space.sm }}>
            {history.map((h) => (
              <View key={h.key} style={styles.histRow}>
                <View>
                  <Text style={[font.body, { fontWeight: '700', color: colors.text }]} onPress={() => setMonth(h.month)}>
                    {monthLabel(h.month)}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    Ingresos {formatMoney(h.totals[cur].ingresos, cur)} · Gastos {formatMoney(h.totals[cur].gastos, cur)}
                  </Text>
                </View>
                <Money value={h.totals[cur].utilidad} currency={cur} colored style={{ fontWeight: '800' }} />
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.kpiHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: 60 },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lineStrong: { backgroundColor: '#F7FAF8', marginHorizontal: -space.lg, paddingHorizontal: space.lg },
  lineLabel: { ...font.body, color: colors.muted, flex: 1, marginRight: space.sm },
  lineValue: { ...font.body, color: colors.text, fontWeight: '600' },
  linePct: { fontSize: 11, color: colors.faint },
  netBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.md,
  },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginBottom: space.sm },
  kpi: { width: '47.5%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md },
  kpiLabel: { ...font.small, color: colors.muted, fontWeight: '600' },
  kpiValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4 },
  kpiHint: { fontSize: 11, color: colors.faint, marginTop: 2 },
  deltaBox: { flex: 1, alignItems: 'center' },
  deltaLabel: { ...font.small, color: colors.muted },
  deltaValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  deltaPrev: { fontSize: 10, color: colors.faint, marginTop: 2 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catName: { ...font.small, color: colors.text, fontWeight: '600', flex: 1, marginRight: space.sm },
  catValue: { ...font.small, color: colors.text, fontWeight: '700' },
  insight: { borderRadius: radius.md, padding: space.md, marginBottom: space.sm },
  insightTitle: { fontWeight: '800', fontSize: 14 },
  insightText: { ...font.small, color: colors.text, marginTop: 4, lineHeight: 19 },
  histRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
