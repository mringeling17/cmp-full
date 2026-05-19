# Fase A — Quick wins (#1 rename + #2 "TODAS" en MultiSelect)

- **Fecha:** 2026-05-18
- **Estado:** Diseño aprobado por el usuario
- **Alcance:** Primer sub-proyecto del backlog del mail 2026-05-18. Solo #1 y #2.
- **Fuera de alcance:** #3 (NC en línea aparte), #4 (atribución de agencia — spec propia, estructural), #5/#6 (reportes), #7 (registro de pago). Cada uno con su propio ciclo spec → plan.

## Contexto

App SvelteKit + TS (CMP finance). Backlog de 7 features; se priorizó hacer
primero los 2 quick wins independientes y de bajo riesgo. #4 se sacó de esta
fase por ser un problema estructural de modelo de datos (su propia spec, antes
de los reportes).

## Feature #1 — Renombrar columna "N Factura" → "Certificación"

### Problema
La grilla de facturas muestra la columna `invoice_number` con el encabezado
"N Factura". Ese número es en realidad el número de **certificación** (coincide
con el nombre de los PDFs de certificación y con `buildObservacion`, que arma
`Certificacion ${invoiceNumber} / ...`). El label confunde.

### Cambio
- `src/lib/components/invoices/InvoiceGrid.svelte`: la columna con
  `field: 'invoice_number'` cambia `headerName: 'N Factura'` →
  `headerName: 'Certificación'`.
- Es el único lugar de la UI con el label "N Factura" (verificado por grep).
- **No** cambia: el `field` sigue siendo `invoice_number`; búsqueda,
  ordenamiento, datos y otras pantallas quedan igual. La columna
  `factura_interna` (label "N Interno") no se toca.

### Criterio de éxito
La grilla de facturas muestra "Certificación" en esa columna; el resto
idéntico.

## Feature #2 — Opción "TODAS" en filtros multi-select (agencia/cliente/etc.)

### Problema
Hoy los filtros multi-select arrancan vacíos (vacío = sin filtro = todos,
implícito). El usuario quiere poder elegir explícitamente "TODAS" y luego
des-seleccionar algunas (ej.: comparar todos los clientes **menos** Trivago y
Gobierno).

### Decisión de enfoque
**Enfoque A (snapshot).** Existe un componente compartido
`src/lib/components/dashboard/MultiSelect.svelte` usado por DashboardFilters,
InvoiceFilters y PeriodComparison. Se mejora **solo ese componente** y el
cambio se propaga a todos los filtros multi-select sin tocar a los
consumidores.

Rechazados:
- **B (sentinela dinámico "todas" + exclusiones):** auto-incluiría ítems
  nuevos, pero obliga a cambiar todos los consumidores y `report-engine`.
  Más riesgo, YAGNI.
- **C (botón ad-hoc por filtro):** duplicado e inconsistente.

### Cambio (solo `MultiSelect.svelte`)
- Agregar botón **"Seleccionar todas"** (junto al ya existente "Limpiar
  seleccion") que setea `selected = items.map((i) => i.id)`.
- Semántica **snapshot**: "TODAS" = todos los ids actuales como lista
  explícita. El usuario luego des-selecciona ítems con el toggle existente.
  No hay concepto nuevo de "all"; los consumidores siguen recibiendo
  `string[]` igual que hoy → **cero cambios en consumidores ni en datos**.
- Con `searchable`: "Seleccionar todas" selecciona **todos los ítems**
  (ignora el texto de búsqueda actual), porque el caso de uso es
  "todas menos algunas".
- Texto del trigger: mostrar `label (Todas)` cuando
  `selected.length === items.length && items.length > 0`; si no, el actual
  `label (N)`; vacío → `label`.
- Visibilidad de botones: "Seleccionar todas" visible cuando no están todas
  seleccionadas; "Limpiar seleccion" cuando hay al menos una (comportamiento
  actual). Ambos pueden coexistir.

### Criterio de éxito
En cualquier filtro que use `MultiSelect` (Dashboard, Facturas, Comparativo):
se puede clickear "Seleccionar todas", quedan todas tildadas, se pueden
destildar individualmente, y el resultado es la lista explícita esperada
(ej.: todas menos Trivago/Gobierno en el comparativo).

## Riesgos / consideraciones

- Cambio aislado en 1 componente compartido + 1 label → bajo riesgo, sin
  cambios de esquema ni de API.
- Regresión a vigilar: que la semántica "vacío = todos" de los consumidores
  no se rompa (no la tocamos; "TODAS" produce lista llena, distinto de
  vacío, y los consumidores ya manejan listas explícitas).

## Verificación

- `npm run check` 0 errores.
- Prueba manual: Dashboard / Facturas / Comparativo → "Seleccionar todas",
  destildar 1-2, confirmar que el filtro/aplicación refleja la selección.
- Grilla de facturas: encabezado dice "Certificación".

## No hay preguntas abiertas
Diseño cerrado y aprobado. Siguiente paso: writing-plans.
