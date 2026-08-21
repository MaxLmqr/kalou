# 07 — Roadmap

## Principe de découpage

Le V0 est une **boucle fermée** : définir un objectif, voir son apport cible, saisir ce
qu'on mange et ce qu'on dépense, se peser. Elle produit de la valeur seule, sans
calibration, sans estimation IA, sans historique. Tout ce qui suit améliore la justesse
ou le confort d'une boucle qui tourne déjà.

Deux règles ont guidé l'ordre :

1. **Collecter avant d'exploiter.** La pesée quotidienne est dans le V0 alors que rien
   ne l'utilise encore, parce que la calibration a besoin de 14 jours d'historique. La
   collecter plus tard, c'est retarder d'autant le jour où l'apport cible devient juste.
2. **Rien de manuel sur le chemin critique.** Ce qui demande du travail de contenu —
   le rapprochement CIQUAL, la relecture des libellés — est sorti du V0 sans en retirer
   la structure (§ V0, base d'aliments).

## Fait

- Monorepo Bun + Turbo, `apps/api` (Elysia), `apps/mobile` (Expo), `packages/db`
  (Drizzle + Postgres).
- Connexion par code e-mail (Better Auth), avec code de développement connectant
  n'importe quelle adresse tant qu'aucun envoi d'e-mails n'est branché.
- Modèle calorique du doc 02 implémenté côté domaine, avec ses tests.
- Design system mobile, navigation, premiers écrans.

## V0 — la boucle

**Critère de sortie : je suis mes calories sur moi, tous les jours, sans rien attendre
de l'application.**

- **Onboarding** — 4 écrans : morphologie, poids, rythme, apport cible. Vu une seule
  fois, donc juste et non poli.
- **Accueil** — le chiffre restant, les trois lignes de détail, le journal du jour.
- **Saisir un repas** — composeur : composants `reference` (un aliment, une quantité →
  les calories suivent) et `libre` (un libellé, un nombre). Recherche dans la base,
  portions domestiques, quantité pré-remplie sur la dernière utilisée.
- **Base d'aliments** — semée depuis
  [`data/aliments-premier-jet.csv`](data/aliments-premier-jet.csv) : 203 aliments,
  libellés déjà réécrits, alias et portions inclus. **Les valeurs caloriques sont
  indicatives** (±15 %) et seront remplacées par CIQUAL en V0.1 — voir la note ci-dessous.
- **Saisir une dépense** — table MET, durée → calories nettes. Référentiel semé, calcul
  et routes en place ; il ne manque que l'écran.
- **Se peser** — une pesée par jour, tendance lissée calculée et affichée. Collectée
  pour la calibration à venir, et visible dans le journal du jour comme les autres
  saisies.

> **Aucune surface de calibration dans le V0.** Ni pastille de phase sur l'accueil, ni
> écran, ni promesse de mesure à venir dans l'onboarding : l'application ne connaît que
> le régime du § 3.2 du doc 02. L'anticiper à l'écran aurait engagé ce qu'elle ne fait
> pas encore, et rendu l'accueil plus difficile à lire pour rien.

> **Sur les calories indicatives.** Les valeurs du jeu de curation sont des ordres de
> grandeur, pas des mesures. Deux raisons pour lesquelles c'est acceptable en V0 : la
> calibration absorbe la part **systématique** de l'erreur (un biais constant s'annule,
> cf. § 5 du doc 02), et les entrées figent `kcal_ref_utilise` à l'écriture, donc
> l'arrivée de CIQUAL ne réécrira pas l'historique. Ce qui reste faux reste faux, mais
> de façon stable et bornée.

## V0.1 — la justesse

**Critère de sortie : mon apport cible n'est plus une estimation, c'est une mesure.**

- **Calibration** — travail de fond quotidien, fenêtre de 14 jours, transition
  progressive, garde-fous. Exploite les pesées et les apports collectés depuis le V0,
  donc opérationnelle dès le quatorzième jour d'usage réel.
- **Écran de calibration** et ses trois états, avec l'explication de l'écart entre socle
  mesuré et apport cible (§ 5.5 du doc 02).
- **Historique** — courbe de poids (tendance et pesées), balance quotidienne, et le
  couple perte prédite / perte observée qui est le seul indicateur de véracité du modèle.
- **Import CIQUAL** — remplace les valeurs indicatives par les valeurs ANSES.
  Indépendant du reste, donc parallélisable : rapprochement automatique par similarité
  puis **relecture manuelle** des 203 rapprochements, qui est l'étape où les erreurs se
  glissent (« pois chiches secs » au lieu de « cuits » fait un facteur 2,6).
- **Plancher protéique** — dépend de l'import CIQUAL, qui apporte les valeurs
  protéiques que le jeu de curation ne contient pas.

## V0.2 — le confort

**Critère de sortie : je photographie une assiette et les composants se remplissent.**

- **Estimation IA** — `POST /estimations`, prompt système, table de portions de
  référence, sortie structurée validée.
- Flux non bloquant : l'entrée existe avant le résultat ; correction ligne à ligne ;
  verrou `edited_by_user` au composant.
- Rapprochement best-effort des composants estimés avec la base d'aliments.
- Chemin texte libre, fusionné avec la recherche dans un champ unique.
- Journalisation des estimations : coût, latence, et surtout **taux de correction**,
  seul indicateur de qualité disponible en production.
- **Repas enregistrés** et réutilisations en un tap, avec redimensionnement. Dépend d'un
  historique réel, donc après quelques semaines d'usage.

## V0.3 — la robustesse

**Critère de sortie : une saisie faite sans réseau n'est jamais perdue.**

- File d'envoi locale (outbox) avec rejeu et `Idempotency-Key`.
- Cache de lecture de la journée courante.
- File d'estimations différées.
- Aliments perso, pour ce que ni CIQUAL ni l'IA ne couvrent.

Sans second appareil, il n'y a ni synchronisation différentielle, ni résolution de
conflits : il ne reste que le rejeu des écritures.

## Après

Par ordre d'intérêt décroissant, sans engagement :

1. **Vue hebdomadaire** — apports, dépense et balance agrégés sur la semaine, pour
   prendre du recul sur un écart isolé. Vue de lecture : la journée reste l'unité de
   décision et l'apport cible ne devient pas hebdomadaire.
2. **Glucides et lipides affichés** — les données sont déjà stockées, c'est de
   l'affichage.
3. **Pas via Apple Health** — remplace le NEAT forfaitaire par une mesure quotidienne.
   Gain réel mais borné par la calibration.
4. **Code-barres et Open Food Facts** — pour les produits de marque, là où ni l'IA ni
   CIQUAL ne sont pertinents.
5. **Recherche d'aliments hors ligne** — jeu CIQUAL embarqué et index FTS5, si l'absence
   de réseau se révèle gênante.
6. **Widget et raccourci Siri** — saisir un repas sans ouvrir l'application. Très aligné
   avec le principe des trois taps.
7. **Recettes structurées** — rendement, portions produites, échelle d'ingrédients. Les
   repas enregistrés redimensionnables couvrent l'essentiel ; le reste attend un besoin
   constaté.

## Risques identifiés

| Risque | Impact | Atténuation |
|---|---|---|
| Abandon de la saisie | Sans apports, plus de calibration, et l'application ne sert plus à rien | C'est la raison d'être du V0 minimal : trois taps, aucune attente, aucune dépendance réseau au-delà de la recherche |
| Abandon de la pesée | Plus de calibration possible | Tendance lissée pour désamorcer l'angoisse de la balance ; gel de la dernière mesure plutôt que dégradation |
| Valeurs caloriques indicatives du V0 | Apport cible faux | La part systématique de l'erreur s'annule dans la calibration ; l'import CIQUAL du V0.1 corrige le reste |
| Recherche d'aliments inutilisable | Le composeur est abandonné au profit du composant libre | Le jeu de curation est déjà réécrit, avec alias et portions ; classement personnel dès les premiers usages |
| Estimation IA imprécise sur les portions | Le V0.2 perd sa promesse | Taux de correction mesuré dès le premier jour ; fourchette et hypothèses affichées, pour que l'imprécision soit lisible plutôt que trompeuse |
| Sous-déclaration **irrégulière** des apports | Calibration faussée | Un biais constant s'annule (§ 5 du doc 02) ; c'est l'irrégularité qui nuit, d'où le garde-fou des 11 jours sur 14 |
| Fuseaux et clôture de journée | Bugs silencieux d'attribution des entrées | `local_date` figé à l'écriture, tests explicites sur changement d'heure |
