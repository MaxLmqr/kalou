# 05 — Modèle de données

Postgres + Drizzle (`packages/db`). Toutes les clés primaires sont des UUID v7
(ordonnés temporellement, utiles pour la pagination et générables côté client — ce qui
est nécessaire pour la saisie hors ligne).

## 1. Conventions

- **Horodatage** : `timestamptz` partout, jamais de `timestamp` nu.
- **`occurred_at` vs `local_date`** — chaque entrée porte les deux : l'instant absolu
  (`timestamptz`) et le jour local auquel elle est rattachée (`date`). `local_date`
  est calculé **à l'écriture** selon le fuseau et l'heure de bascule du profil, puis
  figé. Sans cela, un voyage ou un changement d'heure réécrit l'histoire.
- **Calories** : entiers, en kcal. Aucun besoin de décimales.
- **Poids** : `numeric(5,2)` en kg.
- **Suppression** : logique (`deleted_at`), pour permettre la synchronisation
  différentielle avec un client hors ligne. Exception : les tables filles
  (`food_entry_items`, `favorite_items`) sont supprimées physiquement en cascade — elles
  se synchronisent avec leur parent, pas séparément.
- **`updated_at`** sur toutes les tables synchronisables, indexé, pour le `pull`.

## 2. Tables

### `users`
Identité et authentification.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `email` | text unique | |
| `apple_sub`, `google_sub` | text unique nullable | Sign in with Apple / Google |
| `created_at`, `updated_at` | timestamptz | |
| `deleted_at` | timestamptz null | Suppression de compte |

### `profiles`
Morphologie et préférences. Une ligne par utilisateur.

| Colonne | Type | Notes |
|---|---|---|
| `user_id` | uuid PK FK | |
| `sexe` | enum(`homme`,`femme`) | Paramètre de la formule BMR, cf. [02](02-modele-calorique.md) § 2 |
| `date_naissance` | date | L'âge est dérivé, jamais stocké |
| `taille_cm` | smallint | |
| `timezone` | text | IANA, ex. `Europe/Paris` |
| `heure_bascule_journee` | smallint | 0 par défaut, 3 pour les couche-tard |
| `notifications_pesee`, `notifications_recap` | boolean | |

### `goals`
Objectif de perte. Historisé : changer d'objectif ne réécrit pas le passé.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `rythme_kg_semaine` | numeric(3,2) | Après application des plafonds |
| `rythme_demande` | numeric(3,2) | Ce que l'utilisateur avait demandé, si plafonné |
| `poids_cible_kg` | numeric(5,2) null | Optionnel |
| `debut_le`, `fin_le` | date, date null | `fin_le IS NULL` = objectif actif |

> Contrainte : au plus un objectif actif par utilisateur (index unique partiel sur
> `(user_id) WHERE fin_le IS NULL`).

### `weigh_ins`
Pesées brutes. La tendance n'est **pas** stockée ici — elle est dérivée (§ 4).

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `local_date` | date | Une pesée par jour local (index unique) ; la dernière écrase |
| `occurred_at` | timestamptz | |
| `poids_kg` | numeric(5,2) | |
| `est_aberrante` | boolean | Écart > 3 kg avec la tendance ; incluse mais signalée |
| `updated_at`, `deleted_at` | | |

### `food_entries`
Entrées alimentaires (nourriture et boissons — pas de distinction structurelle, un
verre de jus est un aliment liquide).

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | Généré côté client (saisie hors ligne) |
| `user_id` | uuid FK | |
| `occurred_at` | timestamptz | Depuis l'EXIF de la photo si disponible |
| `local_date` | date | Indexé avec `user_id` |
| `libelle` | text | Ex. « Burger et frites » — dérivé des composants si non fourni |
| `kcal` | integer null | **Somme des composants**, dénormalisée ; `null` tant que l'état est `en_attente` |
| `proteines_g`, `glucides_g`, `lipides_g` | numeric(6,1) null | Stockés, non affichés en v1 |
| `kcal_min`, `kcal_max` | integer null | Fourchette d'incertitude |
| `etat` | enum(`en_attente`,`estime`,`corrige`,`manuel`,`echec`) | |
| `source` | enum(`ia_photo`,`ia_texte`,`favori`,`manuel`) | |
| `estimation_id` | uuid FK null | Vers `estimations` |
| `favorite_id` | uuid FK null | Si créée depuis un favori |
| `edited_by_user` | boolean | Vrai si au moins un composant a été corrigé |
| `image_ref` | text null | Clé de la vignette |
| `updated_at`, `deleted_at` | | |

> Une entrée en `en_attente` est **exclue** du total du jour, et le nombre d'entrées
> en attente est renvoyé à part (cf. [06](06-api.md)) pour que l'interface puisse le dire.
>
> Le champ `detail_aliments` (jsonb) initialement prévu est remplacé par la table
> `food_entry_items` : les composants sont édités individuellement, référencent des
> aliments et portent leur propre verrou de correction — un jsonb ne le permettrait
> qu'au prix de réécritures complètes.

### `food_entry_items`
Composants d'un repas. **Toute entrée alimentaire en a au moins un**, quelle que soit
son origine (cf. [08](08-base-aliments.md) § 2).

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `food_entry_id` | uuid FK | `ON DELETE CASCADE` |
| `position` | smallint | Ordre d'affichage |
| `type` | enum(`reference`,`libre`,`ia`) | Cf. [08](08-base-aliments.md) § 3 |
| `food_id` | uuid FK null | Renseigné pour `reference`, et pour `ia` si le rapprochement a réussi |
| `libelle` | text | Toujours présent, même avec `food_id` — l'historique reste lisible si l'aliment disparaît |
| `quantite` | numeric(7,1) null | `null` pour un composant `libre` |
| `unite` | enum(`g`,`ml`,`unite`,`portion`) null | |
| `portion_id` | uuid FK null | Si la quantité a été saisie en portion domestique |
| `kcal` | integer | |
| `proteines_g`, `glucides_g`, `lipides_g` | numeric(6,1) null | |
| `kcal_ref_utilise` | numeric(6,1) null | **Figé** : kcal/100 g de l'aliment au moment de la saisie |
| `edited_by_user` | boolean | Verrou au composant, pas à l'entrée |
| `confiance` | enum(`haute`,`moyenne`,`basse`) null | Renseigné par l'estimation IA |

### `foods`
Base d'aliments : jeu de référence CIQUAL + aliments personnels. Cf.
[08](08-base-aliments.md).

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK null | `null` = aliment de référence, sinon aliment personnel privé |
| `source` | enum(`ciqual`,`utilisateur`) | |
| `code_source` | text null | Code CIQUAL d'origine, pour la traçabilité et les mises à jour |
| `libelle` | text | Libellé affiché, réécrit pour le sous-ensemble curé |
| `libelle_origine` | text null | Libellé CIQUAL brut, conservé |
| `libelle_normalise` | text | Minuscules, sans accents — support de la recherche |
| `kcal_100g` | numeric(6,1) | Unité de référence |
| `proteines_100g`, `glucides_100g`, `lipides_100g`, `fibres_100g` | numeric(5,1) null | |
| `unite_base` | enum(`g`,`ml`) | `ml` pour les liquides |
| `promu` | boolean | Appartient au sous-ensemble curé (~300 aliments) |
| `usages_globaux` | integer | Compteur agrégé, pour le classement par défaut |
| `reference_version` | text null | Version du jeu CIQUAL qui a fourni la ligne |
| `actif` | boolean | Retrait sans suppression |

> Contrainte : `user_id IS NULL` ⇔ `source = 'ciqual'`. Un aliment personnel est
> toujours rattaché à son propriétaire et n'est jamais visible d'un autre compte.

### `food_portions`
Portions domestiques d'un aliment (cf. [08](08-base-aliments.md) § 6).

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `food_id` | uuid FK | |
| `libelle` | text | « 1 cuillère à soupe », « 1 tranche » |
| `grammes` | numeric(6,1) | |
| `par_defaut` | boolean | Portion proposée en premier |

### `food_aliases`
Synonymes de recherche. Alimentée à la main, puis par les recherches infructueuses
observées.

| Colonne | Type | Notes |
|---|---|---|
| `food_id` | uuid FK | |
| `alias_normalise` | text | PK composite avec `food_id` |

### `user_food_usages`
Historique de consommation par aliment — c'est ce qui fait remonter les bons résultats
au bout de deux semaines d'usage.

| Colonne | Type | Notes |
|---|---|---|
| `user_id`, `food_id` | PK composite | |
| `usages` | integer | |
| `dernier_usage_at` | timestamptz | |
| `derniere_quantite`, `derniere_unite`, `dernier_portion_id` | | Pré-remplissage du sélecteur de quantité |

### `activity_entries`
Dépenses sportives.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `occurred_at`, `local_date` | | |
| `activity_code` | text FK → `activities` | |
| `duree_min` | smallint | |
| `met` | numeric(4,2) | **Figé** : valeur de la table au moment de la saisie |
| `poids_utilise_kg` | numeric(5,2) | **Figé** : tendance du jour |
| `kcal_net` | integer | **Figé** : résultat du calcul, pas recalculé à la lecture |
| `updated_at`, `deleted_at` | | |

> Les trois champs figés rendent l'historique auditable : on peut recalculer et
> vérifier une entrée de l'an dernier même si la table MET a changé depuis.

### `activities`
Référentiel MET. Table de référence, pas de données utilisateur.

| Colonne | Type | Notes |
|---|---|---|
| `code` | text PK | Ex. `course_8kmh` |
| `libelle` | text | « Course 8 km/h » |
| `met` | numeric(4,2) | |
| `categorie` | text | `cardio`, `force`, `souplesse`, `quotidien` |
| `icone` | text | |
| `actif` | boolean | Retrait sans suppression, pour ne pas casser l'historique |

Alimentée par un seed depuis le § 7 de [02](02-modele-calorique.md). Servie par l'API
et mise en cache par le client (`ETag`).

### `favorites`
Réutilisations. **Émergent de l'usage**, jamais créés dans un écran dédié.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `type` | enum(`repas`,`activite`) | |
| `libelle` | text | |
| `kcal` | integer null | Pour un repas : somme de ses composants, dénormalisée |
| `proteines_g`, `glucides_g`, `lipides_g` | numeric null | |
| `activity_code`, `duree_min` | | Pour une activité |
| `usages` | integer | Compteur |
| `dernier_usage_at` | timestamptz | |
| `heure_usuelle` | smallint null | Heure médiane d'usage, pour le tri contextuel |

> Score de tri : `usages × exp(−jours_depuis_dernier_usage / 14)`, pondéré par la
> proximité entre l'heure courante et `heure_usuelle`. Recalculé à la lecture.

### `favorite_items`
Composants d'un repas enregistré. Même structure que `food_entry_items`, sans les
champs propres à l'estimation (`confiance`, `edited_by_user`).

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `favorite_id` | uuid FK | `ON DELETE CASCADE` |
| `position` | smallint | |
| `type` | enum(`reference`,`libre`) | Un composant `ia` devient `reference` ou `libre` à l'enregistrement |
| `food_id` | uuid FK null | |
| `libelle` | text | |
| `quantite`, `unite`, `portion_id` | | |
| `kcal` | integer | |
| `proteines_g`, `glucides_g`, `lipides_g` | numeric null | |

> **Redimensionnement** : le facteur (× 0,5, × 2) est appliqué à l'usage, aux quantités
> et aux calories des composants copiés. Il n'est pas stocké sur le favori : un repas
> enregistré garde sa composition de référence.

### `estimations`
Journal des appels au modèle. Sert au coût, à la qualité et au débogage.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `type_entree` | enum(`photo`,`texte`,`photo_texte`) | |
| `texte_entree` | text null | |
| `image_ref` | text null | |
| `modele` | text | Ex. `claude-opus-5` |
| `prompt_version` | text | Indispensable pour comparer des versions de prompt |
| `tokens_entree`, `tokens_sortie`, `tokens_cache_lus` | integer | |
| `latence_ms` | integer | |
| `resultat` | jsonb null | Sortie validée |
| `statut` | enum(`succes`,`hors_sujet`,`erreur`) | |
| `erreur` | text null | |
| `created_at` | timestamptz | |

### `calibrations`
Historique des calibrations. Chaque calcul est conservé, y compris non appliqué.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `calcule_le` | date | |
| `fenetre_jours` | smallint | 14 |
| `jours_valides` | smallint | Jours avec apports saisis dans la fenêtre |
| `nb_pesees` | smallint | |
| `delta_tendance_kg` | numeric(5,3) | |
| `apports_totaux` | integer | |
| `eat_moyen` | integer | |
| `depense_mesuree` | integer | |
| `socle_mesure` | integer | |
| `socle_formule` | integer | |
| `poids_w` | numeric(3,2) | Le `w` du § 5.3 de [02](02-modele-calorique.md) |
| `socle_applique` | integer | Après garde-fous |
| `garde_fous_actifs` | text[] | Ex. `{vitesse_max}`, `{sous_declaration}` |
| `statut` | enum(`applique`,`gele`,`insuffisant`) | |

### `daily_summaries`
Récapitulatif quotidien **figé**. Écrit à la clôture de la journée locale (ou recalculé
tant que la journée est en cours).

| Colonne | Type | Notes |
|---|---|---|
| `user_id`, `local_date` | PK composite | |
| `bmr` | integer | Figé |
| `socle` | integer | Figé |
| `eat_kcal` | integer | |
| `depense_kcal` | integer | |
| `deficit_cible` | integer | Figé |
| `budget_kcal` | integer | Figé |
| `apports_kcal` | integer | |
| `balance_kcal` | integer | `apports − depense` |
| `entrees_en_attente` | smallint | |
| `tendance_poids_kg` | numeric(5,2) null | |
| `phase` | enum(`formule`,`transition`,`calibre`) | |

> Cette table est le socle de l'historique et de la calibration : sans elle, tout écran
> d'historique refait N calculs à chaque affichage, et un changement de profil réécrit
> le passé. La journée en cours est calculée à la volée ; les journées passées sont
> lues ici.

## 3. Index essentiels

```sql
-- Lecture d'une journée (le chemin le plus chaud de l'application)
CREATE INDEX ON food_entries (user_id, local_date) WHERE deleted_at IS NULL;
CREATE INDEX ON activity_entries (user_id, local_date) WHERE deleted_at IS NULL;

-- Synchronisation différentielle
CREATE INDEX ON food_entries (user_id, updated_at);
CREATE INDEX ON activity_entries (user_id, updated_at);
CREATE INDEX ON weigh_ins (user_id, updated_at);

-- Tendance et calibration
CREATE INDEX ON weigh_ins (user_id, local_date) WHERE deleted_at IS NULL;

-- Une pesée par jour
CREATE UNIQUE INDEX ON weigh_ins (user_id, local_date) WHERE deleted_at IS NULL;

-- Un objectif actif
CREATE UNIQUE INDEX ON goals (user_id) WHERE fin_le IS NULL;

-- Composants d'un repas
CREATE INDEX ON food_entry_items (food_entry_id);

-- Recherche d'aliments : trigrammes sur le libellé normalisé
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE INDEX ON foods USING gin (libelle_normalise gin_trgm_ops) WHERE actif;
CREATE INDEX ON food_aliases USING gin (alias_normalise gin_trgm_ops);
CREATE INDEX ON foods (promu) WHERE user_id IS NULL AND actif;
CREATE INDEX ON foods (user_id) WHERE user_id IS NOT NULL AND actif;

-- Classement personnel des résultats de recherche
CREATE INDEX ON user_food_usages (user_id, usages DESC);
```

## 4. Grandeurs dérivées, non stockées

Calculées à la lecture, pour éviter les incohérences :

- **La tendance de poids** — dérivée de la série `weigh_ins` par EMA. Stockée
  uniquement dans `daily_summaries` comme photographie du jour.
- **L'âge** — dérivé de `date_naissance`.
- **Le BMR courant** — dérivé du profil et de la tendance.
- **Le score de tri des favoris et des résultats de recherche d'aliments** — dérivé de
  `usages` et `dernier_usage_at`.
- **Les calories d'un composant `reference`** — vérifiables à tout moment depuis
  `quantite × kcal_ref_utilise / 100`, mais stockées pour figer l'historique.

## 5. Invariants

1. Une `food_entry` en `en_attente` a `kcal IS NULL` et aucun composant ; toute autre
   valeur d'`etat` implique `kcal IS NOT NULL` et **au moins un composant**.
2. `food_entries.kcal = Σ food_entry_items.kcal`, recalculé à chaque écriture d'un
   composant. Aucun total ne peut diverger de ses lignes.
3. `food_entry_items.edited_by_user = true` interdit toute écriture automatique sur ce
   composant. Le verrou est au composant : une nouvelle estimation peut compléter les
   autres lignes.
4. Un composant `libre` a `food_id IS NULL` et `quantite IS NULL` ; un composant
   `reference` a `food_id IS NOT NULL`, une `quantite` et un `kcal_ref_utilise` figé.
5. Supprimer un `food` (personnel ou retiré d'une version CIQUAL) ne supprime aucun
   composant : `food_id` passe à `null`, `libelle` et `kcal` sont conservés.
6. `favorites.kcal = Σ favorite_items.kcal` pour un favori de type `repas`.
7. `activity_entries.kcal_net` est cohérent avec `(met − 1) × 3,5 × poids_utilise_kg /
   200 × duree_min`, à l'arrondi près. Vérifiable a posteriori.
8. `daily_summaries.budget_kcal` d'une journée close n'est jamais modifié.
9. `local_date` d'une entrée est cohérent avec `occurred_at`, le `timezone` et
   l'`heure_bascule_journee` **du moment de l'écriture**.
10. Un utilisateur supprimé (`users.deleted_at`) voit ses images et ses `estimations`
   purgées par un travail de fond dans les 30 jours.
