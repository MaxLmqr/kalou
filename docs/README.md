# Spécification Kalou

Kalou suit les calories ingérées et dépensées au quotidien, dans le but d'une perte
de poids tenable. Cette spécification définit le fonctionnement fonctionnel et la
structure technique de l'application, indépendamment de l'implémentation en cours.

## Documents

| # | Document | Contenu |
|---|---|---|
| 01 | [Vision et périmètre](01-vision-et-perimetre.md) | Problème, utilisateur, principes, non-objectifs |
| 02 | [Modèle calorique](02-modele-calorique.md) | **Le cœur.** BMR, NEAT, TEF, MET, calibration, objectif |
| 03 | [Parcours utilisateur](03-parcours-utilisateur.md) | Écrans, menu d'action rapide, onboarding, ton |
| 04 | [Estimation IA des repas](04-estimation-ia.md) | Photo/texte → calories, contrat, coûts, correction |
| 05 | [Modèle de données](05-modele-de-donnees.md) | Tables, invariants, fuseau horaire, historisation |
| 06 | [API](06-api.md) | Endpoints, contrats, mode hors-ligne, idempotence |
| 07 | [Roadmap](07-roadmap.md) | Découpage v1, jalons, ce qui attend |
| 08 | [Base d'aliments](08-base-aliments.md) | Composition d'un repas, source CIQUAL, recherche, portions |

## Décisions verrouillées

Ces choix sont arbitrés et ne sont pas rediscutés dans les documents :

1. **Dépense passive** — BMR par Mifflin-St Jeor + NEAT forfaitaire (15 % du BMR),
   puis **recalibration automatique** sur la tendance de poids réelle. Pas de
   sélecteur de niveau d'activité, pas de facteur d'activité figé.
2. **Saisie des repas** — deux chemins qui convergent vers une **même structure**
   (un repas est une liste de composants) : **estimation IA** (photo ou description
   textuelle) et **composition manuelle** depuis une base d'aliments ou en calories
   directes. L'estimation IA est un pré-remplissage du composeur, pas un mode
   parallèle. Cf. [08](08-base-aliments.md).
3. **Base d'aliments** — **CIQUAL (ANSES)**, importée et embarquée, donc utilisable
   hors ligne. Pas d'Open Food Facts ni de code-barres en v1.
4. **Saisie des dépenses** — **durée + type d'activité**, converti en calories via
   une table MET et le poids courant. Pas de saisie directe en kcal en v1.
5. **Suivi** — calories **et poids** (pesées + objectif de perte). Le poids n'est pas
   une option : c'est lui qui alimente la recalibration.

## Hypothèses prises par défaut

À valider, mais non bloquantes — elles sont assumées dans les documents :

- **Mono-utilisateur par compte**, authentification Sign in with Apple / Google +
  e-mail à code unique. Pas de mot de passe.
- **Journée = minuit à minuit** dans le fuseau du profil, avec une bascule optionnelle
  à 03 h 00 pour les couche-tard (cf. 05).
- **Hors-ligne** : la saisie fonctionne toujours ; l'estimation IA est mise en file
  d'attente et se résout au retour du réseau (cf. 04, 06).
- **Unités métriques** (kg, cm, kcal). Pas de lb/ft en v1.
- **Une seule langue : le français.** Les libellés d'activités et les prompts IA sont
  en français, pas de i18n en v1.

## Corrections apportées au cadrage initial

- **Le TEF (thermogenèse alimentaire, ~10 % des apports) est réintroduit** dans le
  calcul. L'illustration échangée pendant le cadrage (BMR 1 790 + NEAT 270 =
  2 060 kcal) l'omettait : la dépense d'équilibre réelle est plus proche de
  2 290 kcal. L'omettre reviendrait à donner un budget ~230 kcal trop bas, soit un
  déficit involontaire de 40 % supérieur à l'objectif affiché. Le détail du calcul
  est en [02](02-modele-calorique.md#tef).
- **La saisie manuelle est un chemin de premier rang, pas un filet de sécurité.**
  Le cadrage initial ne retenait que l'estimation IA ; savoir précisément ce qu'on
  mange (cuisine maison, ingrédients connus) est un cas fréquent où l'addition bat
  l'estimation visuelle. D'où la base d'aliments et le composeur de repas décrits en
  [08](08-base-aliments.md).
- **Un repas est une liste de composants, quelle qu'en soit l'origine.** Cette
  unification remplace le champ `detail_aliments` (jsonb) initialement prévu par une
  vraie table fille : c'est ce qui permet de corriger une ligne d'estimation sans
  réécrire le total, et de mélanger dans un même repas une ligne issue de la base et
  une ligne saisie à la main.

## Questions ouvertes

Listées ici plutôt que tranchées seul, car elles engagent le produit :

- **Plancher calorique de sécurité** — 1 500 kcal (homme) / 1 200 kcal (femme) est
  la valeur retenue par défaut. À confirmer, avec le message d'avertissement associé.
- **Rythme de perte maximal proposé** — plafonné à 1 % du poids corporel par semaine.
  Faut-il autoriser au-delà en assumant un avertissement explicite ?
- **Version CIQUAL à importer** — à figer sur la publication ANSES la plus récente au
  moment de l'import, et à citer dans l'écran « Sources » (Licence Ouverte 2.0).
- **Étendue du sous-ensemble curé** — ~300 aliments réécrits et promus est l'ordre de
  grandeur retenu. C'est un travail manuel : à confirmer avant de le lancer.
- **Conservation des photos de repas** — vignette conservée pour l'historique, ou
  suppression immédiate après estimation ? Enjeu RGPD et confiance.
- **Notifications** — rappel de pesée matinal et récapitulatif du soir sont-ils dans
  la v1, ou différés ?
