import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormRequest, TransactionForm } from './src/components/TransactionForm';
import { ClosingScreen } from './src/screens/ClosingScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { StoreProvider, useStore } from './src/store';
import { colors } from './src/theme';
import { currentMonth } from './src/utils/dates';

type Tab = 'inicio' | 'movimientos' | 'cierre' | 'ajustes';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'inicio', label: 'Inicio', icon: '🏠' },
  { key: 'movimientos', label: 'Movimientos', icon: '📋' },
  { key: 'cierre', label: 'Cierre', icon: '📊' },
  { key: 'ajustes', label: 'Ajustes', icon: '⚙️' },
];

function Root() {
  const { loaded } = useStore();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('inicio');
  const [month, setMonth] = useState(currentMonth());
  const [form, setForm] = useState<FormRequest | null>(null);

  if (!loaded) {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <SafeAreaView edges={['top']} style={styles.flex}>
        {tab === 'inicio' && <DashboardScreen month={month} setMonth={setMonth} openForm={setForm} goTo={setTab} />}
        {tab === 'movimientos' && <TransactionsScreen month={month} setMonth={setMonth} openForm={setForm} />}
        {tab === 'cierre' && <ClosingScreen month={month} setMonth={setMonth} />}
        {tab === 'ajustes' && <SettingsScreen />}
      </SafeAreaView>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: active }}>
              <View style={[styles.tabIcon, active && styles.tabIconActive]}>
                <Text style={{ fontSize: 18, opacity: active ? 1 : 0.55 }}>{t.icon}</Text>
              </View>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <TransactionForm request={form} onClose={() => setForm(null)} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <View style={[styles.flex, { backgroundColor: colors.bg }]}>
          <Root />
        </View>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: 'center' },
  tabIcon: { paddingHorizontal: 16, paddingVertical: 4, borderRadius: 999 },
  tabIconActive: { backgroundColor: colors.primarySoft },
  tabLabel: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: '600' },
  tabLabelActive: { color: colors.primary },
});
