import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { GROUP_LABELS } from '../categories';
import { Badge, Bar, Card, Empty, Fab, Money, MonthPicker, SectionTitle, Segmented } from '../components/ui';
import { TxRow } from '../components/TxRow';
import { FormRequest } from '../components/TransactionForm';
import { computeStatement, projection } from '../finance';
import { useStore } from '../store';
import { colors, font, space } from '../theme';
import { Currency, Group } from '../types';
import { formatMoney, formatPct } from '../utils/money';
import { defaultDateFor } from '../utils/dates';

interface Props {
  month: string;
  setMonth: (m: string) => void;
  openForm: (r: FormRequest) => void;
  goTo: (tab: 'movimientos' | 'cierre') => void;
}

export function DashboardScreen({ month, setMonth, openForm, goTo }: Props) {
  const { state, dispatch, monthTxs, isClosed } = useStore();
  const { settings } = state;
  const cur = settings.displayCurrency;
  const txs = monthTxs(month);
  const s = useMemo(() => computeStatement(txs, cur), [txs, cur]);
  const closed = isClosed(month);
  const proj = projection(month, s.gastos);
  const isBiz = settings.mode === 'negocio';

  const expenseGroups: Group[] = isBiz
    ? ['costo_ventas', 'gastos_operativos', 'gastos_financieros', 'impuestos']
    : ['necesidades', 'deseos', 'ahorro'];
  const targets: Partial<Record<Group, number>> = { necesidades: 0.5, deseos: 0.3, ahorro: 0.2 };
  const groupColors: Partial<Record<Group, string>> = {
    costo_ventas: '#C2412D', gastos_operativos: '#D9822B', gastos_financieros: '#7A5AA6', impuestos: '#2F5D8A',
    necesidades: '#2F5D8A', deseos: '#D9822B', ahorro: '#178A57',
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>{isBiz ? 'Negocio' : 'Finanzas personales'}</Text>
            <Text style={font.h2} numberOfLines={1}>{settings.businessName}</Text>
          </View>
          <Segmented<Currency>
            style={{ width: 110 }}
            options={[{ value: 'CRC', label: '₡' }, { value: 'USD', label: '$' }]}
            value={cur}
            onChange={(v) => dispatch({ type: 'settings', patch: { displayCurrency: v } })}
          />
        </View>

        <MonthPicker month={month} onChange={setMonth} />

        <View style={[styles.hero, { backgroundColor: s.utilidadNeta < 0 ? '#7A2A1E' : colors.primary }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.heroLabel}>{isBiz ? 'Utilidad neta del mes' : 'Saldo disponible del mes'}</Text>
            {closed ? <Badge text="🔒 Cerrado" tone="good" /> : null}
          </View>
          <Money value={s.utilidadNeta} currency={cur} style={styles.heroValue} />
          <Text style={styles.heroSub}>
            {isBiz
              ? `Margen neto ${formatPct(s.margenNeto)} · ${s.count} movimientos`
              : `Tasa de ahorro ${formatPct(s.tasaAhorro)} · ${s.count} movimientos`}
          </Text>
        </View>

        <View style={styles.twoCols}>
          <Card style={styles.half}>
            <Text style={styles.statLabel}>↑ Ingresos</Text>
            <Money value={s.ingresos} currency={cur} style={[styles.statValue, { color: colors.income }]} />
          </Card>
          <Card style={styles.half}>
            <Text style={styles.statLabel}>↓ Gastos</Text>
            <Money value={s.gastos} currency={cur} style={[styles.statValue, { color: colors.expense }]} />
          </Card>
        </View>

        {proj && s.gastos > 0 && !closed ? (
          <Card>
            <Text style={styles.statLabel}>Proyección al cierre (día {proj.elapsed} de {proj.total})</Text>
            <Text style={[font.body, { color: colors.text, marginTop: 4 }]}>
              Al ritmo actual cerrará con gastos de <Text style={{ fontWeight: '800' }}>{formatMoney(proj.projected, cur)}</Text>
              {s.ingresos > 0 ? (
                <Text>
                  {' '}e ingresos de <Text style={{ fontWeight: '800' }}>{formatMoney((s.ingresos / proj.elapsed) * proj.total, cur)}</Text>.
                </Text>
              ) : '.'}
            </Text>
          </Card>
        ) : null}

        <SectionTitle>{isBiz ? 'Estructura de gastos' : 'Regla 50 / 30 / 20'}</SectionTitle>
        <Card>
          {expenseGroups.map((g) => {
            const value = s.groups[g];
            const base = isBiz ? s.gastos : s.ingresos;
            const share = base > 0 ? value / base : 0;
            const target = targets[g];
            return (
              <View key={g} style={{ marginBottom: space.md }}>
                <View style={styles.groupRow}>
                  <Text style={styles.groupLabel}>{GROUP_LABELS[settings.mode][g]}</Text>
                  <Text style={styles.groupValue}>
                    {formatMoney(value, cur)}
                    <Text style={{ color: colors.muted, fontWeight: '500' }}>
                      {'  '}{formatPct(share, 0)}{!isBiz && target ? ` / ${formatPct(target, 0)}` : ''}
                    </Text>
                  </Text>
                </View>
                <Bar ratio={share} color={groupColors[g] ?? colors.primary} />
              </View>
            );
          })}
          {!isBiz ? <Text style={styles.footnote}>Porcentajes sobre el ingreso del mes vs. meta recomendada.</Text> : null}
        </Card>

        <SectionTitle right={txs.length ? <Text style={styles.link} onPress={() => goTo('movimientos')}>Ver todos</Text> : null}>
          Últimos movimientos
        </SectionTitle>
        <Card style={{ paddingVertical: space.sm }}>
          {txs.length === 0 ? (
            <Empty icon="🧾" title="Aún no hay movimientos" text="Registre su primer ingreso o gasto con el botón de abajo." />
          ) : (
            txs.slice(0, 5).map((tx) => (
              <TxRow key={tx.id} tx={tx} currency={cur} showDate onPress={() => openForm({ tx })} />
            ))
          )}
        </Card>

        <Card style={{ backgroundColor: colors.primarySoft }}>
          <Text style={[font.h3, { color: colors.primaryDark }]}>
            {closed ? 'Cierre de mes listo' : '¿Terminó el mes?'}
          </Text>
          <Text style={[font.small, { color: colors.primaryDark, marginTop: 4 }]}>
            {closed
              ? 'Revise el estado de resultados y compártalo.'
              : 'Genere el estado de resultados, indicadores y recomendaciones.'}{' '}
            <Text style={{ fontWeight: '800' }} onPress={() => goTo('cierre')}>Ir al cierre →</Text>
          </Text>
        </Card>
      </ScrollView>
      {!closed ? <Fab onPress={() => openForm({ date: defaultDateFor(month) })} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: 110 },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: space.lg, gap: space.md },
  hello: { ...font.small, color: colors.muted },
  hero: { borderRadius: 22, padding: space.xl, marginBottom: space.md },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: -1, marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 6 },
  twoCols: { flexDirection: 'row', gap: space.md },
  half: { flex: 1 },
  statLabel: { ...font.small, color: colors.muted, fontWeight: '600' },
  statValue: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  groupRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  groupLabel: { ...font.small, color: colors.text, fontWeight: '600' },
  groupValue: { ...font.small, color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  footnote: { fontSize: 11, color: colors.faint },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
});
