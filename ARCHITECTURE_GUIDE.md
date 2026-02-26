# PricingPlus Architecture (MVP)

## Runtime model
- Static frontend app (HTML/CSS/JS).
- Local persistence via IndexedDB only.
- Pure computation layer for pricing formulas.

## Main entities
1. Project
   - Global pricing settings, fixed costs, locale/currency, expected monthly volume.
2. Material (Materials Library)
   - `id`, `name_ar`, `name_en`, `unitType`, `pricingMode`, pricing fields, default waste.
3. Product
   - Product metadata, labor/energy inputs.
   - `recipe[]`: links to materials by `materialId` + `qtyPerUnit`.
   - `variants[]`: sales forms (`unitsPerVariant`, packaging cost, optional pricing overrides).

## Layers
- `src/main.js`
  - UI orchestration and state management.
- `src/engine/pricingEngine.js`
  - Pure functions for recipe cost and variant pricing outputs.
- `src/storage/storageProvider.js`
  - Persistence abstraction.
- `src/storage/indexedDbProvider.js`
  - IndexedDB implementation + legacy migration.
- `src/services/exportService.js`
  - CSV/XLSX/PDF generation.

## IndexedDB stores
- `project`: singleton settings record.
- `materials`: materials library records.
- `products`: products with recipe + variants embedded.

## Migration behavior (v2)
- Legacy product materials (inline text rows or old per-product materials rows) are migrated to `materials` library.
- Dedup by normalized material name.
- Recipe links are created with `materialId`.
- Legacy unit costs map to `perUnit` material pricing.
- Default recipe qty fallback = `1` to preserve calculation continuity.

## Non-goals
- Inventory stock quantities.
- Purchase orders.
- ERP/accounting modules.
