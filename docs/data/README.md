# Jeu de curation des aliments

## Ce que contient `aliments-premier-jet.csv`

203 aliments couvrant une cuisine française du quotidien, destinés à être marqués
`promu` dans la table `foods` (cf. [08](../08-base-aliments.md) § 5). C'est le
sous-ensemble affiché par défaut dans la recherche ; le reste de CIQUAL n'apparaît que
sur demande explicite.

| Colonne | Rôle |
|---|---|
| `categorie` | Regroupement d'affichage et de relecture. Pas destiné à l'interface. |
| `libelle` | **Libellé réécrit**, celui qui s'affiche. « Pois chiches cuits », pas « Pois chiches, cuits à l'eau, non salés ». |
| `alias` | Synonymes de recherche, séparés par `\|`, sans accents. Alimente `food_aliases`. |
| `kcal_100g_indicatif` | **Valeur d'attente, à remplacer par CIQUAL.** Voir l'avertissement ci-dessous. |
| `unite_base` | `g` ou `ml`. |
| `portion_1`, `grammes_1` | Portion domestique principale, proposée en premier dans le sélecteur de quantité. |
| `portion_2`, `grammes_2` | Portion secondaire, facultative. |

## Avertissement sur les calories

**Les valeurs `kcal_100g_indicatif` ne sont pas des valeurs CIQUAL.** Ce sont des
ordres de grandeur, justes à ±15 % pour la plupart des lignes, destinés uniquement à
rendre le fichier relisible et à permettre de développer avant l'import.

La valeur de ce fichier est ailleurs : dans le **choix** des aliments, la **réécriture**
des libellés, les **alias** et les **portions domestiques** — c'est-à-dire précisément
ce que CIQUAL ne fournit pas. Les chiffres nutritionnels, eux, doivent venir de CIQUAL.

## Procédure d'import

**En V0, ce fichier est la base** : il est semé tel quel dans `foods`
(`source = 'ciqual'`, `reference_version = 'curation-v0'`), avec ses alias et ses
portions. Les étapes ci-dessous décrivent le passage à CIQUAL, prévu en V0.1, qui
remplace les valeurs sans toucher aux libellés.

1. Importer le jeu CIQUAL complet dans `foods` (`source = 'ciqual'`), en enregistrant
   la version publiée dans `reference_version`.
2. Pour chaque ligne de ce CSV, rapprocher le `libelle` d'un aliment CIQUAL —
   automatiquement par similarité, puis **relecture manuelle du rapprochement**, qui est
   l'étape où les erreurs se glissent (« pois chiches secs » au lieu de « cuits » fait
   un facteur 2,6).
3. Sur l'aliment rapproché : `promu = true`, `libelle` remplacé par celui du CSV,
   `libelle_origine` conservé, insertion des `food_aliases` et des `food_portions`.
4. Consigner les lignes non rapprochées : ce sont soit des plats composés absents de
   CIQUAL (kebab, burger, sushi), soit des libellés à corriger. Les premières deviennent
   des aliments `source = 'perso'` avec les valeurs indicatives du CSV, faute de mieux.

## Limites connues

- **Les plats composés** (pizza, kebab, sandwich, salade César, burger) n'ont pas
  d'équivalent CIQUAL fiable et leurs calories varient énormément selon la préparation.
  Ils restent utiles comme repère grossier, mais l'estimation IA ou une composition
  ingrédient par ingrédient sera toujours plus juste.
- **L'état de préparation est décidé pour toi** : les féculents et légumineuses sont
  listés cuits, parce que c'est ce qu'on met dans l'assiette. Se tromper de ligne entre
  cru et cuit est l'erreur la plus coûteuse de tout le fichier (riz cru 350 kcal/100 g,
  riz cuit 130) — d'où l'absence délibérée des versions crues dans le sous-ensemble
  promu.
- **Les boissons alcoolisées** sont approximatives par nature (degré variable).
- **Rien ici n'est personnalisé** : à toi de retirer ce que tu ne manges jamais et
  d'ajouter tes récurrents. Une ligne inutile coûte un résultat de recherche parasite,
  donc l'élagage a de la valeur.
