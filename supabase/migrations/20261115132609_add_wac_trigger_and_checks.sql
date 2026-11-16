/*
# Calcul automatique du CUMP et cohérence des quantités

1. Fonction `compute_wac_cost`
- Calcule le coût unitaire moyen pondéré (CUMP) d'une boisson :
  somme(quantité × prix d'achat) / somme(quantité) sur tous les achats de la boisson
  effectués à une date <= à la date du comptage.
- Retourne 0 si aucun achat.

2. Déclencheur sur `drink_countings`
- Avant chaque insertion ou mise à jour, recalcule `wac_cost` côté serveur
  afin que la commission (30% du bénéfice brut) soit toujours fiable.

3. Cohérence
- Contrainte : la quantité restante ne peut pas dépasser la quantité disponible.

4. Sécurité
- `REVOKE EXECUTE` public sur la fonction (interne, appelée par le déclencheur).
*/

CREATE OR REPLACE FUNCTION compute_wac_cost(p_drink_id uuid, p_date date)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_wac numeric(14,2);
BEGIN
  SELECT ROUND(SUM(quantity * unit_cost) / NULLIF(SUM(quantity), 0), 2)
  INTO v_wac
  FROM drink_purchases
  WHERE drink_id = p_drink_id AND purchase_date <= p_date;

  RETURN COALESCE(v_wac, 0);
END;
$$;

CREATE OR REPLACE FUNCTION set_wac_cost()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.wac_cost := compute_wac_cost(NEW.drink_id, NEW.counting_date);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_wac_cost ON drink_countings;
CREATE TRIGGER trg_set_wac_cost
BEFORE INSERT OR UPDATE OF drink_id, counting_date ON drink_countings
FOR EACH ROW
EXECUTE FUNCTION set_wac_cost();

REVOKE EXECUTE ON FUNCTION compute_wac_cost(uuid, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION set_wac_cost() FROM PUBLIC, anon;

ALTER TABLE drink_countings DROP CONSTRAINT IF EXISTS chk_remaining_le_available;
ALTER TABLE drink_countings
ADD CONSTRAINT chk_remaining_le_available CHECK (remaining_qty <= available_qty);
