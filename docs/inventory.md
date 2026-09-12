# Inventory — Structure & Operating Model

This document explains how inventory works in the TMS: the warehouse model, how stock
enters the system, the movement ledger, the underlying database schema, the API surface,
and how it looks in the UI.

> Data numbers in §8 are a snapshot taken on **2026-09-11** and will change over time.

---

## 1. Conceptual Overview

Inventory is **project-scoped** and **warehouse-aware**. Three rules matter:

1. **Stock enters only from a PO + its purchase invoice.** A PO must be *approved* and its
   *purchase invoice uploaded* before items appear in stock. VWO approval alone **never**
   creates inventory (a VWO only becomes stock if it is tied to a PO that later gets an invoice).
2. **Every inventory row belongs to exactly one warehouse.** Each project has two virtual
   warehouses where its stock can sit: an area **inside VEPL HO** and its **project location**
   (client site / ministry location).
3. **Outward movement happens only through business documents.** Stock moves out of a
   warehouse via **Sale Invoice** (sale), and transfers between warehouses happen via
   **Delivery Challan / Stock Voucher**. These are planned; until then there is **no manual
   transfer** action (the old manual transfer was removed).

The warehouse is chosen automatically at entry time from the PO's shipping address (see §3).

---

## 2. Warehouse Model

| Type               | Meaning                                                            | Count (per project) |
|--------------------|--------------------------------------------------------------------|---------------------|
| `ho_main`          | The central VEPL store at the HO (**"VEPL New Delhi HO"**, warehouse #1, project 151). Goods stored centrally, not yet assigned to a project store. | 1 global             |
| `ho_sub`           | A project's own store **inside VEPL HO** (nested row whose `parent_id` → `ho_main`). Goods belong to the project but physical stock sits at HO. | 1 per project        |
| `project_location` | The project's store **at the client location** / ministry site.    | 1 per project        |

Both `ho_sub` and `project_location` are named using the target project's **project code**
(e.g. `AC/2627/SPDGI PVT LTD/Uttar Pradesh/TAC/COM/0134`), so they are easy to recognize
in listings. They are "virtual" warehouses: inventory rows are tagged with the warehouse and
the physical reality is up to the stores team.

```
                     VEPL HO Store (ho_main)  #1  "VEPL New Delhi HO"
                                 │
        ┌────────────────────────┼─────────────────────────┐
        ▼                        ▼                         ▼
  ho_sub (Project 0134)    ho_sub (Project 0217)     ho_sub (Project 0906)
  "AC/2627/…/0134"         "DC/2526/…/0217"          "AC/2425/…/0906"
        │                        │                         │
        ▼                        ▼                         ▼
  project_location         project_location          project_location
  (client site)            (client site)             (client site)
```

- Every project that holds stock gets **two** warehouses: one `ho_sub` (parent → `ho_main`)
  and one `project_location`. → **1 + (2 × number of stocked projects)** rows.
- `ho_main` is the only warehouse that is **not** project-scoped.

Reported counts (2026-09-11): **121 warehouses = 1 `ho_main` + 60 projects × 2**.

---

## 3. How Stock Enters (Entry Flow)

```
 PO raised ─────────────► PO approved                        (approval = metadata only, NO stock)
                              │
                              ▼
                     Purchase invoice uploaded
                              │  (transaction)
                              ▼
                  ┌───────────────────────────┐
                  │  materialize PO inventory │
                  │  find / create inventory  │
                  │  row for (project,        │
                  │  warehouse, item, hsn,    │
                  │  price)                   │
                  └────────────┬──────────────┘
                               │
                               ▼
                  resolve entry warehouse (by shipping address)
                               │
                               ▼
                  INSERT inventory_movements
                  movement_type = 'po_approval'   qty = +full PO qty
```

### Warehouse routing rules

At materialization, the entry warehouse is chosen by the PO's shipping parties:

| Condition                                                          | Warehouse           |
|--------------------------------------------------------------------|---------------------|
| `project_id == 151` (VEPL HO project itself)                       | `ho_main`           |
| Shipping address/name **matches VEPL / HO addresses** (own address) | `ho_sub` (for the project) |
| Anything else                                                      | `project_location`  |

"Own address" detection uses regex patterns against the ship-to address / name:

- `volks energ`, `vepl`, `mohan co-op(erative)`, `b1/d8`, `mohan estate`

So a PO shipping goods to the HO raises the project's stock inside VEPL HO (`ho_sub`);
a PO shipping to a ministry/site raises it at `project_location`.

> **VWO-only invoices never materialize.** Purchase invoices belonging to a vendor work
> order (with a `vendor_work_order_id` and no PO) are recorded but do not create stock.

---

## 4. The Movement Ledger

Every change to stock is an immutable row in `inventory_movements`. The **inventory table is
a projection**; the ledger is the source of truth.

| `movement_type`   | Qty sign | Meaning                                                    | Status          |
|-------------------|----------|------------------------------------------------------------|-----------------|
| `po_approval`     | `+`      | PO stock received (invoice uploaded)                       | ✔ implemented   |
| `transfer_in`     | `+`      | Stock transferred **into** a warehouse                     | ✔ legacy only   |
| `transfer_out`    | `−`      | Stock transferred **out of** a warehouse                   | ✔ legacy only   |
| `sale_bill`       | `−`      | Sale Invoice — stock sold / released from warehouse        | 🔶 planned       |
| `dc_transfer`     |          | Delivery Challan — warehouse-to-warehouse transfer         | 🔶 planned       |
| `stock_voucher`   |          | Stock Voucher — adjustment / write-off transfer            | 🔶 planned       |

- Outward movements store **negative** qty; `inventory.remaining_qty` is maintained as the sum
  of all movements for that row.
- Each movement also records `project_id`, the warehouse to/from, an optional `po_id`, the
  creator (`created_by`), and a timestamp — giving full auditability.

Example ledger entries:

```
 id │ inventory │ project │ movement_type  │ qty    │ warehouse │ po_id │
────┼───────────┼─────────┼────────────────┼────────┼───────────┼───────┤
 900│      502  │   213   │ po_approval    │ 1500.0 │ ho_sub    │  812  │
 902│      510  │   213   │ po_approval    │   10.0 │ ho_sub    │  812  │
 220│     …     │   …     │ transfer_out   │  −2.0  │ proj_loc  │   –   │
```

---

## 5. Database Model (Technical)

### `warehouses`

| Column        | Type                          | Notes                                    |
|---------------|-------------------------------|------------------------------------------|
| `id`          | `bigserial` PK                | #1 = `ho_main` ("VEPL New Delhi HO")     |
| `name`        | `varchar(255)`                | `ho_sub`/`project_location` = project code |
| `type`        | `varchar`                     | `ho_main` \| `ho_sub` \| `project_location` |
| `project_id`  | `bigint`                      | null for `ho_main`                       |
| `parent_id`   | `bigint` → `warehouses.id`    | `ho_sub` → `ho_main`                     |
| timestamps    | `timestamp`                   | `created_at`, `updated_at`               |

### `inventory`

| Column           | Type                                              | Notes                         |
|------------------|---------------------------------------------------|-------------------------------|
| `id`             | `bigserial` PK                                    |                               |
| `project_id`     | `bigint`                                          | project this stock belongs to |
| `warehouse_id`   | `bigint` → `warehouses.id`                        | **every row has one**         |
| `item_name`      | `varchar(255)`                                    |                               |
| `hsn`            | `varchar(100)`                                    |                               |
| `price`          | `numeric(20,2)`                                   |                               |
| `qty`            | `numeric(20,2)`                                   | total received                |
| `remaining_qty`  | `numeric(20,2)`                                   | current available             |
| `line_item`      | `integer`                                         | PO line reference              |
| timestamps       | `timestamp`                                       |                               |

**Merge / uniqueness key:** `(project_id, warehouse_id, item_name, COALESCE(hsn,''), price)`.
New stock that matches these five fields joins the existing row instead of creating a
duplicate line — the same item bought at the same price in two POs keeps **one** inventory row.

### `inventory_movements` (ledger)

| Column            | Notes                                          |
|-------------------|------------------------------------------------|
| `id`              | PK                                             |
| `inventory_id`    | → `inventory.id` (nullable, `ON DELETE SET NULL`) |
| `project_id`      |                                                |
| `movement_type`   | see §4                                         |
| `reference_id`    | generic document reference                     |
| `warehouse_id`    | affected warehouse                             |
| `from_project_id` / `to_project_id` | transfer source/target projects |
| `from_warehouse_id` / `to_warehouse_id` | transfer source/target stores |
| `po_id`           | → PO that created stock                        |
| `qty`             | signed (+ in / − out)                          |
| `price`, `item_name`, `hsn` | snapshot at movement time              |
| `created_by`, `created_at` | audit                                      |

### Relationships

```
┌─────────────────┐              ┌───────────────────┐
│   warehouses    │              │  purchase_orders  │
│ id, name, type, │              │ id, po_number     │
│ project_id,     │              └─────────┬─────────┘
│ parent_id       │                        │ (po_id)
└────────┬────────┘                        ▼
         │                     ┌────────────────────────┐
         │ warehouse_id        │  inventory_movements   │  (ledger)
         │  (also from/        │  movement_type, qty,   │──────► inventory_id
         └────────────────────►│  from/to warehouses    │
                               └────────────┬───────────┘
                                            │ inventory_id
                                            ▼
                               ┌────────────────────────┐
                               │       inventory        │
                               │  stock per warehouse   │
                               └────────────────────────┘
```

Indexes cover `project_id`, `warehouse_id`, `inventory_id`, `movement_type`,
`from/to_warehouse_id`, and `po_number`.

---

## 6. API Surface

All endpoints live under `/inventory` (controller: `InventoryController`).

| Endpoint                                      | Purpose                              | Notable params                          |
|-----------------------------------------------|--------------------------------------|------------------------------------------|
| `GET /inventory/project/:projectId`           | Stock for one project                 | `includeZero`, `warehouseType`           |
| `GET /inventory/all`                          | Global item list across projects      | `includeZero`                            |
| `GET /inventory/projects`                     | Project summaries (card list)         | `page`, `limit`, `search`                |
| `GET /inventory/movements`                    | Ledger movement feed                  | `projectId`, `inventoryId`               |

- `warehouseType` values: `all` (default), `ho_main`, `ho_sub`, `ho_depot` (both HO stores),
  `project_location`.
- Each item carries `id, projectId, warehouseId, warehouseType, warehouseName, itemName, hsn,
  price, qty, remainingQty, sourcePoNumber`.

---

## 7. How It Looks in the App (UI)

The standalone Inventory page lives under **Accounts → Inventory**. (It was moved out of
Operations; a compact stock section also still renders inside **Operations → Project Dashboard**.)

### All Inventory — project cards

```
┌──────────────────────────────────────────────────────────────────────────┐
│ All Inventory                    (60 projects)             🔍 Search…    │
│ Project-wise inventory across all projects.                            │
│                                                                          │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌─────────────┐ │
│  │ AC/2627/NPI/Uttarakhand│  │ DC/2526/PGCIL/NiCd/…   │  │ AC/2425/…   │ │
│  │ AC/2627/NPI/…/652A     │  │ DC/2526/…/7103   ╋  👁 │  │ …       ╋ 👁│ │
│  │ ┌─────┬─────┬────────┐ │  │ …                     │  │ …            │ │
│  │ │ 12  │ 4   │ 43     │ │  │                        │  │               │ │
│  │ │ PO  │ VWO │ Items  │ │  │                        │  │               │ │
│  │ └─────┴─────┴────────┘ │  │                        │  │               │ │
│  └────────────────────────┘  └────────────────────────┘  └─────────────┘ │
│ … cards continue, then pagination footer (shown per page selector) …      │
└──────────────────────────────────────────────────────────────────────────┘
```

Clicking a card opens that project's inventory table.

### Project inventory — item table

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Project Inventory                                       [Show Zero]      │
│ 6 items in stock · Total: ₹62,400.00                                      │
│ ┌──────────┬─────────────┬───────────────┬───────────┬──────────────────┐│
│ │  [All Warehouses]  [At Project Location]  [In VEPL HO]                ││
│ ├──────────┬─────────────┬───────────────┬───────────┬──────────────────┤│
│ │ Item     │ HSN  │ PO No │ Warehouse │ Qty │ Avail │ Price  │ Amount  ││
│ │ Elmer PV ┆ 9021 │ …PO0218│ HO (Proj) │ 500 │  500  │ 42.00  │ 21,000  ││
│ │ HDGI     ┆ ….   │ …PO0072│ HO (Proj) │ 300 │  300  │ …      │ …       ││
│ │ Cable Tr+│      │        │           │     │       │        │         ││
│ └──────────┴──────┴─────────┴───────────┴─────┴───────┴────────┴─────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

- **Warehouse tabs** filter the view: All / At Project Location / In VEPL HO.
- Columns: **Item** (wrapped, sanitized), **HSN**, **PO No.** (from the source PO of the
  `po_approval` movement), **Warehouse**, **Qty**, **Available**, **Price**, **Amount**
  (qty × price), plus a running **Total** in the header.
- "Show Zero" toggles items with zero remaining qty.

---

## 8. Current Snapshot (as of 2026-09-11)

| Metric            | Value                                    |
|-------------------|------------------------------------------|
| Inventory rows    | **211** (2 `ho_main` · 77 `ho_sub` · 132 `project_location`) |
| Warehouses        | **121** (1 `ho_main` + 60 projects × 2)  |
| Movements         | **220** (218 `po_approval`, 1 `transfer_in`, 1 `transfer_out` legacy) |
| Total received qty| 17,900.83                                |
| Total available   | 17,900.83                                |
| Orphans / nulls   | 0 rows without a warehouse, 0 orphan rows |

> The two `project_location` units that were manually transferred to HO in the past show as
> `qty 12,099.58 / remaining 12,097.58` — the ledger keeps the `transfer_in`/`transfer_out` pair.

---

## 9. Code Map

| File                                                        | What it does                                         |
|-------------------------------------------------------------|------------------------------------------------------|
| `api/drizzle/0135_add_warehouse_dimension.sql`              | Migration that added `warehouses` + warehouse columns |
| `api/src/db/schemas/operations/warehouses.schema.ts`        | `warehouses` table definition                        |
| `api/src/db/schemas/operations/inventory.schema.ts`         | `inventory` table + merge key                        |
| `api/src/db/schemas/operations/inventory-movements.schema.ts` | ledger table                                      |
| `api/src/modules/operations/inventory/inventory.warehouses.ts` | routing rules, address patterns, HO project      |
| `api/src/modules/operations/inventory/inventory.materialize.ts` | merge/create logic + warehouse resolution        |
| `api/src/modules/operations/inventory/inventory.service.ts`   | queries: project/all/projects/movements              |
| `api/src/modules/operations/inventory/inventory.controller.ts` | REST endpoints                                     |
| `api/src/db/remap-inventory.ts`                             | data-fix script (purged legacy VWO stock, assigned warehouses) |
| `web/src/modules/operations/inventory/pages/InventoryPage.tsx`   | Accounts → Inventory page (cards + per-project) |
| `web/src/modules/operations/inventory/components/InventorySection.tsx` | item table w/ warehouse tabs + PO No |
| `web/src/hooks/api/useInventory.ts` / `web/src/services/api/inventory.api.ts` | frontend data layer |