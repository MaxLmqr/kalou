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
  client hors ligne rejoue sa file sans risque de doublon. C'est ce qui remplace, à lui
  seul, un moteur de synchronisation (§ 13).
- **Identifiants générés par le client.** UUID v7 côté mobile : une entrée existe et
  s'affiche avant toute connexion.
- **Validation par schéma** aux frontières (`t.Object` d'Elysia), avec erreurs typées.

## 2. Accès

> **Décision à confirmer.** Le recadrage en usage personnel prévoyait de supprimer
> toute authentification au profit d'un jeton statique en configuration. Better Auth
> ayant été implémenté entre-temps, la spécification décrit ici le code qui existe
> plutôt qu'une intention contredite. Ce qu'il en coûte : un fournisseur d'envoi
> d'e-mails est nécessaire pour délivrer les codes — c'est la seule dépendance externe
> de l'application en dehors du modèle d'estimation. Voir la question ouverte dans le
> [README](README.md).

Assurée par **Better Auth**, monté sous `/auth`. Les routes ci-dessous sont celles
de la bibliothèque : les réécrire derrière des alias maison ferait perdre le
client typé et la rotation de session qu'elle fournit.

```
POST /auth/email-otp/send-verification-otp
     { email, type: "sign-in" }                  → { success }   (code à 6 chiffres)
POST /auth/sign-in/email-otp   { email, otp }    → { token, user }
GET  /auth/get-session                            → { session, user } | null
POST /auth/sign-out                               → { success }
```

Pas de mot de passe : un code à usage unique valable 10 minutes, conformément au
cadrage. La première connexion à une adresse **crée le compte** — il n'y a pas
d'inscription distincte.

**Session par cookie signé**, pas de JWT porté à la main. Côté mobile, le plugin
Expo de Better Auth range le cookie dans le `SecureStore` et le rejoue
automatiquement ; le client (`createAuthClient`) expose `signIn`, `signOut` et
`useSession` sans qu'aucune route ne soit écrite à la main.

Les routes protégées se déclarent avec la macro `auth` d'Elysia, qui résout
`utilisateur` et `session` et répond `401` en leur absence — la vérification ne
peut pas être oubliée sur une route.

**Apple et Google** arrivent plus tard via `POST /auth/sign-in/social` : Better
Auth range les identités externes dans la table `accounts`, ce qui rend inutiles
les colonnes `apple_sub` et `google_sub` prévues au doc 05.
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

Une entrée est **toujours** une liste de composants (cf. [08](08-base-aliments.md)).
Les composants sont écrits avec leur parent, dans la même requête : ils n'ont pas de
cycle de vie propre.

```
POST   /food-entries       { id, occurred_at, libelle?, items: Item[] }   → FoodEntry
PATCH  /food-entries/:id   { libelle?, occurred_at?, items? }             → FoodEntry
DELETE /food-entries/:id                                                   → 204
```

```ts
type Item =
  | { type: "reference"; food_id: string; quantite: number;
      unite: "g" | "ml" | "unite"; portion_id?: string }
  | { type: "libre"; libelle: string; kcal: number;
      proteines_g?: number; glucides_g?: number; lipides_g?: number };
```

- Un composant `reference` **n'envoie pas de calories** : le serveur lit `kcal_100g`,
  calcule, et fige `kcal_ref_utilise`. Le calcul reste en un seul endroit, comme pour
  les activités.
- Un composant `libre` porte ses calories — c'est le cas « je sais que j'ai 123 kcal de
  pois chiches ».
- `PATCH` avec `items` **remplace la liste** et recalcule le total. Tout composant dont
  les calories ou la quantité diffèrent de ce qui avait été estimé est marqué
  `edited_by_user = true`, et l'entrée passe en `etat: "corrige"`.
- `libelle` est facultatif : à défaut, le serveur le dérive des composants
  (« Pois chiches, pignons + 1 »).
- Le total ne s'écrit pas directement. Il est toujours `Σ items.kcal`.

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

## 7. Base d'aliments

```
GET  /foods?q=pois+chiche&limit=20&toutes_variantes=false
     → { resultats: Food[], plus_de_variantes: boolean }

GET  /foods/:id                    → Food & { portions: Portion[] }
POST /foods        { libelle, kcal_100g, unite_base, macros? }  → Food   (aliment perso)
PATCH /foods/:id   { ... }         → Food     (aliment perso uniquement)
DELETE /foods/:id                  → 204      (aliment perso ; les composants sont conservés)
```

Le classement des résultats est calculé par le serveur selon l'ordre du § 5 de
[08](08-base-aliments.md) — consommations personnelles, aliments personnels, aliments
promus, puis le reste de CIQUAL sur demande. Le client ne trie pas.

`plus_de_variantes` permet d'afficher « voir toutes les variantes » sans second appel à
vide.

### Jeu de référence embarqué — reporté

Un endpoint `GET /foods/reference` servant le jeu complet au client, une copie SQLite
locale et un index FTS5 rendraient la recherche disponible hors ligne. **Ce n'est pas
dans la v1** : la recherche par API suffit tant qu'on est chez soi ou en 4G, et le
protocole de versions et de deltas coûterait plus cher que le confort gagné.

Le jeu CIQUAL est donc importé une fois côté serveur, sa version enregistrée, et c'est
tout. Si l'absence de recherche hors ligne devient gênante à l'usage, cet endpoint est
la réponse — la structure de données ne changera pas.

## 8. Repas enregistrés

```
GET    /favorites                                → Favorite[]  (repas et activités, triés)
POST   /favorites      { type, libelle, items? | activity_code, duree_min }  → Favorite
POST   /favorites/:id/use  { occurred_at, facteur? }   → FoodEntry | ActivityEntry
DELETE /favorites/:id                             → 204
```

`POST /favorites/:id/use` est le chemin de la réutilisation en un tap : il crée l'entrée
du jour en copiant les composants, en appliquant le `facteur` de redimensionnement
éventuel. Coût nul, aucun appel au modèle.

## 9. Activités

```
GET    /activities                          → Activity[]   (ETag, cache long)
POST   /activity-entries    { id, occurred_at, activity_code, duree_min } → ActivityEntry
PATCH  /activity-entries/:id { duree_min?, occurred_at? }                  → ActivityEntry
DELETE /activity-entries/:id                                                → 204
```

Le client **n'envoie ni MET ni calories** : le serveur résout le MET, lit la tendance de
poids, calcule le net et fige les trois valeurs. Le calcul reste ainsi en un seul
endroit.

## 10. Pesées

```
POST   /weigh-ins      { id, occurred_at, poids_kg }  → { weigh_in, tendance_kg, est_aberrante }
GET    /weigh-ins?from=&to=                           → { pesees: [], tendance: [] }
DELETE /weigh-ins/:id                                  → 204
```

La réponse au `POST` contient la **tendance** recalculée : c'est ce que l'interface
affiche, pas la variation brute.

## 11. Calibration

```
GET  /calibration        → { statut, socle_applique, socle_formule, socle_mesure?,
                             jours_valides, jours_requis, derniere_calibration_le,
                             delta_budget_kcal?, garde_fous_actifs, explication }
```

Lecture seule. La calibration est déclenchée par un travail de fond quotidien, jamais
par le client — sinon deux appareils obtiennent deux budgets différents.

`explication` est une phrase prête à afficher, générée côté serveur à partir des
chiffres, pour que le message reste cohérent avec le calcul.

## 12. Statistiques

```
GET /stats/weekly?weeks=12   → [{ semaine, apports_moyens, depense_moyenne,
                                  deficit_moyen, perte_predite_kg, perte_observee_kg }]
```

Le couple `perte_predite` / `perte_observee` est l'indicateur de véracité du modèle.
Il est affiché à l'utilisateur **et** suivi comme métrique produit.

## 13. Mode hors ligne

**Il n'y a pas de synchronisation, parce qu'il n'y a qu'un écrivain.** Un seul appareil
écrit, le serveur est la source de vérité, et aucun conflit n'est possible. Le moteur
de synchronisation différentielle (pull par curseur, résolution de conflits,
suppressions logiques) est donc retiré : c'était la pièce la plus lourde de la
spécification, pour un problème qui n'existe pas ici.

Ce qui reste, et qui suffit :

- **Une file d'envoi locale (outbox).** Toute écriture est enregistrée localement puis
  postée ; en cas d'échec réseau, elle est rejouée. L'`Idempotency-Key` garantit
  qu'un rejeu ne crée pas de doublon.
- **Des identifiants générés par le client**, donc une entrée existe et s'affiche avant
  toute connexion.
- **Un cache de lecture** de la journée courante, pour que l'écran d'accueil s'affiche
  hors réseau.
- **La saisie d'un composant `libre`** (libellé + calories) ne demande jamais le réseau.
  C'est le chemin de secours complet : la recherche d'aliments et l'estimation IA, elles,
  ont besoin de l'API.

Ce qu'on accepte en échange : l'application ne fonctionne pas hors ligne sur un
appareil neuf (aucun cache), et la recherche d'aliments est indisponible sans réseau.
Deux limitations sans conséquence pour un usage personnel — et si la seconde devenait
gênante, le jeu CIQUAL peut être embarqué (§ 7) sans rien changer d'autre.

## 14. Erreurs

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
| 401 | Jeton absent ou invalide |
| 403 | Tentative de modification d'un aliment de référence CIQUAL (seuls les aliments perso sont modifiables) |
| 404 | Ressource absente ou supprimée logiquement |
| 409 | Conflit d'idempotence avec une charge différente |
| 422 | Règle métier (plancher de sécurité, objectif hors limites) |
| 429 | Limite d'estimation atteinte |
| 503 | Modèle indisponible — le client garde l'entrée en attente et réessaie |

## 15. Travaux de fond

| Travail | Cadence | Rôle |
|---|---|---|
| Clôture de journée | Chaque heure (par fuseau) | Fige les `daily_summaries` de la journée écoulée |
| Calibration | Quotidien, après clôture | Recalcule le socle, applique les garde-fous |
| Purge | Quotidien | Vignettes orphelines, estimations de plus de 90 jours |
| Notifications | Selon profil | Rappel de pesée, récapitulatif du soir |
