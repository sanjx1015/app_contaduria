import React from 'react';
import { Alert, Platform, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors, font, radius, space } from '../theme';
import { Currency } from '../types';
import { formatMoney } from '../utils/money';
import { addMonths, currentMonth, monthLabel } from '../utils/dates';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.segment, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segmentItem, active && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  style,
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const bg = { primary: colors.primary, secondary: colors.primarySoft, danger: colors.expenseSoft, ghost: 'transparent' }[variant];
  const fg = { primary: '#fff', secondary: colors.primary, danger: colors.expense, ghost: colors.primary }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const isCurrent = month === currentMonth();
  return (
    <View style={styles.monthPicker}>
      <Pressable hitSlop={10} onPress={() => onChange(addMonths(month, -1))} style={styles.monthArrow}>
        <Text style={styles.monthArrowText}>‹</Text>
      </Pressable>
      <Pressable onPress={() => onChange(currentMonth())} style={{ alignItems: 'center' }}>
        <Text style={styles.monthText}>{monthLabel(month)}</Text>
        {!isCurrent && <Text style={styles.monthHint}>Tocar para volver al mes actual</Text>}
      </Pressable>
      <Pressable hitSlop={10} onPress={() => onChange(addMonths(month, 1))} style={styles.monthArrow}>
        <Text style={styles.monthArrowText}>›</Text>
      </Pressable>
    </View>
  );
}

export function Money({
  value,
  currency,
  style,
  colored,
  sign,
}: {
  value: number;
  currency: Currency;
  style?: StyleProp<TextStyle>;
  colored?: boolean;
  sign?: boolean;
}) {
  const color = colored ? (value < 0 ? colors.expense : value > 0 ? colors.income : colors.text) : undefined;
  return (
    <Text style={[{ fontVariant: ['tabular-nums'] }, color ? { color } : null, style]} numberOfLines={1} adjustsFontSizeToFit>
      {formatMoney(value, currency, { sign })}
    </Text>
  );
}

export function Badge({ text, tone = 'info' }: { text: string; tone?: 'good' | 'warn' | 'bad' | 'info' }) {
  const map = {
    good: [colors.incomeSoft, colors.income],
    warn: [colors.warnSoft, colors.warn],
    bad: [colors.expenseSoft, colors.expense],
    info: [colors.infoSoft, colors.info],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function Bar({ ratio, color }: { ratio: number; color: string }) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Empty({ icon, title, text }: { icon: string; title: string; text?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 40 }}>{icon}</Text>
      <Text style={[font.h3, { color: colors.text, marginTop: space.sm }]}>{title}</Text>
      {text ? <Text style={[font.small, { color: colors.muted, textAlign: 'center', marginTop: 4 }]}>{text}</Text> : null}
    </View>
  );
}

export function Fab({ onPress, label = '+ Registrar' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.fab, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}
      accessibilityLabel="Registrar movimiento"
    >
      <Text style={styles.fabText}>{label}</Text>
    </Pressable>
  );
}

/** Confirmación multiplataforma (Alert no muestra botones en web). */
export function confirm(title: string, message: string, okText: string, onOk: () => void, destructive = false) {
  if (Platform.OS === 'web') {
    if ((globalThis as any).confirm(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: okText, style: destructive ? 'destructive' : 'default', onPress: onOk },
  ]);
}

export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    (globalThis as any).alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
    shadowColor: '#0B2A1E',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md, marginBottom: space.sm },
  sectionTitle: { ...font.tiny, color: colors.muted },
  segment: { flexDirection: 'row', backgroundColor: '#E6EBE8', borderRadius: radius.md, padding: 3 },
  segmentItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.sm + 1 },
  segmentActive: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { ...font.small, color: colors.muted, fontWeight: '600' },
  segmentTextActive: { color: colors.text },
  button: { paddingVertical: 14, paddingHorizontal: space.lg, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700' },
  monthPicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  monthArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  monthArrowText: { fontSize: 26, color: colors.primary, marginTop: -3 },
  monthText: { ...font.h2, color: colors.text },
  monthHint: { fontSize: 11, color: colors.faint, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  barTrack: { height: 8, backgroundColor: '#EDF1EE', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: space.xl },
  fab: {
    position: 'absolute',
    right: space.lg,
    bottom: space.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: radius.pill,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
