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

> **Décision prise** : Better Auth est conservé. Le recadrage en usage personnel
> prévoyait un simple jeton statique, mais la bibliothèque était déjà en place et
> fonctionnelle. Elle ouvre en outre le multi-appareil sans rien reprendre.

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

### Code de développement

Tant qu'aucun fournisseur d'envoi d'e-mails n'est branché, **un code unique connecte
n'importe quelle adresse**. C'est ce qui permet de se connecter aujourd'hui sans
infrastructure de mail, et donc de reporter cette dépendance jusqu'à ce qu'elle soit
utile.

```
POST /auth/sign-in/email-otp   { email: <n'importe laquelle>, otp: AUTH_DEV_OTP }
     → { token, user }     — le compte est créé s'il n'existe pas
```

Trois garde-fous, à implémenter **en même temps** que le raccourci — pas après :

1. **Activation explicite** : le contournement n'existe que si la variable
   d'environnement `AUTH_DEV_OTP` est renseignée. Absente, le code normal à six
   chiffres est seul valable. Elle n'a pas de valeur par défaut dans le code.
2. **Refus de démarrer en production** : si `NODE_ENV=production` et que `AUTH_DEV_OTP`
   est renseignée, l'API s'arrête au démarrage avec une erreur explicite. Un
   avertissement à chaque démarrage ne suffit pas — personne ne lit les logs de sa
   propre application.
3. **Trace visible** : chaque connexion par ce chemin est journalisée en
   avertissement, avec l'adresse utilisée.

C'est un raccourci de développement, pas un mode d'authentification : il ouvre l'accès
à **tout le monde** dès que l'API est joignable depuis le réseau. Le garde-fou 2 est ce
qui fait la différence entre un confort temporaire et une porte ouverte oubliée.

À retirer quand l'envoi d'e-mails sera branché — ou à garder indéfiniment si l'API ne
sort jamais du réseau local, ce qui est le cas d'usage actuel.

**Apple et Google** arrivent plus tard via `POST /auth/sign-in/social` : Better
Auth range les identités externes dans la table `accounts`, ce qui rend inutiles
les colonnes `apple_sub` et `google_sub`, retirées du doc 05.
## 3. Profil et objectif

```
GET   /me                          → { user, profile, goal }
PATCH /me/profile                  { sexe?, date_naissance?, taille_cm? }
PUT   /me/goal                     { rythme_kg_semaine, poids_cible_kg? }
                                   → { goal, rythme_applique, plafonds_appliques, apport_cible_estime }
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
  apport_cible_kcal: number;
  apports_kcal: number;
  besoin_journalier_kcal: number; // socle + EAT, corrigé du TEF (doc 02 § 3.4)
  restant_kcal: number;          // apport cible − apports, peut être négatif
  balance_kcal: number;
  detail: {
    bmr: number;
    socle: number;
    eat_kcal: number;      // dépense sportive nette, telle que le journal l'affiche
    eat_ajout_kcal: number; // ce que cette activité ajoute au besoin et à l'apport cible
    deficit_cible: number;
  };
  proteines: {
    total_g: number | null;
    plancher_g: number;
    partiel: boolean;             // true si une entrée libre rend la somme incomplète
  };
  entrees_en_attente: number;     // exclues des totaux — à afficher explicitement
  journal: (FoodEntry | ActivityEntry | WeighIn)[];   // trié par occurred_at, `genre` discrimine
  tendance_poids_kg: number | null;
};
```

`GET /days/:date` est le seul appel nécessaire au rendu de l'écran d'accueil. Cible :
une requête, moins de 100 ms.

**`eat_ajout_kcal` n'est pas `eat_kcal`** : la correction de TEF s'applique à l'activité
comme au reste (doc 02 § 3.2), donc 489 kcal courues ajoutent 489 / 0,90 = 543 kcal au
besoin comme à l'apport cible. Il est servi avec `bmr`, `socle` et `deficit_cible`, pour
qui veut vérifier le calcul ; comme eux, l'accueil ne l'affiche pas (§ 2 de
[03](03-parcours-utilisateur.md)).

**Le journal porte les trois genres de saisie du jour** — `repas`, `activite`, `pesee` —
discriminés par `genre`. La pesée n'a pas de calories et n'entre dans aucun total : elle
est là parce que l'accueil est l'endroit où l'on vérifie ce qu'on a saisi.

**Pas de `phase`.** La calibration est hors périmètre (doc 02 § 5) : il n'y a qu'un
régime, celui du § 3.2, et un champ dont la valeur serait constante n'apprendrait rien à
personne — il inviterait seulement le client à afficher une distinction qui n'existe
pas.

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
  `edited_by_user = true`, et l'entrée passe en `etat: "corrige"`. Cette bascule ne vaut
  que pour une entrée **issue d'une estimation** : c'est là qu'une correction dit quelque
  chose — le modèle a proposé, l'humain a tranché. Une entrée saisie à la main puis
  modifiée à la main reste `manuel` ; la marquer « corrigée » salirait la seule
  statistique qui compte, celle de la justesse du modèle.
- Écrire une entrée **note la consommation** de chaque aliment référencé
  (`user_food_usages`) : c'est ce qui alimente le classement personnel de la recherche
  (§ 5 de [08](08-base-aliments.md)) et la quantité pré-remplie à la fois suivante (§ 6).
  Une correction met à jour la dernière quantité mais ne compte pas une consommation de
  plus.
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

## 11. Calibration — hors périmètre pour l'instant

> Ce chantier arrive au V0.1 (cf. [07](07-roadmap.md)) : la route n'existe pas, et
> `/me` ne porte aucun état de calibration. La spécification ci-dessous reste la
> référence pour le jour où on l'implémentera.

```
GET  /calibration        → { statut, socle_applique, socle_formule, socle_mesure?,
                             jours_valides, jours_requis, derniere_calibration_le,
                             delta_apport_cible_kcal?, garde_fous_actifs, explication }
```

Lecture seule. La calibration est déclenchée par un travail de fond quotidien, jamais
par le client — sinon deux appareils obtiennent deux apport cibles différents.

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
