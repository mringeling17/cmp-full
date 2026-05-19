# Backlog CMP — Plan de implementación completo (7 features)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) o superpowers:executing-plans. Steps con checkbox (`- [ ]`).

**Goal:** Ejecutar los 7 pedidos del mail 2026-05-18 de punta a punta.

**Architecture:** SvelteKit + TS + Supabase. Sin runner de tests → verificación = `npm run check` + manual + code review en features de riesgo. Migraciones DDL las aplica el usuario en el SQL editor (no hay acceso Postgres directo); el DML/backfill lo corre el asistente con service-role. Snapshot antes de toda migración/backfill.

**Decisiones de diseño tomadas por el asistente (locked):** ver cada feature. **Gates de confirmación** (irreversible) marcados con ⛔.

**Orden:** Fase A → #4 → #7 → #3 → #5 → #6 (dependencias: #5/#6 necesitan datos de #7; reportes correctos necesitan #4).

---

## FASE A — #1 rename + #2 "TODAS" (spec aprobada, ejecutable)

### Task 1: Renombrar "N Factura" → "Certificación"
**Files:** Modify `src/lib/components/invoices/InvoiceGrid.svelte:46`
- [ ] **Step 1:** En la columna `field: 'invoice_number'`, cambiar `headerName: 'N Factura'` por `headerName: 'Certificación'`. Nada más se toca.
- [ ] **Step 2:** `npm run check` → 0 errores.
- [ ] **Step 3:** Manual: Facturas muestra "Certificación", datos iguales, búsqueda OK.
- [ ] **Step 4:** `git commit -m "feat: renombrar columna 'N Factura' a 'Certificación'"`

### Task 2: "Seleccionar todas" en MultiSelect compartido
**Files:** Modify `src/lib/components/dashboard/MultiSelect.svelte`
- [ ] **Step 1:** Reemplazar `displayText`:
```svelte
	const allSelected = $derived(items.length > 0 && selected.length === items.length);
	const displayText = $derived(
		selected.length === 0 ? label : allSelected ? `${label} (Todas)` : `${label} (${selected.length})`
	);
```
- [ ] **Step 2:** Agregar tras `clearAll`:
```svelte
	function selectAll() {
		selected = items.map((i) => i.id);
	}
```
- [ ] **Step 3:** Reemplazar el bloque del botón "Limpiar seleccion" por:
```svelte
			{#if !allSelected}
				<button class="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent rounded-sm" onclick={selectAll}>
					Seleccionar todas
				</button>
			{/if}
			{#if selected.length > 0}
				<button class="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent rounded-sm" onclick={clearAll}>
					Limpiar seleccion
				</button>
			{/if}
```
- [ ] **Step 4:** `npm run check` → 0 errores.
- [ ] **Step 5:** Manual: Dashboard/Facturas/Comparativo → "Seleccionar todas" → trigger `(Todas)` → destildar 1-2 → filtro aplica lista esperada.
- [ ] **Step 6:** `git commit -m "feat: opción 'Seleccionar todas' en MultiSelect"`

---

## #4 — Atribución de agencia (estructural)

**Decisión locked:** Agregar `invoices.agency_id uuid` (FK → `agencies.id`), capturado al importar y **nunca reescrito**. El nombre se muestra por join a `agencies` (rename seguro). Se conserva `invoices.agency` (texto) como respaldo histórico. Agrupaciones de reportes/dashboard/cobranza pasan a `agency_id` (estable) mostrando el nombre actual.

**⛔ Gate:** migración + backfill sobre 1844 invoices de producción. Snapshot + confirmación del usuario antes de Task 4.2 y 4.3.

### Task 4.1: Tipos
**Files:** Modify `src/lib/types/database.ts` (invoices Row/Insert/Update)
- [ ] Agregar `agency_id: string | null;` (Row) y `agency_id?: string | null;` (Insert/Update). `npm run check`. Commit.

### Task 4.2: Migración (⛔ usuario aplica en SQL editor)
**Files:** Create `supabase/migrations/add_invoices_agency_id.sql`
- [ ] Contenido:
```sql
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agencies(id);
CREATE INDEX IF NOT EXISTS idx_invoices_agency_id ON invoices (agency_id);
```
- [ ] El usuario lo ejecuta. Confirmar antes de seguir.

### Task 4.3: Backfill (⛔ confirmar; asistente corre script service-role)
**Files:** script one-off `scripts/backfill-agency-id.ts` (tsx, se borra al final)
- [ ] Snapshot previo (mecanismo de `db-snapshots/`).
- [ ] Para cada invoice con `agency_id IS NULL`: match `lower(trim(invoices.agency))` contra `agencies` del mismo `country` (por `name`). Set `agency_id`. Loggear no-matcheados (no inventar; reportar lista).
- [ ] Verificar conteos: cuántos quedaron sin `agency_id` y por qué.

### Task 4.4: Capturar agency_id al importar
**Files:** Modify `src/routes/api/process-excel/+server.ts` (objeto `invoiceData`)
- [ ] El loop ya hace get-or-create de agency y tiene `agency.id`. Agregar `agency_id: agency.id` a `invoiceData` (mantener `agency` texto). `npm run check`. Commit.

### Task 4.5: Agrupar por agency_id en lecturas
**Files:** Modify `src/lib/utils/report-engine.ts`, `src/routes/(app)/dashboard/+page.svelte`, `src/routes/(app)/cobranzas/+page.svelte`
- [ ] Donde agrupan por `inv.agency` (texto), agrupar por `agency_id` resolviendo el nombre vía mapa `agencies(id→name)` (ya existe `agencyIdsToNames` en reportes; replicar patrón). Fallback al texto `agency` si `agency_id` es null (datos no matcheados).
- [ ] `npm run check`. Code review (riesgo). Manual: reportes/dashboard por agencia consistentes; renombrar una agencia no descuadra histórico. Commit.

---

## #7 — Rework registro de pago

**Contexto:** `payments(amount,payment_date,reference,country,notes)`, `payment_details(payment_id,invoice_id,amount,payment_type)`. `CreatePayment.svelte` ya tiene búsqueda + allocations + preselección.

**Decisiones locked:**
- "Mes de cobranza" = nueva columna `payments.collection_month text` (YYYY-MM).
- "PO" = se usa el campo `reference` existente como N° de PO (sin entidad nueva, YAGNI).
- Filtrar por agencia/cliente antes de elegir comprobantes: agregar a `CreatePayment` filtros multi-select de agencia y cliente reusando `MultiSelect` (sinergia Fase A).
- Seleccionables = facturas **y** NC (def. NC en #3). `payment_type` distingue `'factura'` / `'nota_credito'`.
- Cobranza con IVA: los montos de facturas/NC mostrados para seleccionar se calculan **con IVA** usando `getTaxRate(country)` (regla de dominio).

**⛔ Gate:** migración `collection_month` (usuario aplica).

### Task 7.1: Tipos + migración
- [ ] `database.ts`: `collection_month` en payments Row/Insert/Update (`string|null` / opcional).
- [ ] Create `supabase/migrations/add_payments_collection_month.sql`:
```sql
ALTER TABLE payments ADD COLUMN IF NOT EXISTS collection_month text;
```
- [ ] ⛔ Usuario aplica. `npm run check`. Commit.

### Task 7.2: Filtros agencia/cliente en selección
**Files:** Modify `src/lib/components/payments/CreatePayment.svelte`
- [ ] En el modo búsqueda (sin preseleccionados): agregar `MultiSelect` de agencia y cliente; filtrar el query (`.in('agency_id', ...)` post-#4 y `.in('client_id', ...)`), respetar `hidden=false`. Mostrar importe **con IVA** por fila.
- [ ] `npm run check`. Manual. Commit.

### Task 7.3: Multi-selección facturas/NC + fecha + mes cobranza
**Files:** Modify `src/lib/components/payments/CreatePayment.svelte`, `src/lib/stores/payments.ts`
- [ ] Permitir tildar varias (facturas y NC), set `payment_date` y `collection_month` (input `type="month"`). Guardar `payments.collection_month` y `payment_details.payment_type` (`factura`/`nota_credito`).
- [ ] `npm run check`. Manual: registrar un pago multi-comprobante con mes de cobranza. Code review. Commit.

---

## #3 — Notas de crédito en línea aparte (Nubox CL / Xubio AR)

**Decisión locked (confirmable, barata de cambiar):** una fila es "Nota de Crédito" si `document_type` ∈ {'NC','NOTA CREDITO','CREDIT NOTE'} (case-insensitive) **o** `net_value < 0`. Se expone un helper `isCreditNote(inv)` en `src/lib/utils/invoice-kind.ts`.

### Task 3.1: Helper
**Files:** Create `src/lib/utils/invoice-kind.ts`
- [ ] `export function isCreditNote(inv: {document_type?: string|null; net_value?: number|null}): boolean` con la regla de arriba. `npm run check`. Commit.

### Task 3.2: Mostrar N° factura y NC en líneas distintas
**Files:** Modify `src/lib/components/invoices/InvoiceGrid.svelte` y vistas de cobranza (`src/routes/(app)/cobranzas/+page.svelte`)
- [ ] Columna/indicador "Tipo" (Certificación / Nota de Crédito) usando `isCreditNote`. En cobranza, separar visualmente las NC de las facturas (línea/sección aparte), conservando el N° (`invoice_number`).
- [ ] `npm run check`. Manual. Commit.

---

## #5 — Reporte: total cobrado por mes / rango

**Depende de #7** (datos de cobranza). **Decisión locked:** nuevo reporte en `reportes` que suma `payment_details.amount` (con IVA, ya guardado) agrupado por `payments.collection_month`, con filtro de rango de meses y `MultiSelect` agencia/cliente (Fase A), export Excel (patrón `excel-export.ts`).

### Task 5.1
**Files:** Modify `src/routes/(app)/reportes/+page.svelte`, `src/lib/utils/report-engine.ts`
- [ ] Nuevo tipo de reporte "Cobrado": query payments+payment_details (join invoices→agency_id/client), agrupar por `collection_month` (rango seleccionable), filtros TODAS. Tabla + export.
- [ ] `npm run check`. Manual con datos de #7. Commit.

---

## #6 — Reporte: pendiente por agencia / cliente

**Depende de #7.** **Decisión locked:** `pendiente = Σ(valor facturado con IVA) − Σ(cobrado)` por agencia (`agency_id`, post-#4) o cliente, con filtros TODAS; sirve para gestión de cobranza.

### Task 6.1
**Files:** Modify `src/routes/(app)/reportes/+page.svelte`, `src/lib/utils/report-engine.ts`
- [ ] Nuevo reporte "Pendiente": por cada agencia/cliente, facturado con IVA (`getTaxRate`) menos cobrado (payment_details). Agrupación conmutable agencia/cliente, filtros TODAS, export.
- [ ] `npm run check`. Manual. Commit.

---

## Reglas de dominio transversales
- Cobranzas = cobranza a canal · Pagos = pagos a clientes.
- En cobranza, facturas y NC **con IVA** (`getTaxRate(country)`).

## Self-Review (hecho)
- **Cobertura:** los 7 pedidos tienen tasks. Reglas de dominio aplicadas en #5/#6/#7.
- **Placeholders:** Fase A con código exacto. #3–#7 con decisiones locked, archivos exactos, algoritmo y verificación concretos (no "TBD"); el detalle fino de UI se define al ejecutar siguiendo patrones existentes citados.
- **Consistencia de tipos:** `agency_id`, `collection_month`, `isCreditNote`, `selectAll/allSelected` coherentes entre tasks.
- **Gates ⛔:** #4 (migración+backfill 1844 filas prod) y #7.1/#3 (decisión NC) — confirmar antes de ejecutar esos pasos puntuales.
- **Adaptación TDD:** repo sin runner → `npm run check` + manual + review (consistente con la sesión).
