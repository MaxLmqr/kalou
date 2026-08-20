# 07 — Roadmap

## Principe de découpage

Chaque jalon produit quelque chose d'utilisable. Le premier jalon utile n'est pas
« l'authentification marche », c'est « je peux enregistrer un repas et voir mon
apport cible ». L'ordre ci-dessous privilégie le chemin chaud et repousse tout ce qui n'est
pas sur ce chemin.

## Jalon 0 — Socle technique

*Ce que la session parallèle est en train de produire.*

- Monorepo Bun + Turbo, `apps/api` (Elysia), `apps/mobile` (Expo), `packages/db`
  (Drizzle + Postgres).
- Migrations, seed du référentiel `activities` depuis la table MET.
- Authentification par code e-mail (Better Auth), avec code de développement
  connectant n'importe quelle adresse tant qu'aucun envoi d'e-mails n'est branché.
- **Import CIQUAL** : script d'import du jeu ANSES vers `foods` (+ `food_portions`),
  version figée et enregistrée, extensions `pg_trgm` et `unaccent`. Indépendant du
  reste, donc parallélisable dès maintenant.

## Jalon 1 — La boucle nue

**Critère de sortie : je peux composer un repas et voir mon apport cible du jour.**

- Onboarding (5 écrans), calcul du BMR et du socle par formule, objectif et déficit.
- `GET /days/:date` et l'écran d'accueil avec son chiffre unique.
- **Composeur de repas** : entrée + composants, total qui s'additionne, composants
  `libre` (libellé + kcal) et `reference` (recherche dans `foods` + quantité).
- Recherche d'aliments côté serveur (`GET /foods`), classement du § 5 de
  [08](08-base-aliments.md), portions domestiques.
- Pesées + tendance lissée.
- Menu d'action rapide dans sa forme finale.

Ce jalon vaut d'être atteint sans IA : il valide le modèle calorique, le fuseau
horaire, la clôture de journée et la structure d'un repas — tous indépendants de
l'estimation. C'est aussi ce qui permet de tester la boucle sur soi pendant que
l'estimation se construit. Il livre en outre un chemin de saisie **complet et
autonome** : si l'estimation IA déçoit au jalon 2, l'application reste utilisable.

**Le sous-ensemble curé** (~150 aliments réécrits, promus, avec alias et portions) est
un travail de contenu à mener en parallèle de ce jalon. Sans lui, la recherche renvoie
onze variantes de pois chiches et le composeur est inutilisable. Premier jet dans
[`data/aliments-premier-jet.csv`](data/aliments-premier-jet.csv), à rapprocher des
codes CIQUAL au moment de l'import.

## Jalon 2 — Estimation IA

**Critère de sortie : je photographie une assiette et les composants se remplissent.**

- `POST /estimations`, prompt système et table de portions de référence, sortie
  structurée validée.
- Flux non bloquant : entrée créée avant le résultat.
- L'estimation **pré-remplit le composeur du jalon 1** — aucune interface nouvelle,
  seulement une source de composants supplémentaire.
- Correction ligne à ligne et verrou `edited_by_user` au composant.
- Rapprochement best-effort des composants avec `foods`.
- Chemin texte libre, fusionné avec la recherche dans un champ unique.
- Journalisation des estimations (coût, latence, taux de correction).

## Jalon 3 — Activités

**Critère de sortie : une séance saisie augmente correctement mon apport cible.**

- Liste MET avec recherche et tri par usage, sélecteur de durée.
- Calcul net côté serveur, valeurs figées.
- Affichage de la contribution du sport dans le détail du jour.

## Jalon 4 — Calibration

**Critère de sortie : au bout de deux semaines, mon apport cible est mesuré et non plus
estimé.**

- Travail de fond quotidien, fenêtre de 14 jours, transition progressive.
- Garde-fous (vitesse, bornes, sous-déclaration, plancher).
- Écran de calibration et ses trois états.
- `GET /stats/weekly` avec le couple prédit / observé.

C'est le jalon qui différencie Kalou. Il arrive en quatrième position uniquement parce
qu'il a besoin de deux semaines de données réelles pour être testable — sa conception
doit donc être figée dès le jalon 1, puisque c'est elle qui impose `daily_summaries`
et l'historisation.

## Jalon 5 — Robustesse

**Critère de sortie : une saisie faite sans réseau n'est jamais perdue.**

- File d'envoi locale (outbox) avec rejeu et `Idempotency-Key`, cache de lecture de la
  journée courante.
- File d'estimations différées.
- Repas enregistrés et réutilisations en un tap, avec redimensionnement (dépend d'un
  historique réel — donc après les jalons 2 et 3).
- Aliments perso.
- Notifications.

Ce jalon a fondu avec le recadrage en usage personnel : sans second appareil, il n'y a
ni synchronisation différentielle, ni résolution de conflits, ni jeu CIQUAL embarqué à
distribuer. Il ne reste que le rejeu des écritures, qui est le seul vrai besoin.

## Après la v1

Par ordre d'intérêt décroissant, sans engagement de calendrier :

1. **Affichage des macronutriments** — les données sont déjà stockées, c'est du pur
   affichage.
2. **Pas via Apple Health** — remplace le NEAT forfaitaire par une mesure quotidienne.
   Le gain est réel mais borné par la calibration.
3. **Code-barres et Open Food Facts** pour les produits emballés, là où ni l'IA ni
   CIQUAL ne sont pertinents.
4. **Recettes structurées** — rendement, portions produites, échelle d'ingrédients. Les
   repas enregistrés redimensionnables du jalon 5 couvrent l'essentiel du besoin ; le
   reste ne se justifie que si l'usage le demande.
5. **Vue hebdomadaire** — apports, dépense et balance agrégés sur la semaine, pour
   prendre du recul sur un écart isolé. C'est une vue de lecture : la journée reste
   l'unité de décision et l'apport cible ne devient pas hebdomadaire.
6. **Recherche d'aliments hors ligne** — jeu CIQUAL embarqué et index FTS5, si
   l'absence de réseau se révèle gênante à l'usage.
7. **Widget et raccourci Siri** — « ajouter un repas » sans ouvrir l'application. Très
   aligné avec le principe des trois taps.

## Risques identifiés

| Risque | Impact | Atténuation |
|---|---|---|
| L'estimation IA est trop imprécise sur les portions | Le produit perd sa promesse | Mesurer le taux de correction dès le jalon 2 ; la fourchette et les hypothèses affichées rendent l'imprécision gérable plutôt que trompeuse |
| Sous-déclaration systématique des apports | Calibration faussée vers le bas, spirale de restriction | Garde-fou de suspension, biais du prompt vers la borne haute, plancher d'apport |
| Abandon de la pesée | Plus de calibration possible | Rappel matinal, tendance lissée pour désamorcer l'angoisse de la balance, gel plutôt que dégradation de la mesure |
| Coût des estimations | Modèle économique | Composition manuelle et repas enregistrés (les leviers principaux, à coût nul), cache de prompt, limite quotidienne |
| Recherche d'aliments inutilisable (variantes CIQUAL, libellés cliniques) | Le composeur est abandonné et il ne reste que l'IA | Sous-ensemble curé, libellés réécrits, alias, classement personnel — cf. § 5 de [08](08-base-aliments.md) |
| Fuseaux et clôture de journée | Bugs silencieux d'attribution des entrées | `local_date` figé à l'écriture, tests explicites sur changement d'heure et voyage |
