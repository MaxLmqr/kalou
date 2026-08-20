# 07 — Roadmap

## Principe de découpage

Chaque jalon produit quelque chose d'utilisable. Le premier jalon utile n'est pas
« l'authentification marche », c'est « je peux enregistrer un repas et voir mon
budget ». L'ordre ci-dessous privilégie le chemin chaud et repousse tout ce qui n'est
pas sur ce chemin.

## Jalon 0 — Socle technique

*Ce que la session parallèle est en train de produire.*

- Monorepo Bun + Turbo, `apps/api` (Elysia), `apps/mobile` (Expo), `packages/db`
  (Drizzle + Postgres).
- Migrations, seed du référentiel `activities` depuis la table MET.
- Authentification (Apple, Google, e-mail à code).

## Jalon 1 — La boucle nue

**Critère de sortie : je peux saisir un repas en calories et voir mon budget du jour.**

- Onboarding (5 écrans), calcul du BMR et du socle par formule, objectif et déficit.
- `GET /days/:date` et l'écran d'accueil avec son chiffre unique.
- Saisie alimentaire **manuelle** (libellé + kcal) — pas d'IA encore.
- Pesées + tendance lissée.
- Menu d'action rapide dans sa forme finale.

Ce jalon vaut d'être atteint sans IA : il valide le modèle calorique, le fuseau
horaire, la clôture de journée et l'ergonomie de saisie, tous indépendants de
l'estimation. C'est aussi ce qui permet de tester la boucle sur soi pendant que
l'estimation se construit.

## Jalon 2 — Estimation IA

**Critère de sortie : je photographie une assiette et les calories se remplissent.**

- `POST /estimations`, prompt système et table de portions de référence, sortie
  structurée validée.
- Flux non bloquant : entrée créée avant le résultat.
- Correction et verrou `edited_by_user`.
- Chemin texte libre.
- Journalisation des estimations (coût, latence, taux de correction).

## Jalon 3 — Activités

**Critère de sortie : une séance saisie augmente correctement mon budget.**

- Liste MET avec recherche et tri par usage, sélecteur de durée.
- Calcul net côté serveur, valeurs figées.
- Affichage de la contribution du sport dans le détail du jour.

## Jalon 4 — Calibration

**Critère de sortie : au bout de deux semaines, mon budget est mesuré et non plus
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

**Critère de sortie : l'application est utilisable dans le métro et en avion.**

- Base locale SQLite, file d'écritures, `GET/POST /sync`.
- File d'estimations différées.
- Favoris et réutilisations en un tap (dépend d'un historique réel — donc après les
  jalons 2 et 3).
- Notifications.

## Après la v1

Par ordre d'intérêt décroissant, sans engagement de calendrier :

1. **Affichage des macronutriments** — les données sont déjà stockées, c'est du pur
   affichage.
2. **Pas via Apple Health / Google Fit** — remplace le NEAT forfaitaire par une mesure
   quotidienne. Le gain est réel mais borné par la calibration.
3. **Code-barres** pour les produits emballés, là où l'IA est la moins pertinente et
   où une base structurée est exacte.
4. **Recettes composées** — un plat maison enregistré une fois avec ses portions.
5. **Export des données** (obligation de portabilité RGPD à traiter avant une
   distribution publique).
6. **Widget et raccourci Siri** — « ajouter un repas » sans ouvrir l'application. Très
   aligné avec le principe des trois taps.

## Risques identifiés

| Risque | Impact | Atténuation |
|---|---|---|
| L'estimation IA est trop imprécise sur les portions | Le produit perd sa promesse | Mesurer le taux de correction dès le jalon 2 ; la fourchette et les hypothèses affichées rendent l'imprécision gérable plutôt que trompeuse |
| Sous-déclaration systématique des apports | Calibration faussée vers le bas, spirale de restriction | Garde-fou de suspension, biais du prompt vers la borne haute, plancher d'apport |
| Abandon de la pesée | Plus de calibration possible | Rappel matinal, tendance lissée pour désamorcer l'angoisse de la balance, gel plutôt que dégradation de la mesure |
| Coût des estimations | Modèle économique | Favoris (le levier principal), cache de prompt, limite quotidienne |
| Fuseaux et clôture de journée | Bugs silencieux d'attribution des entrées | `local_date` figé à l'écriture, tests explicites sur changement d'heure et voyage |
