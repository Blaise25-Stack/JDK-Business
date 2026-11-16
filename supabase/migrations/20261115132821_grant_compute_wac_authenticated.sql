/*
# Autoriser l'application à lire le coût moyen pondéré (CUMP)

1. Sécurité
- GRANT EXECUTE sur `compute_wac_cost(uuid, date)` au rôle `authenticated`
  afin que l'interface puisse afficher/anticiper le coût unitaire moyen pondéré.
- La fonction reste interdite aux rôles `anon` et `PUBLIC`.
*/

GRANT EXECUTE ON FUNCTION compute_wac_cost(uuid, date) TO authenticated;
