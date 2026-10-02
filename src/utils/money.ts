import { Currency } from '../types';

export const SYMBOL: Record<Currency, string> = { CRC: '₡', USD: '$' };

function groupThousands(int: string, sep: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/**
 * Formato local: colones sin decimales (₡1.250.000) y dólares con dos ($1,250.50).
 */
export function formatMoney(value: number, currency: Currency, opts: { sign?: boolean } = {}): string {
  const safe = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(safe);
  let body: string;
  if (currency === 'CRC') {
    body = groupThousands(Math.round(abs).toString(), '.');
  } else {
    const [int, dec] = abs.toFixed(2).split('.');
    body = `${groupThousands(int, ',')}.${dec}`;
  }
  const isZero = currency === 'CRC' ? Math.round(abs) === 0 : abs < 0.005;
  const sign = safe < 0 && !isZero ? '-' : opts.sign && !isZero ? '+' : '';
  return `${sign}${SYMBOL[currency]}${body}`;
}

/** Acepta "1500", "1500.50", "1.500,50", "1,500.50" y "1 500". */
export function parseAmount(text: string): number {
  let s = text.replace(/[\s₡$]/g, '');
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    // La coma es el separador decimal
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma && lastComma !== -1) {
    s = s.replace(/,/g, '');
  } else if (lastComma === -1 && (s.match(/\./g) || []).length > 1) {
    // "1.500.000" -> separadores de miles
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function convert(amount: number, from: Currency, to: Currency, rate: number): number {
  if (from === to) return amount;
  return to === 'CRC' ? amount * rate : amount / rate;
}

export function formatPct(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}
