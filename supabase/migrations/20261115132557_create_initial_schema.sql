/*
# Création du schéma JDK-Business (boissons et crèmes)

1. Nouvelles tables
- `drinks`: catalogue des boissons (nom).
- `drink_purchases`: achats de boissons (boisson, quantité, prix d'achat, date, montant total généré).
- `drink_countings`: comptage physique journalier par boisson (disponible, restante, vendue calculée, prix de vente, montant attendu, montant versé, CUMP, bénéfice brut, commission 30%, part restante — colonnes générées).
- `cream_sales`: journal quotidien des ventes de crèmes (vendeur, ventes, commission 30%, nourriture, solde, attendu, versé, écart — colonnes générées).

2. Sécurité
- RLS activé sur les 4 tables.
- Policies séparées SELECT/INSERT/UPDATE/DELETE pour `authenticated`.
- GRANTS minimaux pour `authenticated` et `service_role`.

3. Notes
- La devise est le franc congolais (numeric 14,2).
- La colonne générée `sold_qty` = disponible - restante.
- Commission boissons = 30% du bénéfice brut (montant attendu - coût CUMP).
- Commission crèmes = 30% du chiffre d'affaires.
*/

-- =====================
-- TABLES
-- =====================

CREATE TABLE IF NOT EXISTS drinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drink_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drink_id uuid NOT NULL REFERENCES drinks(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric(14,2) NOT NULL CHECK (unit_cost >= 0),
  purchase_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Kinshasa')::date,
  total_amount numeric(14,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drink_countings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drink_id uuid NOT NULL REFERENCES drinks(id) ON DELETE CASCADE,
  counting_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Kinshasa')::date,
  available_qty integer NOT NULL DEFAULT 0 CHECK (available_qty >= 0),
  remaining_qty integer NOT NULL DEFAULT 0 CHECK (remaining_qty >= 0),
  sold_qty integer GENERATED ALWAYS AS (available_qty - remaining_qty) STORED,
  sale_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  amount_expected numeric(14,2) GENERATED ALWAYS AS ((available_qty - remaining_qty) * sale_price) STORED,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  wac_cost numeric(14,2) NOT NULL DEFAULT 0,
  gross_profit numeric(14,2) GENERATED ALWAYS AS (
    ((available_qty - remaining_qty) * sale_price) - ((available_qty - remaining_qty) * wac_cost)
  ) STORED,
  seller_commission numeric(14,2) GENERATED ALWAYS AS (
    ROUND((((available_qty - remaining_qty) * sale_price) - ((available_qty - remaining_qty) * wac_cost)) * 0.30)
  ) STORED,
  owner_share numeric(14,2) GENERATED ALWAYS AS (
    (((available_qty - remaining_qty) * sale_price) - ((available_qty - remaining_qty) * wac_cost))
    - ROUND((((available_qty - remaining_qty) * sale_price) - ((available_qty - remaining_qty) * wac_cost)) * 0.30)
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (drink_id, counting_date)
);

CREATE TABLE IF NOT EXISTS cream_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Kinshasa')::date,
  seller_name text NOT NULL,
  total_sales numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_sales >= 0),
  food_allowance numeric(14,2) NOT NULL DEFAULT 2000 CHECK (food_allowance >= 0),
  commission numeric(14,2) GENERATED ALWAYS AS (ROUND(total_sales * 0.30)) STORED,
  balance_after numeric(14,2) GENERATED ALWAYS AS (total_sales - ROUND(total_sales * 0.30) - food_allowance) STORED,
  expected_amount numeric(14,2) GENERATED ALWAYS AS (total_sales - ROUND(total_sales * 0.30) - food_allowance) STORED,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  difference numeric(14,2) GENERATED ALWAYS AS (paid_amount - (total_sales - ROUND(total_sales * 0.30) - food_allowance)) STORED,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sale_date, seller_name)
);

CREATE INDEX IF NOT EXISTS idx_purchases_date ON drink_purchases (purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_drink ON drink_purchases (drink_id);
CREATE INDEX IF NOT EXISTS idx_countings_date ON drink_countings (counting_date);
CREATE INDEX IF NOT EXISTS idx_cream_sales_date ON cream_sales (sale_date);

-- =====================
-- SÉCURITÉ
-- =====================

ALTER TABLE drinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE drink_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE drink_countings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cream_sales ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON drinks TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON drink_purchases TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON drink_countings TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON cream_sales TO authenticated, service_role;

DROP POLICY IF EXISTS "authenticated_read_drinks" ON drinks;
CREATE POLICY "authenticated_read_drinks" ON drinks FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_drinks" ON drinks;
CREATE POLICY "authenticated_insert_drinks" ON drinks FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_drinks" ON drinks;
CREATE POLICY "authenticated_update_drinks" ON drinks FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_drinks" ON drinks;
CREATE POLICY "authenticated_delete_drinks" ON drinks FOR DELETE
TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_purchases" ON drink_purchases;
CREATE POLICY "authenticated_read_purchases" ON drink_purchases FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_purchases" ON drink_purchases;
CREATE POLICY "authenticated_insert_purchases" ON drink_purchases FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_purchases" ON drink_purchases;
CREATE POLICY "authenticated_update_purchases" ON drink_purchases FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_purchases" ON drink_purchases;
CREATE POLICY "authenticated_delete_purchases" ON drink_purchases FOR DELETE
TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_countings" ON drink_countings;
CREATE POLICY "authenticated_read_countings" ON drink_countings FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_countings" ON drink_countings;
CREATE POLICY "authenticated_insert_countings" ON drink_countings FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_countings" ON drink_countings;
CREATE POLICY "authenticated_update_countings" ON drink_countings FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_countings" ON drink_countings;
CREATE POLICY "authenticated_delete_countings" ON drink_countings FOR DELETE
TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_cream_sales" ON cream_sales;
CREATE POLICY "authenticated_read_cream_sales" ON cream_sales FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_cream_sales" ON cream_sales;
CREATE POLICY "authenticated_insert_cream_sales" ON cream_sales FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_cream_sales" ON cream_sales;
CREATE POLICY "authenticated_update_cream_sales" ON cream_sales FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_cream_sales" ON cream_sales;
CREATE POLICY "authenticated_delete_cream_sales" ON cream_sales FOR DELETE
TO authenticated USING (true);
