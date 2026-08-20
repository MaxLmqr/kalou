# 06 — API

`apps/api` — Bun + ElysiaJS, contrats typés partagés avec le mobile via Eden Treaty.
Le type est le contrat : aucune duplication de schéma entre client et serveur.

## 1. Principes

- **REST simple, pas de GraphQL.** Les besoins de lecture sont connus et peu nombreux ;
  un endpoint par écran suffit.
- **Le serveur calcule, le client affiche.** Tout le modèle calorique de
  [02](02-modele-calorique.md) vit côté serveur. Le mobile ne connaît aucune formule —
  sinon la moindre évolution du modèle exige une mise à jour de l'application, et les
  deux implémentations divergent.
- **Écriture idempotente.** Toute écriture accepte un en-tête `Idempotency-Key` ; le
  client hors ligne rejoue sa file sans risque de doublon.
- **Identifiants générés par le client.** UUID v7 côté mobile : une entrée existe et
  s'affiche avant toute connexion.
- **Validation par schéma** aux frontières (`t.Object` d'Elysia), avec erreurs typées.

## 2. Authentification

```
POST /auth/apple          { identity_token }              → { access_token, refresh_token }
POST /auth/google         { id_token }                    → { access_token, refresh_token }
POST /auth/email/request  { email }                       → 204   (envoi d'un code à 6 chiffres)
POST /auth/email/verify   { email, code }                 → { access_token, refresh_token }
POST /auth/refresh        { refresh_token }               → { access_token }
POST /auth/logout                                          → 204
```

JWT court (15 min) + refresh token rotatif (30 jours). `Authorization: Bearer` sur
tout le reste.

## 3. Profil et objectif

```
GET   /me                          → { user, profile, goal, calibration_state }
PATCH /me/profile                  { sexe?, date_naissance?, taille_cm?, timezone?,
                                     heure_bascule_journee?, notifications_* }
PUT   /me/goal                     { rythme_kg_semaine, poids_cible_kg? }
                                   → { goal, rythme_applique, plafond_applique?, budget_estime }
```

`PUT /me/goal` applique les plafonds du § 6 de [02](02-modele-calorique.md) et renvoie
**ce qui a été appliqué** plus le motif éventuel, pour que l'interface l'explique au
lieu d'afficher un refus.

## 4. Journée — le chemin chaud

```
GET /days/:local_date              → DayView
GET /days?from=&to=                → DayView[]   (résumés, sans le journal détaillé)
```

```ts
type DayView = {
  local_date: string;
  budget_kcal: number;
  apports_kcal: number;
  depense_kcal: number;          // socle + EAT (+ TEF avant calibration)
  restant_kcal: number;          // budget − apports, peut être négatif
  balance_kcal: number;
  detail: {
    bmr: number;
    socle: number;
    eat_kcal: number;
    deficit_cible: number;
    phase: "formule" | "transition" | "calibre";
  };
  entrees_en_attente: number;     // exclues des totaux — à afficher explicitement
  journal: (FoodEntry | ActivityEntry)[];   // trié par occurred_at
  tendance_poids_kg: number | null;
};
```

`GET /days/:date` est le seul appel nécessaire au rendu de l'écran d'accueil. Cible :
une requête, moins de 100 ms.

## 5. Entrées alimentaires

```
POST   /food-entries              { id, occurred_at, libelle, kcal, ... }  → FoodEntry
PATCH  /food-entries/:id          { libelle?, kcal?, occurred_at?, ... }   → FoodEntry
DELETE /food-entries/:id                                                    → 204
```

`PATCH` avec un `kcal` positionne `edited_by_user = true` et `etat = "corrige"` : la
valeur est verrouillée contre toute réécriture par l'IA.

## 6. Estimation

```
POST /estimations                 multipart: image? + { texte?, food_entry_id }
                                  → { estimation_id, statut, resultat? }
GET  /estimations/:id             → { statut, resultat? }
```

Deux modes, selon le réseau :

- **Synchrone** (cas normal) : la réponse contient le résultat, et l'entrée liée est
  déjà complétée côté serveur. 2 à 6 s ; le client affiche l'entrée en attente pendant
  ce temps.
- **Différé** : si l'appel dépasse 10 s, la réponse revient en `statut: "en_cours"` et
  le client interroge `GET /estimations/:id` ou reçoit une notification silencieuse.

`food_entry_id` est fourni par le client : l'entrée existe **avant** l'estimation
(cf. [04](04-estimation-ia.md) § 2). L'API complète une entrée existante, elle ne la crée pas.

**Limite** : 40 estimations par jour et par compte → `429` avec `retry_after`.

## 7. Activités

```
GET    /activities                          → Activity[]   (ETag, cache long)
POST   /activity-entries    { id, occurred_at, activity_code, duree_min } → ActivityEntry
PATCH  /activity-entries/:id { duree_min?, occurred_at? }                  → ActivityEntry
DELETE /activity-entries/:id                                                → 204
```

Le client **n'envoie ni MET ni calories** : le serveur résout le MET, lit la tendance de
poids, calcule le net et fige les trois valeurs. Le calcul reste ainsi en un seul
endroit.

## 8. Pesées

```
POST   /weigh-ins      { id, occurred_at, poids_kg }  → { weigh_in, tendance_kg, est_aberrante }
GET    /weigh-ins?from=&to=                           → { pesees: [], tendance: [] }
DELETE /weigh-ins/:id                                  → 204
```

La réponse au `POST` contient la **tendance** recalculée : c'est ce que l'interface
affiche, pas la variation brute.

## 9. Calibration

```
GET  /calibration        → { statut, socle_applique, socle_formule, socle_mesure?,
                             jours_valides, jours_requis, derniere_calibration_le,
                             delta_budget_kcal?, garde_fous_actifs, explication }
```

Lecture seule. La calibration est déclenchée par un travail de fond quotidien, jamais
par le client — sinon deux appareils obtiennent deux budgets différents.

`explication` est une phrase prête à afficher, générée côté serveur à partir des
chiffres, pour que le message reste cohérent avec le calcul.

## 10. Statistiques

```
GET /stats/weekly?weeks=12   → [{ semaine, apports_moyens, depense_moyenne,
                                  deficit_moyen, perte_predite_kg, perte_observee_kg }]
```

Le couple `perte_predite` / `perte_observee` est l'indicateur de véracité du modèle.
Il est affiché à l'utilisateur **et** suivi comme métrique produit.

## 11. Synchronisation hors ligne

Le mobile tient une base locale (SQLite) et une file d'écritures.

```
GET  /sync?since=<timestamp>   → { food_entries: [], activity_entries: [],
                                   weigh_ins: [], favorites: [], deleted_ids: [],
                                   server_time }
POST /sync                     { operations: [{ op, entity, payload, idempotency_key }] }
                               → { applied: [], conflicts: [] }
```

- **Pull** par `updated_at > since`, suppressions incluses via `deleted_at`.
- **Push** en lot, chaque opération portant sa clé d'idempotence.
- **Conflits** : dernière écriture gagnante par entité, **sauf** si
  `edited_by_user = true` côté serveur — une correction humaine ne perd jamais contre
  une écriture automatique.
- Les `daily_summaries` ne sont **jamais** synchronisés : ils sont dérivés, et le
  serveur en est seul propriétaire.

## 12. Erreurs

Format unique :

```json
{ "erreur": { "code": "objectif_hors_limites",
              "message": "Un rythme de 1,5 kg/semaine dépasse 1 % de ton poids.",
              "details": { "rythme_max": 0.85 } } }
```

`message` est en français et affichable tel quel. `code` est stable et testable.

| Code HTTP | Usage |
|---|---|
| 400 | Validation de schéma |
| 401 / 403 | Authentification, accès à la ressource d'un autre utilisateur |
| 404 | Ressource absente ou supprimée logiquement |
| 409 | Conflit d'idempotence avec une charge différente |
| 422 | Règle métier (plancher de sécurité, objectif hors limites) |
| 429 | Limite d'estimation atteinte |
| 503 | Modèle indisponible — le client garde l'entrée en attente et réessaie |

## 13. Travaux de fond

| Travail | Cadence | Rôle |
|---|---|---|
| Clôture de journée | Chaque heure (par fuseau) | Fige les `daily_summaries` de la journée écoulée |
| Calibration | Quotidien, après clôture | Recalcule le socle, applique les garde-fous |
| Purge | Quotidien | Images des comptes supprimés, estimations de plus de 90 jours |
| Notifications | Selon profil | Rappel de pesée, récapitulatif du soir |
