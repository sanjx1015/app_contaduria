import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, confirm, notify, SectionTitle, Segmented } from '../components/ui';
import { useStore } from '../store';
import { colors, font, radius, space } from '../theme';
import { Currency, Mode } from '../types';
import { parseAmount } from '../utils/money';
import { shareText } from '../utils/share';

export function SettingsScreen() {
  const { state, dispatch } = useStore();
  const { settings } = state;
  const [name, setName] = useState(settings.businessName);
  const [rate, setRate] = useState(String(settings.exchangeRate));

  useEffect(() => setName(settings.businessName), [settings.businessName]);
  useEffect(() => setRate(String(settings.exchangeRate)), [settings.exchangeRate]);

  const saveRate = () => {
    const n = parseAmount(rate);
    if (!Number.isFinite(n) || n <= 0) {
      setRate(String(settings.exchangeRate));
      return notify('Tipo de cambio inválido', 'Ingrese los colones por dólar, por ejemplo 505.');
    }
    dispatch({ type: 'settings', patch: { exchangeRate: n } });
  };

  const exportData = () => shareText('Respaldo AppContador', JSON.stringify(state, null, 2));

  const resetData = () =>
    confirm(
      'Borrar todos los datos',
      'Se eliminarán todos los movimientos y cierres de ambos libros (negocio y personal). Esta acción no se puede deshacer.',
      'Borrar todo',
      () => dispatch({ type: 'reset' }),
      true,
    );

  const count = (m: Mode) => state.transactions.filter((t) => t.mode === m).length;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[font.h1, { marginBottom: space.md }]}>Ajustes</Text>

      <SectionTitle>Libro contable activo</SectionTitle>
      <Card>
        <Segmented<Mode>
          options={[
            { value: 'negocio', label: '🏪 Negocio' },
            { value: 'personal', label: '👤 Personal' },
          ]}
          value={settings.mode}
          onChange={(mode) => dispatch({ type: 'settings', patch: { mode } })}
        />
        <Text style={styles.help}>
          Cada libro lleva sus propios movimientos y cierres. Mantener separadas las finanzas del negocio y las personales es la
          base de un buen control de costos. ({count('negocio')} mov. en negocio · {count('personal')} en personal)
        </Text>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={() => dispatch({ type: 'settings', patch: { businessName: name.trim() || 'Mi Negocio' } })}
          style={styles.input}
          placeholder="Nombre del negocio o suyo"
          placeholderTextColor={colors.faint}
        />
      </Card>

      <SectionTitle>Monedas</SectionTitle>
      <Card>
        <Text style={styles.label}>Moneda para mostrar reportes</Text>
        <Segmented<Currency>
          options={[
            { value: 'CRC', label: '₡ Colones' },
            { value: 'USD', label: '$ Dólares' },
          ]}
          value={settings.displayCurrency}
          onChange={(v) => dispatch({ type: 'settings', patch: { displayCurrency: v } })}
        />
        <Text style={styles.label}>Moneda por defecto al registrar</Text>
        <Segmented<Currency>
          options={[
            { value: 'CRC', label: '₡ Colones' },
            { value: 'USD', label: '$ Dólares' },
          ]}
          value={settings.defaultCurrency}
          onChange={(v) => dispatch({ type: 'settings', patch: { defaultCurrency: v } })}
        />
        <Text style={styles.label}>Tipo de cambio (₡ por $1)</Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <TextInput value={rate} onChangeText={setRate} onBlur={saveRate} keyboardType="decimal-pad" style={[styles.input, { flex: 1, minWidth: 0 }]} />
          <Button title="Guardar" variant="secondary" onPress={saveRate} style={{ paddingVertical: 12 }} />
        </View>
        <Text style={styles.help}>
          Use el tipo de cambio de referencia del BCCR. Cada movimiento guarda el tipo de cambio del día en que se registró, así
          los meses cerrados no cambian cuando el dólar sube o baja.
        </Text>
      </Card>

      <SectionTitle>Datos</SectionTitle>
      <Card>
        <Text style={[styles.help, { marginTop: 0, marginBottom: space.md }]}>
          Sus datos se guardan únicamente en este dispositivo. Exporte un respaldo periódicamente.
        </Text>
        <Button title="Exportar respaldo (JSON)" variant="secondary" onPress={exportData} />
        <Button title="Borrar todos los datos" variant="danger" onPress={resetData} style={{ marginTop: space.sm }} />
      </Card>

      <Text style={styles.version}>AppContador 1.0 · Hecho para pymes y personas en Costa Rica 🇨🇷</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: 60 },
  label: { ...font.tiny, color: colors.muted, marginTop: space.lg, marginBottom: space.sm },
  help: { ...font.small, color: colors.muted, marginTop: space.md, lineHeight: 19 },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  version: { textAlign: 'center', color: colors.faint, fontSize: 12, marginTop: space.lg },
});
