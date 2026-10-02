import { Category, Group, Mode, TxType } from './types';

export const CATEGORIES: Category[] = [
  // ---- Negocio: ingresos
  { id: 'n-ventas', name: 'Venta de productos', type: 'ingreso', group: 'ventas', mode: 'negocio', icon: '🛒' },
  { id: 'n-servicios', name: 'Servicios', type: 'ingreso', group: 'ventas', mode: 'negocio', icon: '🧾' },
  { id: 'n-otros-ing', name: 'Otros ingresos', type: 'ingreso', group: 'otros_ingresos', mode: 'negocio', icon: '➕' },
  // ---- Negocio: costo de ventas (variables)
  { id: 'n-mercaderia', name: 'Compra de mercadería', type: 'gasto', group: 'costo_ventas', mode: 'negocio', icon: '📦' },
  { id: 'n-materia', name: 'Materia prima', type: 'gasto', group: 'costo_ventas', mode: 'negocio', icon: '🧱' },
  { id: 'n-insumos', name: 'Empaque e insumos', type: 'gasto', group: 'costo_ventas', mode: 'negocio', icon: '🎁' },
  // ---- Negocio: gastos operativos (fijos)
  { id: 'n-alquiler', name: 'Alquiler', type: 'gasto', group: 'gastos_operativos', mode: 'negocio', icon: '🏢' },
  { id: 'n-salarios', name: 'Salarios y CCSS', type: 'gasto', group: 'gastos_operativos', mode: 'negocio', icon: '👥' },
  { id: 'n-servpub', name: 'Luz, agua, internet', type: 'gasto', group: 'gastos_operativos', mode: 'negocio', icon: '💡' },
  { id: 'n-publicidad', name: 'Publicidad', type: 'gasto', group: 'gastos_operativos', mode: 'negocio', icon: '📣' },
  { id: 'n-transporte', name: 'Transporte y envíos', type: 'gasto', group: 'gastos_operativos', mode: 'negocio', icon: '🚚' },
  { id: 'n-mantenimiento', name: 'Mantenimiento', type: 'gasto', group: 'gastos_operativos', mode: 'negocio', icon: '🔧' },
  { id: 'n-otros-op', name: 'Otros gastos operativos', type: 'gasto', group: 'gastos_operativos', mode: 'negocio', icon: '📎' },
  // ---- Negocio: financieros e impuestos
  { id: 'n-financieros', name: 'Comisiones e intereses', type: 'gasto', group: 'gastos_financieros', mode: 'negocio', icon: '🏦' },
  { id: 'n-impuestos', name: 'Impuestos y patentes', type: 'gasto', group: 'impuestos', mode: 'negocio', icon: '🏛️' },

  // ---- Personal: ingresos
  { id: 'p-salario', name: 'Salario', type: 'ingreso', group: 'ventas', mode: 'personal', icon: '💼' },
  { id: 'p-extras', name: 'Trabajos extra', type: 'ingreso', group: 'ventas', mode: 'personal', icon: '🛠️' },
  { id: 'p-otros-ing', name: 'Otros ingresos', type: 'ingreso', group: 'otros_ingresos', mode: 'personal', icon: '➕' },
  // ---- Personal: necesidades
  { id: 'p-vivienda', name: 'Vivienda', type: 'gasto', group: 'necesidades', mode: 'personal', icon: '🏠' },
  { id: 'p-comida', name: 'Supermercado', type: 'gasto', group: 'necesidades', mode: 'personal', icon: '🥦' },
  { id: 'p-servicios', name: 'Luz, agua, internet', type: 'gasto', group: 'necesidades', mode: 'personal', icon: '💡' },
  { id: 'p-transporte', name: 'Transporte', type: 'gasto', group: 'necesidades', mode: 'personal', icon: '🚌' },
  { id: 'p-salud', name: 'Salud', type: 'gasto', group: 'necesidades', mode: 'personal', icon: '🩺' },
  { id: 'p-educacion', name: 'Educación', type: 'gasto', group: 'necesidades', mode: 'personal', icon: '📚' },
  // ---- Personal: deseos
  { id: 'p-restaurantes', name: 'Restaurantes', type: 'gasto', group: 'deseos', mode: 'personal', icon: '🍽️' },
  { id: 'p-entretenimiento', name: 'Entretenimiento', type: 'gasto', group: 'deseos', mode: 'personal', icon: '🎬' },
  { id: 'p-ropa', name: 'Ropa y compras', type: 'gasto', group: 'deseos', mode: 'personal', icon: '👕' },
  { id: 'p-suscripciones', name: 'Suscripciones', type: 'gasto', group: 'deseos', mode: 'personal', icon: '📺' },
  // ---- Personal: ahorro y deudas
  { id: 'p-ahorro', name: 'Ahorro e inversión', type: 'gasto', group: 'ahorro', mode: 'personal', icon: '🐷' },
  { id: 'p-deudas', name: 'Pago de deudas', type: 'gasto', group: 'ahorro', mode: 'personal', icon: '💳' },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): Category | undefined {
  return BY_ID.get(id);
}

export function categoriesFor(mode: Mode, type: TxType): Category[] {
  return CATEGORIES.filter((c) => c.mode === mode && c.type === type);
}

export const GROUP_LABELS: Record<Mode, Partial<Record<Group, string>>> = {
  negocio: {
    ventas: 'Ventas',
    otros_ingresos: 'Otros ingresos',
    costo_ventas: 'Costo de ventas',
    gastos_operativos: 'Gastos operativos',
    gastos_financieros: 'Gastos financieros',
    impuestos: 'Impuestos',
  },
  personal: {
    ventas: 'Ingresos principales',
    otros_ingresos: 'Otros ingresos',
    necesidades: 'Necesidades',
    deseos: 'Deseos',
    ahorro: 'Ahorro y deudas',
  },
};
