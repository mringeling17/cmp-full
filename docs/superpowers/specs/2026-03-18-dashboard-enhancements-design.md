# Dashboard Enhancements & Report Builder — Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Requested by:** Alvaro Ilic (email 2026-03-18) + Matias Ringeling (report builder idea)

## Context

CMP Finance is a SvelteKit 2 / Svelte 5 application for media investment analytics. It uses Supabase (PostgreSQL), ECharts for visualization, AG Grid for tables, SheetJS for Excel I/O, and Tailwind + shadcn/bits-ui for the component library.

The dashboard currently shows KPIs, charts (top clients, channel distribution, agency distribution, monthly trend, quarterly sales), and a period comparison feature. All data is loaded server-side and filtered client-side.

## Features Overview

1. **Toggle Global Bruto/Neto** — Switch between net and gross values across the entire dashboard
2. **Comparison Enhancements** — Totals row, aggregate chart, Excel export
3. **Dashboard Export** — Export dashboard data to Excel
4. **Report Builder** — Predefined + custom reports with Excel export

---

## 1. Toggle Global Bruto/Neto

### New Store

**File:** `src/lib/stores/value-mode.ts`

```typescript
type ValueMode = 'net' | 'gross';
```

- Svelte writable store, default `'net'`
- Persisted in localStorage (key: `cmp-value-mode`)
- Exposes a derived `valueField` that maps to `'net_value' | 'gross_value'`

### UI

- Toggle switch in the dashboard header area, visible across all tabs (Resumen, Comparacion, Reportes)
- Label: "Neto" / "Bruto" — visually clear which is active
- Placed next to the country selector for consistency

### Impact on Existing Code

**`src/lib/utils/invoice-analytics.ts`:**
- `groupByClient()`, `groupByAgency()`, `groupByChannel()` — add parameter `valueField: 'net_value' | 'gross_value'` (default `'net_value'` for backwards compatibility)
- All three currently hardcode `inv.net_value`; change to `inv[valueField]`

**`src/routes/(app)/dashboard/+page.svelte`:**
- Subscribe to `value-mode` store
- KPIs: When mode is `'net'`, show `totalNet` as primary. When `'gross'`, compute and show `totalGross`. The other KPIs (facturas, clientes activos, spots, YoY growth) remain unchanged except YoY growth which should use the selected value field.
- Chart titles: Dynamic — "Venta Neta" / "Venta Bruta"
- All chart data computations use the selected value field instead of hardcoding `net_value`
- Monthly trend chart: Show **one series only** (the selected one), not both

**`src/lib/components/dashboard/PeriodComparison.svelte`:**
- Subscribe to `value-mode` store
- `totalA`, `totalB`, `totalDiff`, `totalDiffPct` — use selected value field
- `getGrouped()` — pass `valueField` to grouping functions
- KPI card labels update dynamically

---

## 2. Comparison Enhancements

All changes in `src/lib/components/dashboard/PeriodComparison.svelte`.

### 2a. Totals Row in Delta Table

- Add `<tfoot>` to the delta table
- Row content: "Total general" | sum(valueA) | sum(valueB) | sum(delta) | computed deltaPct from totals
- Style: `font-bold bg-muted/50 border-t-2`
- The totals will match the KPI cards above (serves as cross-validation)

### 2b. Aggregate Totals Chart

- New ECharts bar chart placed **above** the existing "Comparacion por Dimension" chart
- Two vertical bars: Periodo A total vs Periodo B total
- Colors: indigo (#6366f1) for A, amber (#f59e0b) for B (consistent with existing)
- Delta shown as a label between/above the bars
- Height: ~200px, compact
- Title: "Total Comparativo"

### 2c. Export to Excel from Comparison

- "Exportar Excel" button in the comparison section header
- Uses SheetJS (`xlsx` package, already in project)
- Generated client-side, triggers browser download
- Filename: `Comparacion_{PeriodA}_{PeriodB}_{country}.xlsx`

**Workbook structure:**
- Sheet 1 "Resumen": 4 rows — Total Periodo A, Total Periodo B, Diferencia, Variacion %
- Sheet 2 "Detalle por {dimension}": Full delta table with all columns (dimension name, Period A, Period B, Diferencia, %) + Total general footer row

---

## 3. Dashboard Export

### UI

- "Exportar Excel" button in the dashboard header (Resumen tab)
- Same approach: SheetJS client-side, browser download
- Filename: `Dashboard_{country}_{dateFrom}_{dateTo}.xlsx`

### Workbook Structure

| Sheet | Content |
|-------|---------|
| "KPIs" | 6 rows: Total Bruto/Neto, Facturas, Clientes Activos, Spots, Crecimiento YoY |
| "Top Clientes" | Top 10 clients: Name, Value |
| "Por Canal" | Channel distribution: Channel, Value, % |
| "Por Agencia" | Agency distribution: Agency, Value |
| "Tendencia Mensual" | Monthly data: Month, Value (selected mode) |
| "Trimestral" | Quarterly data: Quarter, Value |

### Implementation

New utility function in `src/lib/utils/excel-export.ts`:

```typescript
function exportDashboardToExcel(data: DashboardExportData, country: string): void
function exportComparisonToExcel(data: ComparisonExportData, country: string): void
```

These functions build the workbook with `XLSX.utils.json_to_sheet()`, apply basic formatting (column widths, number formats), and trigger download via `XLSX.writeFile()`.

---

## 4. Report Builder

### New Route

- **Page:** `src/routes/(app)/reportes/+page.svelte`
- **Server load:** `src/routes/(app)/reportes/+page.server.ts` — same data as dashboard (all invoices, clients, agencies)
- **Sidebar entry:** New "Reportes" item in the app navigation

### Layout

Two-zone layout:
- **Config panel** (top or collapsible sidebar): Report configuration controls
- **Results area** (main): AG Grid table with the generated report

### Report Configuration

```typescript
interface ReportConfig {
  rows: 'client' | 'agency' | 'channel';
  columns: 'none' | 'months' | 'quarters';
  metric: 'net_value' | 'gross_value' | 'spot_count';
  filters: {
    year: number;
    monthFrom?: number;  // 1-12
    monthTo?: number;    // 1-12
    clientIds?: string[];
    agencyIds?: string[];
    channels?: string[];
  };
}
```

**UI Controls:**

| Control | Type | Options |
|---------|------|---------|
| Filas | Button group (3 options) | Cliente, Agencia, Canal |
| Columnas | Button group (3 options) | Ninguno, Meses, Trimestres |
| Metrica | Button group (3 options) | Neto, Bruto, Spots |
| Ano | Select | Last 5 years |
| Mes desde/hasta | MonthPicker (reuse existing) | Optional range within year |
| Clientes | MultiSelect (reuse existing) | Searchable |
| Agencias | MultiSelect (reuse existing) | Searchable |
| Canales | MultiSelect (reuse existing) | — |

### Output Modes

**Mode: Columns = "Ninguno" (simple summary)**

| {Dimension} | {Metric} |
|-------------|----------|
| Item 1 | $XXX |
| Item 2 | $XXX |
| **Total general** | **$XXX** |

**Mode: Columns = "Meses"**

| {Dimension} | Enero | Febrero | ... | Diciembre | Total general |
|-------------|-------|---------|-----|-----------|---------------|
| Item 1 | $X | $X | ... | $X | $XXX |
| Item 2 | $X | $X | ... | $X | $XXX |
| **Total general** | **$X** | **$X** | ... | **$X** | **$XXX** |

**Mode: Columns = "Trimestres"**

| {Dimension} | Q1 | Q2 | Q3 | Q4 | Total general |
|-------------|----|----|----|----|---------------|
| Item 1 | $X | $X | $X | $X | $XXX |
| **Total general** | **$X** | **$X** | **$X** | **$X** | **$XXX** |

### AG Grid Configuration

- Column definitions generated dynamically from `ReportConfig`
- First column (dimension name): pinned left, sortable
- Value columns: right-aligned, formatted with `formatCurrency()` or `formatNumber()` depending on metric
- Pinned bottom row for "Total general" (AG Grid's `pinnedBottomRowData`)
- Built-in sorting on any column
- Built-in column resize

### Export to Excel

- Button "Exportar Excel" above the grid
- Uses SheetJS (`xlsx` package, already in project) to export the report data — AG Grid's `exportDataAsExcel()` requires Enterprise license which is not available
- A shared utility function in `excel-export.ts` builds the sheet from the `ReportRow[]` data, applying column widths and number formatting
- Filename: `Reporte_{rows}_{year}_{country}.xlsx`
- Includes the total row

### Presets (Predefined Reports)

Quick-access buttons that load a preset config:

| Preset Name | Rows | Columns | Metric |
|-------------|------|---------|--------|
| "Ventas por Canal" | Canal | Ninguno | Neto |
| "Ventas por Agencia" | Agencia | Ninguno | Neto |
| "Matriz Cliente x Mes" | Cliente | Meses | Neto |
| "Matriz Canal x Mes" | Canal | Meses | Neto |
| "Matriz Agencia x Mes" | Agencia | Meses | Neto |

After loading a preset, the user can modify any parameter. The report regenerates reactively.

### Custom Presets (Save/Load)

- "Guardar como preset" button saves current config to localStorage with a user-provided name
- Saved presets appear alongside the built-in ones
- Delete button on custom presets
- Storage key: `cmp-report-presets`
- Schema: `Array<{ name: string; config: ReportConfig }>`

### Data Processing

**New function in `src/lib/utils/invoice-analytics.ts`:**

```typescript
interface ReportRow {
  name: string;                    // dimension value
  total: number;                   // row total
  periods: Record<string, number>; // dynamic columns keyed by period label (e.g. "Enero", "Q1")
}

function generateReportData(
  invoices: Invoice[],
  config: ReportConfig,
  clientsMap: ClientsMap
): ReportRow[]
```

Logic:
1. Filter invoices by config.filters (year, month range, client/agency/channel)
2. Group by dimension (config.rows)
3. If config.columns !== 'none', sub-group by time period (month or quarter)
4. Sum the metric field (config.metric) for each cell
5. Compute row totals
6. Sort by total descending
7. Return array of ReportRow

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/stores/value-mode.ts` | Bruto/Neto toggle store |
| `src/lib/utils/excel-export.ts` | Dashboard & comparison Excel export functions |
| `src/routes/(app)/reportes/+page.svelte` | Report Builder page |
| `src/routes/(app)/reportes/+page.server.ts` | Server load for reports |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/utils/invoice-analytics.ts` | Add `valueField` param to groupBy functions, add `generateReportData()` |
| `src/routes/(app)/dashboard/+page.svelte` | Toggle UI, dynamic KPIs/charts based on value mode, export button |
| `src/lib/components/dashboard/PeriodComparison.svelte` | Value mode support, totals row, aggregate chart, export button |
| `src/lib/components/Sidebar.svelte` | Add "Reportes" entry |

## Dependencies

No new npm packages needed:
- `xlsx` (SheetJS) — already installed, used for dashboard/comparison export
- `ag-grid-community` + `ag-grid-svelte5` — already installed, used for report builder grid
- `echarts` — already installed, used for new aggregate chart

## Implementation Order

1. Value mode store + toggle UI (foundation for everything else)
2. Update `invoice-analytics.ts` (groupBy functions + generateReportData)
3. Dashboard: wire up value mode to KPIs and charts
4. Comparison: wire up value mode + totals row + aggregate chart
5. Excel export utilities
6. Dashboard export button
7. Comparison export button
8. Report Builder page (route + server load + UI + AG Grid)
9. Report presets (built-in + custom save/load)
