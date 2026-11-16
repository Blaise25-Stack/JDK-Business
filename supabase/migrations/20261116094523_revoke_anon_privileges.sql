/*
# Retirer les droits du rôle anon (application réservée aux administrateurs connectés)

1. Sécurité
- REVOKE de tous les privilèges sur les 4 tables au rôle `anon`
  (l'application exige une connexion ; l'interface n'utilise que `authenticated`).
- Les policies `TO authenticated` restent inchangées.
*/

REVOKE ALL ON drinks FROM anon;
REVOKE ALL ON drink_purchases FROM anon;
REVOKE ALL ON drink_countings FROM anon;
REVOKE ALL ON cream_sales FROM anon;
