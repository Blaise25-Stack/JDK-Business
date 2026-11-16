/*
# Modifier les taux de commission

1. Changements
- `drink_countings` : commission vendeur portée de 30 % à 10 % du bénéfice brut
  (colonnes générées `seller_commission` et `owner_share` recréées).
- `cream_sales` : commission portée de 30 % à 20 % du chiffre d'affaires
  (colonnes générées `commission`, `balance_after`, `expected_amount`, `difference` recréées).

2. Notes
- Ces colonnes sont entièrement calculées : leur recréation ne perd aucune donnée saisie.
- Les montants sont recalculés automatiquement pour toutes les lignes existantes.
*/

ALTER TABLE drink_countings DROP COLUMN IF EXISTS seller_commission;
ALTER TABLE drink_countings DROP COLUMN IF EXISTS owner_share;

ALTER TABLE drink_countings
ADD COLUMN seller_commission numeric(14,2) GENERATED ALWAYS AS (
  ROUND((((available_qty - remaining_qty) * sale_price) - ((available_qty - remaining_qty) * wac_cost)) * 0.10)
) STORED;

ALTER TABLE drink_countings
ADD COLUMN owner_share numeric(14,2) GENERATED ALWAYS AS (
  (((available_qty - remaining_qty) * sale_price) - ((available_qty - remaining_qty) * wac_cost))
  - ROUND((((available_qty - remaining_qty) * sale_price) - ((available_qty - remaining_qty) * wac_cost)) * 0.10)
) STORED;

ALTER TABLE cream_sales DROP COLUMN IF EXISTS commission;
ALTER TABLE cream_sales DROP COLUMN IF EXISTS balance_after;
ALTER TABLE cream_sales DROP COLUMN IF EXISTS expected_amount;
ALTER TABLE cream_sales DROP COLUMN IF EXISTS difference;

ALTER TABLE cream_sales
ADD COLUMN commission numeric(14,2) GENERATED ALWAYS AS (ROUND(total_sales * 0.20)) STORED;

ALTER TABLE cream_sales
ADD COLUMN balance_after numeric(14,2) GENERATED ALWAYS AS (total_sales - ROUND(total_sales * 0.20) - food_allowance) STORED;

ALTER TABLE cream_sales
ADD COLUMN expected_amount numeric(14,2) GENERATED ALWAYS AS (total_sales - ROUND(total_sales * 0.20) - food_allowance) STORED;

ALTER TABLE cream_sales
ADD COLUMN difference numeric(14,2) GENERATED ALWAYS AS (paid_amount - (total_sales - ROUND(total_sales * 0.20) - food_allowance)) STORED;
