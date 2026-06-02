# Database migrations

The live Supabase database has historically drifted behind the committed
migrations in `supabase/migrations/`. To avoid tracking what's applied piecemeal,
there is a single idempotent sync script:

## One-shot sync

Run **[`supabase/consolidated_sync.sql`](supabase/consolidated_sync.sql)** once in
the Supabase **SQL Editor**. It's safe to re-run — every statement uses
`IF NOT EXISTS` / `DROP POLICY IF EXISTS`, so you don't need to know what's
already applied. It ends with `NOTIFY pgrst, 'reload schema';` so the API picks
up new tables/columns immediately.

### What it covers (restaurant variance pivot)
| # | Object | Purpose |
|---|--------|---------|
| 0 | `units_of_measure`, `recipes`, `recipe_ingredients` (create-if-missing + backfill every column) | Repairs drifted core tables; fixes 400s on recipe create / ingredient queries |
| 1 | `inventory_folders` columns (`type`, `address`, `phone`, `manager_name`, `is_active`) | Restaurant/warehouse/generic locations |
| 2 | `units_of_measure.category` (+ safe defaults on legacy cols) | App sorts/filters units by category |
| 3 | `inventory_items.usage_unit_id` | Canonical usage unit; `unit_cost` is per this unit |
| 4 | `orders.location_id` | Attribute purchases to a location/period |
| 5 | `variance_periods` | Period = location + date range |
| 6 | `menu_item_sales` | Imported POS sales rows |
| 7 | `pos_item_mappings` | Saved POS-name → recipe mappings |
| 8 | `inventory_counts` | Beginning/ending physical counts |

## Verify

```sql
select 'folders.type' as check, count(*) from information_schema.columns
  where table_schema='public' and table_name='inventory_folders' and column_name='type'
union all select 'uom.category', count(*) from information_schema.columns
  where table_schema='public' and table_name='units_of_measure' and column_name='category'
union all select 'items.usage_unit_id', count(*) from information_schema.columns
  where table_schema='public' and table_name='inventory_items' and column_name='usage_unit_id'
union all select 'orders.location_id', count(*) from information_schema.columns
  where table_schema='public' and table_name='orders' and column_name='location_id'
union all select 'variance tables', count(*) from information_schema.tables
  where table_schema='public' and table_name in
  ('variance_periods','menu_item_sales','pos_item_mappings','inventory_counts')
union all select 'recipe_ingredients.organization_id', count(*) from information_schema.columns
  where table_schema='public' and table_name='recipe_ingredients' and column_name='organization_id'
union all select 'recipes.output_unit_id', count(*) from information_schema.columns
  where table_schema='public' and table_name='recipes' and column_name='output_unit_id';
```

Expect `1, 1, 1, 1, 4, 1, 1`.

> Note: assumes the `uuid-ossp` extension is enabled (existing tables use
> `uuid_generate_v4()`). If needed: `create extension if not exists "uuid-ossp";`
