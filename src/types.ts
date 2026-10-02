export type Currency = 'CRC' | 'USD';
export type Mode = 'negocio' | 'personal';
export type TxType = 'ingreso' | 'gasto';

/**
 * Grupo contable de cada categoría. Define en qué línea del
 * estado de resultados (negocio) o del presupuesto 50/30/20 (personal) cae.
 */
export type Group =
  | 'ventas'
  | 'otros_ingresos'
  | 'costo_ventas'
  | 'gastos_operativos'
  | 'gastos_financieros'
  | 'impuestos'
  | 'necesidades'
  | 'deseos'
  | 'ahorro';

export interface Category {
  id: string;
  name: string;
  type: TxType;
  group: Group;
  mode: Mode;
  icon: string;
}

export interface Transaction {
  id: string;
  mode: Mode;
  type: TxType;
  categoryId: string;
  amount: number;
  currency: Currency;
  /** Colones por 1 dólar al momento del registro. */
  rate: number;
  /** AAAA-MM-DD */
  date: string;
  note: string;
  createdAt: number;
}

export interface CloseTotals {
  ingresos: number;
  gastos: number;
  utilidad: number;
}

export interface MonthClose {
  key: string;
  mode: Mode;
  /** AAAA-MM */
  month: string;
  closedAt: number;
  count: number;
  totals: Record<Currency, CloseTotals>;
}

export interface Settings {
  mode: Mode;
  displayCurrency: Currency;
  defaultCurrency: Currency;
  exchangeRate: number;
  businessName: string;
}

export interface AppState {
  version: 1;
  settings: Settings;
  transactions: Transaction[];
  closes: Record<string, MonthClose>;
}
