# Spécification Kalou

Kalou suit les calories ingérées et dépensées au quotidien, dans le but d'une perte
de poids tenable. Cette spécification définit le fonctionnement fonctionnel et la
structure technique de l'application, indépendamment de l'implémentation en cours.

## Documents

| # | Document | Contenu |
|---|---|---|
| 00 | [Lexique](00-lexique.md) | **À lire d'abord.** Le vocabulaire de la spécification et du code |
| 01 | [Vision et périmètre](01-vision-et-perimetre.md) | Problème, utilisateur, principes, non-objectifs |
| 02 | [Modèle calorique](02-modele-calorique.md) | **Le cœur.** BMR, NEAT, TEF, MET, calibration, objectif |
| 03 | [Parcours utilisateur](03-parcours-utilisateur.md) | Écrans, menu d'action rapide, onboarding, ton |
| 04 | [Estimation IA des repas](04-estimation-ia.md) | Photo/texte → calories, contrat, coûts, correction |
| 05 | [Modèle de données](05-modele-de-donnees.md) | Tables, invariants, fuseau horaire, historisation |
| 06 | [API](06-api.md) | Endpoints, contrats, mode hors-ligne, idempotence |
| 07 | [Roadmap](07-roadmap.md) | Découpage v1, jalons, ce qui attend |
| 08 | [Base d'aliments](08-base-aliments.md) | Composition d'un repas, source CIQUAL, recherche, portions |
| — | [`data/`](data/) | Jeu de curation : 203 aliments promus, libellés, alias, portions |

> Le vocabulaire est factuel et emprunte au domaine quand un terme existe. Chaque terme
> a un sens unique dans toute la spécification **et dans le code** — identifiants,
> colonnes et champs d'API le reprennent tel quel. Un mot qui change se corrige dans le
> [lexique](00-lexique.md) d'abord.

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

## Cadre : application personnelle

**Kalou est écrit pour un seul utilisateur — son auteur.** Ce n'est pas une étape
avant une distribution : c'est le périmètre. Toute la spécification en découle, et
c'est ce qui justifie l'absence de pans entiers habituellement obligatoires.

Ce qui est délibérément absent, et qu'il faudrait ajouter pour distribuer un jour :

| Absent | Ce qu'il faudrait faire |
|---|---|
| ~~Authentification~~ | **Conservée** : Better Auth avec code par e-mail. Décision assumée — la bibliothèque était en place, et elle ouvre le multi-appareil sans reprise. En attendant un fournisseur d'e-mails, un code de développement connecte n'importe quelle adresse (cf. [06](06-api.md) § 2) |
| Inscription, comptes multiples | Pas d'écran d'inscription : la première connexion crée le compte |
| Synchronisation multi-appareil | Un seul appareil, donc un seul écrivain : une file d'envoi locale remplace tout moteur de synchronisation et sa résolution de conflits |
| Suppression logique (`deleted_at`) | Sans synchronisation, la suppression physique suffit |
| RGPD, portabilité, purge | Les données sont sur une base personnelle |
| Limites anti-abus | Un simple garde-fou de coût sur les appels au modèle |
| Conformité magasin d'applications (avertissements sanitaires, âge) | Sujet réel dès qu'un tiers utilise l'application |
| Modèle économique | ~2 $/mois de coût variable, assumé personnellement |
| i18n, unités impériales | Français et métrique en dur |

La règle à tenir : **ne pas re-spécifier ces sujets « au cas où »**. Ils sont écrits
ici pour être retrouvés le jour où la question se pose, pas pour être anticipés.

## Hypothèses prises par défaut

- **Journée = minuit à minuit**, fuseau `Europe/Paris` en configuration
  d'application (pas un champ de profil), avec une bascule optionnelle à 03 h 00.
- **Hors-ligne** : la saisie fonctionne toujours — un composant saisi en calories ne
  demande aucun réseau. La recherche d'aliments et l'estimation IA passent par l'API ;
  l'estimation est mise en file d'attente et se résout au retour du réseau (cf. 04, 06).
- **Unités métriques** (kg, cm, kcal).

## Corrections apportées au cadrage initial

- **Le TEF (thermogenèse alimentaire, ~10 % des apports) est réintroduit** dans le
  calcul. L'illustration échangée pendant le cadrage (BMR 1 790 + NEAT 270 =
  2 060 kcal) l'omettait : la dépense d'équilibre réelle est plus proche de
  2 290 kcal. L'omettre reviendrait à donner un apport cible ~230 kcal trop bas, soit un
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

Il n'en reste que deux, et ce sont les seules qui ne soient pas techniques :

- **Plancher calorique de sécurité** — 1 500 kcal par défaut. Ce n'est plus une
  question de responsabilité envers des tiers, mais un garde-fou que tu te poses à
  toi-même : à confirmer ou à ajuster.
- **Rythme de perte maximal** — plafonné à 1 % du poids corporel par semaine.
  Autoriser au-delà, en connaissance de cause ?
Tranchée depuis : **Better Auth est conservé**, avec un code de développement qui
connecte n'importe quelle adresse en attendant l'envoi d'e-mails. Le garde-fou qui
compte est le refus de démarrer en production avec ce raccourci actif (cf.
[06](06-api.md) § 2).

Tranchées depuis, pour mémoire : les photos de repas gardent une vignette locale
(plus de débat RGPD) ; les notifications restent dans le périmètre parce qu'elles sont
utiles et coûtent peu ; la version CIQUAL sera celle publiée au moment de l'import ; le
sous-ensemble curé est réduit à ~200 aliments, taille suffisante pour une cuisine
personnelle.
