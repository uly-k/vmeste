# Supabase setup

1. Open the Supabase project dashboard.
2. Open `SQL Editor`.
3. Run `migrations/20260531170000_initial_schema.sql`.
4. Run `seed.sql`.
5. Open `Table Editor` and verify that `products`, `product_variants` and
   `product_images` contain the three test products.
6. Open `Storage`, select the public `product-images` bucket and create a
   `products` folder.
7. Upload the product images from the local `media` folder:
   `maika.png`, `bag.png` and `brelok3.png`.
8. Run `migrations/20260531190000_profile_avatars.sql` to create the public
   `avatars` bucket with per-user upload, update and delete policies.
9. Run `migrations/20260531210000_orders_and_admin_crm.sql` to enable secure
   checkout and CRM access.
   If you already ran an earlier copy of that migration, also run
   `migrations/20260531211000_fix_profile_rls.sql`.
10. Assign the first CRM administrator in `SQL Editor`, replacing the email:

```sql
update public.profiles
set is_admin = true
where id = (
  select id
  from auth.users
  where email = 'admin@example.com'
);
```

11. Run `migrations/20260531212000_checkout_pickup_and_images.sql` to add the
    pickup selection and stable product images to order history.
12. Run `migrations/20260531213000_order_status_workflow.sql` to enable safe
    customer cancellation and controlled CRM status transitions.
13. For faster catalog/search/order queries, run this SQL block in `SQL Editor`:

```sql
create extension if not exists pg_trgm;

create index if not exists products_published_name_idx
  on public.products (name)
  where is_published = true;

create index if not exists products_published_name_trgm_idx
  on public.products using gin (name gin_trgm_ops)
  where is_published = true;

create index if not exists product_variants_visible_sizes_idx
  on public.product_variants (product_id, sort_order, size)
  where stock_quantity > 0;

create index if not exists product_images_primary_image_idx
  on public.product_images (product_id, sort_order, created_at);

create index if not exists orders_user_created_idx
  on public.orders (user_id, created_at desc);

create index if not exists orders_status_created_idx
  on public.orders (status, created_at desc);
```

The CRM is available at `admin.html`. Its browser UI is not a security
boundary: access is enforced by Postgres RLS and the `is_admin()` function.

The browser code contains only the public project URL and publishable key.
Never add the database password, `service_role` key or `sb_secret_...` key to
this repository.

## Auth redirect URLs

Open `Authentication` -> `URL Configuration` in Supabase Dashboard.

For local development, add this Redirect URL:

```text
http://127.0.0.1:4173/**
```

When the production domain is known, set `Site URL` to the public HTTPS
address and add the exact account callback:

```text
https://example.com/lk.html
```

Keep the local URL while development continues. Use an exact production URL
instead of a wildcard.
