import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getCategory } from '../categories';
import { txAmountIn } from '../finance';
import { colors, font, space } from '../theme';
import { Currency, Transaction } from '../types';
import { formatMoney } from '../utils/money';
import { formatShort } from '../utils/dates';

export function TxRow({
  tx,
  currency,
  onPress,
  showDate,
}: {
  tx: Transaction;
  currency: Currency;
  onPress?: () => void;
  showDate?: boolean;
}) {
  const cat = getCategory(tx.categoryId);
  const isIncome = tx.type === 'ingreso';
  const value = txAmountIn(tx, currency);
  const subtitle = [showDate ? formatShort(tx.date) : null, tx.note || null].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#F6F8F7' }]}>
      <View style={[styles.icon, { backgroundColor: isIncome ? colors.incomeSoft : colors.expenseSoft }]}>
        <Text style={{ fontSize: 18 }}>{cat?.icon ?? '•'}</Text>
      </View>
      <View style={{ flex: 1, marginRight: space.sm }}>
        <Text style={styles.title} numberOfLines={1}>
          {cat?.name ?? 'Sin categoría'}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.amount, { color: isIncome ? colors.income : colors.text }]}>
          {formatMoney(isIncome ? value : -value, currency, { sign: isIncome })}
        </Text>
        {tx.currency !== currency ? (
          <Text style={styles.original}>{formatMoney(tx.amount, tx.currency)} · TC {tx.rate}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12 },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: space.md },
  title: { ...font.body, color: colors.text, fontWeight: '600' },
  subtitle: { ...font.small, color: colors.muted, marginTop: 1 },
  amount: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  original: { fontSize: 11, color: colors.faint, marginTop: 1 },
});
