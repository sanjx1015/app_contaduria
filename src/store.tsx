import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { computeStatement } from './finance';
import { AppState, Mode, MonthClose, Settings, Transaction } from './types';
import { monthOf } from './utils/dates';

const STORAGE_KEY = 'appcontador:v1';

const DEFAULT_STATE: AppState = {
  version: 1,
  settings: {
    mode: 'negocio',
    displayCurrency: 'CRC',
    defaultCurrency: 'CRC',
    exchangeRate: 505,
    businessName: 'Mi Negocio',
  },
  transactions: [],
  closes: {},
};

type Action =
  | { type: 'load'; state: AppState }
  | { type: 'addTx'; tx: Transaction }
  | { type: 'updateTx'; tx: Transaction }
  | { type: 'deleteTx'; id: string }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'closeMonth'; close: MonthClose }
  | { type: 'reopenMonth'; key: string }
  | { type: 'reset' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'load':
      return action.state;
    case 'addTx':
      return { ...state, transactions: [action.tx, ...state.transactions] };
    case 'updateTx':
      return { ...state, transactions: state.transactions.map((t) => (t.id === action.tx.id ? action.tx : t)) };
    case 'deleteTx':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id) };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'closeMonth':
      return { ...state, closes: { ...state.closes, [action.close.key]: action.close } };
    case 'reopenMonth': {
      const closes = { ...state.closes };
      delete closes[action.key];
      return { ...state, closes };
    }
    case 'reset':
      return { ...DEFAULT_STATE, settings: state.settings };
  }
}

export const closeKey = (mode: Mode, month: string) => `${mode}:${month}`;

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

interface StoreValue {
  state: AppState;
  loaded: boolean;
  dispatch: React.Dispatch<Action>;
  /** Movimientos del libro activo (negocio o personal) para un mes. */
  monthTxs: (month: string) => Transaction[];
  isClosed: (month: string) => boolean;
  closeMonth: (month: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AppState>;
          dispatch({
            type: 'load',
            state: {
              ...DEFAULT_STATE,
              ...parsed,
              settings: { ...DEFAULT_STATE.settings, ...(parsed.settings ?? {}) },
              transactions: parsed.transactions ?? [],
              closes: parsed.closes ?? {},
            },
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, loaded]);

  const value = useMemo<StoreValue>(() => {
    const mode = state.settings.mode;
    const monthTxs = (month: string) =>
      state.transactions
        .filter((t) => t.mode === mode && monthOf(t.date) === month)
        .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)));
    return {
      state,
      loaded,
      dispatch,
      monthTxs,
      isClosed: (month) => Boolean(state.closes[closeKey(mode, month)]),
      closeMonth: (month) => {
        const txs = monthTxs(month);
        const crc = computeStatement(txs, 'CRC');
        const usd = computeStatement(txs, 'USD');
        dispatch({
          type: 'closeMonth',
          close: {
            key: closeKey(mode, month),
            mode,
            month,
            closedAt: Date.now(),
            count: txs.length,
            totals: {
              CRC: { ingresos: crc.ingresos, gastos: crc.gastos, utilidad: crc.utilidadNeta },
              USD: { ingresos: usd.ingresos, gastos: usd.gastos, utilidad: usd.utilidadNeta },
            },
          },
        });
      },
    };
  }, [state, loaded]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider');
  return ctx;
}
