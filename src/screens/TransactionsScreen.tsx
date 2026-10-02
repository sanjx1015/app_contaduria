import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getCategory } from '../categories';
import { Card, Empty, Fab, Money, MonthPicker, Segmented } from '../components/ui';
import { TxRow } from '../components/TxRow';
import { FormRequest } from '../components/TransactionForm';
import { txAmountIn } from '../finance';
import { useStore } from '../store';
import { colors, font, radius, space } from '../theme';
import { Transaction } from '../types';
import { defaultDateFor, formatDayHeader } from '../utils/dates';

type Filter = 'todos' | 'ingreso' | 'gasto';

interface Props {
  month: string;
  setMonth: (m: string) => void;
  openForm: (r: FormRequest) => void;
}

export function TransactionsScreen({ month, setMonth, openForm }: Props) {
  const { state, monthTxs, isClosed } = useStore();
  const cur = state.settings.displayCurrency;
  const [filter, setFilter] = useState<Filter>('todos');
  const [query, setQuery] = useState('');
  const closed = isClosed(month);
  const all = monthTxs(month);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((t) => {
      if (filter !== 'todos' && t.type !== filter) return false;
      if (!q) return true;
      const name = getCategory(t.categoryId)?.name.toLowerCase() ?? '';
      return name.includes(q) || t.note.toLowerCase().includes(q);
    });
  }, [all, filter, query]);

  const sections = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const total = filtered.reduce((sum, t) => sum + (t.type === 'ingreso' ? 1 : -1) * txAmountIn(t, cur), 0);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[font.h1, { marginBottom: space.md }]}>Movimientos</Text>
        <MonthPicker month={month} onChange={setMonth} />
        <Segmented<Filter>
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'ingreso', label: 'Ingresos' },
            { value: 'gasto', label: 'Gastos' },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por categoría o detalle"
          placeholderTextColor={colors.faint}
          style={styles.search}
        />

        {closed ? (
          <View style={styles.lock}>
            <Text style={styles.lockText}>🔒 Mes cerrado: los movimientos son de solo lectura.</Text>
          </View>
        ) : null}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{filtered.length} movimientos</Text>
          <Money value={total} currency={cur} colored sign style={styles.totalValue} />
        </View>

        {sections.length === 0 ? (
          <Card>
            <Empty
              icon="🔍"
              title={all.length ? 'Sin resultados' : 'Sin movimientos este mes'}
              text={all.length ? 'Pruebe con otro filtro o búsqueda.' : 'Toque "+ Registrar" para agregar uno.'}
            />
          </Card>
        ) : (
          sections.map(([date, list]) => {
            const dayTotal = list.reduce((sum, t) => sum + (t.type === 'ingreso' ? 1 : -1) * txAmountIn(t, cur), 0);
            return (
              <View key={date}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayText}>{formatDayHeader(date)}</Text>
                  <Money value={dayTotal} currency={cur} sign style={styles.dayTotal} />
                </View>
                <Card style={{ paddingVertical: space.xs, paddingHorizontal: space.md }}>
                  {list.map((tx) => (
                    <TxRow key={tx.id} tx={tx} currency={cur} onPress={() => openForm({ tx })} />
                  ))}
                </Card>
              </View>
            );
          })
        )}
      </ScrollView>
      {!closed ? (
        <Fab onPress={() => openForm({ date: defaultDateFor(month), type: filter === 'ingreso' ? 'ingreso' : 'gasto' })} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: 110 },
  search: {
    marginTop: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
  },
  lock: { marginTop: space.md, backgroundColor: colors.warnSoft, borderRadius: radius.md, padding: space.md },
  lockText: { color: colors.warn, fontWeight: '600', fontSize: 13 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: space.md },
  totalLabel: { ...font.small, color: colors.muted },
  totalValue: { fontSize: 16, fontWeight: '800' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, marginTop: 4, paddingHorizontal: 4 },
  dayText: { ...font.tiny, color: colors.muted },
  dayTotal: { fontSize: 12, color: colors.muted, fontWeight: '600' },
});
