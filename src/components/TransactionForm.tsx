import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categoriesFor } from '../categories';
import { closeKey, newId, useStore } from '../store';
import { colors, font, radius, space } from '../theme';
import { Currency, Transaction, TxType } from '../types';
import { convert, formatMoney, parseAmount, SYMBOL } from '../utils/money';
import { isValidISODate, monthLabel, monthOf, todayISO, yesterdayISO } from '../utils/dates';
import { Button, confirm, notify, Segmented } from './ui';

export interface FormRequest {
  tx?: Transaction;
  type?: TxType;
  date?: string;
}

export function TransactionForm({ request, onClose }: { request: FormRequest | null; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const { settings } = state;
  const editing = request?.tx;

  const [type, setType] = useState<TxType>('gasto');
  const [amountText, setAmountText] = useState('');
  const [currency, setCurrency] = useState<Currency>('CRC');
  const [rateText, setRateText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!request) return;
    const tx = request.tx;
    setType(tx?.type ?? request.type ?? 'gasto');
    setAmountText(tx ? String(tx.amount) : '');
    setCurrency(tx?.currency ?? settings.defaultCurrency);
    setRateText(String(tx?.rate ?? settings.exchangeRate));
    setCategoryId(tx?.categoryId ?? null);
    setDate(tx?.date ?? request.date ?? todayISO());
    setNote(tx?.note ?? '');
  }, [request]);

  const mode = editing?.mode ?? settings.mode;
  const cats = categoriesFor(mode, type);
  const amount = parseAmount(amountText);
  const rate = parseAmount(rateText);
  const isIncome = type === 'ingreso';
  const accent = isIncome ? colors.income : colors.expense;

  const changeType = (t: TxType) => {
    setType(t);
    setCategoryId(null);
  };

  const save = () => {
    if (!Number.isFinite(amount) || amount <= 0) return notify('Monto inválido', 'Ingrese un monto mayor a cero.');
    if (!Number.isFinite(rate) || rate <= 0) return notify('Tipo de cambio inválido', 'Ingrese los colones por dólar (ej. 505).');
    if (!categoryId) return notify('Falta la categoría', 'Seleccione una categoría para clasificar el movimiento.');
    if (!isValidISODate(date)) return notify('Fecha inválida', 'Use el formato AAAA-MM-DD, por ejemplo 2026-10-15.');
    const targetMonth = monthOf(date);
    if (state.closes[closeKey(mode, targetMonth)]) {
      return notify('Mes cerrado', `${monthLabel(targetMonth)} ya fue cerrado. Reábralo en la pestaña "Cierre" para modificarlo.`);
    }
    if (editing && state.closes[closeKey(editing.mode, monthOf(editing.date))]) {
      return notify('Mes cerrado', 'Este movimiento pertenece a un mes cerrado y no puede modificarse.');
    }
    const tx: Transaction = {
      id: editing?.id ?? newId(),
      mode,
      type,
      categoryId,
      amount: Math.round(amount * 100) / 100,
      currency,
      rate,
      date,
      note: note.trim(),
      createdAt: editing?.createdAt ?? Date.now(),
    };
    dispatch({ type: editing ? 'updateTx' : 'addTx', tx });
    onClose();
  };

  const remove = () => {
    if (!editing) return;
    if (state.closes[closeKey(editing.mode, monthOf(editing.date))]) {
      return notify('Mes cerrado', 'No se pueden eliminar movimientos de un mes cerrado.');
    }
    confirm('Eliminar movimiento', '¿Seguro que desea eliminarlo? Esta acción no se puede deshacer.', 'Eliminar', () => {
      dispatch({ type: 'deleteTx', id: editing.id });
      onClose();
    }, true);
  };

  const other: Currency = currency === 'CRC' ? 'USD' : 'CRC';
  const equivalent = Number.isFinite(amount) && amount > 0 && rate > 0 ? convert(amount, currency, other, rate) : null;

  return (
    <Modal visible={request !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.headerLink}>Cancelar</Text>
            </Pressable>
            <Text style={font.h3}>{editing ? 'Editar movimiento' : 'Nuevo movimiento'}</Text>
            <Pressable onPress={save} hitSlop={10}>
              <Text style={[styles.headerLink, { fontWeight: '800' }]}>Guardar</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Segmented
              options={[
                { value: 'gasto', label: 'Gasto' },
                { value: 'ingreso', label: 'Ingreso' },
              ]}
              value={type}
              onChange={changeType}
            />

            <View style={[styles.amountBox, { borderColor: accent }]}>
              <Pressable onPress={() => setCurrency(other)} style={[styles.currencyBtn, { backgroundColor: accent }]}>
                <Text style={styles.currencyText}>{SYMBOL[currency]}</Text>
                <Text style={styles.currencyCode}>{currency}</Text>
              </Pressable>
              <TextInput
                value={amountText}
                onChangeText={setAmountText}
                placeholder="0"
                placeholderTextColor={colors.faint}
                keyboardType="decimal-pad"
                style={[styles.amountInput, { color: accent }]}
                autoFocus={!editing}
              />
            </View>
            <View style={styles.rateRow}>
              <Text style={styles.helper}>
                {equivalent !== null ? `≈ ${formatMoney(equivalent, other)}` : 'Toque el símbolo para cambiar de moneda'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.helper}>TC ₡</Text>
                <TextInput value={rateText} onChangeText={setRateText} keyboardType="decimal-pad" style={styles.rateInput} />
              </View>
            </View>

            <Text style={styles.label}>Categoría</Text>
            <View style={styles.chips}>
              {cats.map((c) => {
                const active = c.id === categoryId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategoryId(c.id)}
                    style={[styles.chip, active && { backgroundColor: accent, borderColor: accent }]}
                  >
                    <Text style={{ fontSize: 15 }}>{c.icon}</Text>
                    <Text style={[styles.chipText, active && { color: '#fff' }]}>{c.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Fecha</Text>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.faint}
                style={[styles.input, { flex: 1, minWidth: 0 }]}
                maxLength={10}
              />
              <Pressable style={styles.quick} onPress={() => setDate(todayISO())}>
                <Text style={styles.quickText}>Hoy</Text>
              </Pressable>
              <Pressable style={styles.quick} onPress={() => setDate(yesterdayISO())}>
                <Text style={styles.quickText}>Ayer</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Detalle (opcional)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={isIncome ? 'Ej. Venta a cliente, factura #120' : 'Ej. Proveedor, número de factura'}
              placeholderTextColor={colors.faint}
              style={styles.input}
              maxLength={120}
            />

            <Button title={editing ? 'Guardar cambios' : `Registrar ${isIncome ? 'ingreso' : 'gasto'}`} onPress={save} style={{ marginTop: space.xl }} />
            {editing ? <Button title="Eliminar" variant="danger" onPress={remove} style={{ marginTop: space.sm }} /> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerLink: { color: colors.primary, fontSize: 16 },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 2,
    marginTop: space.lg,
    padding: space.sm,
  },
  currencyBtn: { width: 64, height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  currencyText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  currencyCode: { color: '#fff', fontSize: 10, fontWeight: '700', opacity: 0.85 },
  amountInput: { flex: 1, minWidth: 0, fontSize: 36, fontWeight: '800', paddingHorizontal: space.md, fontVariant: ['tabular-nums'] },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm },
  helper: { ...font.small, color: colors.muted },
  rateInput: {
    ...font.small,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
    marginLeft: 4,
    textAlign: 'center',
  },
  label: { ...font.tiny, color: colors.muted, marginTop: space.xl, marginBottom: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipText: { ...font.small, color: colors.text, fontWeight: '600' },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quick: { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.primarySoft, borderRadius: radius.md },
  quickText: { color: colors.primary, fontWeight: '700' },
});
