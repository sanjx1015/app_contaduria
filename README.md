# AppContador

Control de ingresos, gastos y utilidades con **cierre de mes**, para pequeños negocios y finanzas personales en Costa Rica. Moneda base colón (₡) con soporte para dólar ($).

Hecha con React Native + Expo (TypeScript). Los datos se guardan solo en el dispositivo (AsyncStorage).

## Ejecutar

```bash
npm install
npx expo start
```

Escanee el código QR con **Expo Go** (Android/iOS), o presione `w` para abrirla en el navegador.

## Funciones

- **Dos libros separados**: Negocio y Personal (Ajustes). Cada uno con sus movimientos y cierres.
- **Registro en ₡ o $**: cada movimiento guarda el tipo de cambio del día, así los meses cerrados no cambian cuando varía el dólar. Los reportes se pueden ver en cualquiera de las dos monedas.
- **Inicio**: utilidad del mes, ingresos/gastos, proyección al cierre (desde el día 7), estructura de gastos o regla 50/30/20.
- **Movimientos**: lista por día con filtros y búsqueda; tocar un movimiento para editarlo o eliminarlo.
- **Cierre de mes**:
  - Negocio: estado de resultados (ventas → utilidad bruta → operativa → antes de impuestos → neta), márgenes, punto de equilibrio.
  - Personal: ingresos vs. necesidades / deseos / ahorro, tasa de ahorro.
  - Comparación con el mes anterior, gastos por categoría y recomendaciones automáticas.
  - **Cerrar mes** bloquea los movimientos de ese mes (se puede reabrir). Historial de cierres.
  - **Compartir reporte** en texto (WhatsApp, correo, etc.).
- **Respaldo**: exportar todos los datos en JSON.

## Clasificación contable

| Grupo | Ejemplos | Línea del estado de resultados |
|---|---|---|
| Ventas | Venta de productos, servicios | Ingresos operativos |
| Costo de ventas | Mercadería, materia prima, empaque | Costo variable → utilidad bruta |
| Gastos operativos | Alquiler, salarios y CCSS, servicios, publicidad | Costo fijo → utilidad operativa |
| Otros ingresos / gastos financieros | Intereses, comisiones bancarias | Resultado no operativo |
| Impuestos | Renta, patentes | → utilidad neta |

Punto de equilibrio = gastos operativos ÷ margen de contribución ((ventas − costo de ventas) ÷ ventas).

## Estructura

```
App.tsx                      navegación por pestañas
src/types.ts                 modelos de datos
src/categories.ts            catálogo de categorías por libro
src/finance.ts               estado de resultados, indicadores, recomendaciones, reporte
src/store.tsx                estado global + persistencia
src/screens/                 Inicio, Movimientos, Cierre, Ajustes
src/components/              formulario, fila de movimiento, componentes UI
src/utils/                   dinero (formato/conversión), fechas, compartir
```
