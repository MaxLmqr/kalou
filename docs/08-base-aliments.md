# 08 — Base d'aliments et composition des repas

## 1. Le besoin

L'estimation IA couvre le cas « je mange, je photographie, je ne veux pas y penser ».
Elle ne couvre pas le cas symétrique : **je sais exactement ce que je mange**. Quand on
cuisine soi-même, on connaît ses ingrédients, et une estimation visuelle est alors
moins précise que la simple addition.

Cas de référence, à traiter littéralement :

> « Là, je sais que j'ai 123 kcal de pois chiches dans mon repas, 178 kcal de
> pignons, etc. »

Deux besoins distincts s'y cachent :

1. **Composer un repas** à partir de plusieurs composants, avec un total qui s'additionne
   sous les yeux.
2. **Renseigner un composant** soit en quantité (« 88 g de pois chiches cuits »), ce qui
   suppose une base d'aliments, soit directement en calories (« pois chiches,
   123 kcal »), ce qui n'en suppose aucune.

Les deux doivent coexister sans friction : dans un même repas, une ligne peut venir
de la base et la suivante être saisie à la main.

## 2. Trois chemins, une seule structure

C'est la décision structurante de ce document : **une entrée alimentaire est toujours
une liste de composants**, quelle que soit son origine.

```
   Photo ────────┐
                 │
   Description ──┼──► composants[]  ──► entrée alimentaire (kcal = Σ composants)
       (IA)      │
                 │
   Composition ──┘
     manuelle
```

L'estimation IA n'est plus un mode de saisie parallèle : c'est un **pré-remplissage du
composeur**. Le modèle renvoie des composants, l'utilisateur les ajuste, en supprime,
en ajoute un depuis la base. Un repas photographié et un repas composé à la main sont
le même objet, éditables des mêmes gestes.

Conséquences :

- une seule interface de repas à concevoir, tester et maintenir ;
- la correction d'une estimation devient granulaire (« les frites, c'était une petite
  portion ») au lieu d'être un total à réécrire ;
- l'historique est homogène : tout repas est décomposable, quelle qu'en soit l'origine.

## 3. Types de composants

| Type | Contenu | Calcul | Cas d'usage |
|---|---|---|---|
| `reference` | `food_id` + quantité + unité | `kcal = quantité × kcal_ref / 100` (ou × portion) | « 88 g de pois chiches cuits » |
| `libre` | libellé + kcal (+ macros optionnelles) | Saisi tel quel | « Pois chiches, 123 kcal » — je connais déjà la valeur |
| `ia` | libellé + quantité estimée + kcal | Produit par le modèle, éventuellement rapproché d'un `food` | Sortie de photo ou de description |

Un composant `ia` corrigé par l'utilisateur devient verrouillé (§ 9) mais garde son
type, afin que la mesure du taux de correction reste possible (cf.
[04](04-estimation-ia.md) § 9).

Le type `libre` est ce qui rend la base d'aliments **facultative** : le cas de
référence du § 1 fonctionne sans jamais ouvrir la base.

## 4. Source des données : CIQUAL

Retenue : **la table CIQUAL de l'ANSES**, référence nutritionnelle française.

| Critère | CIQUAL (retenu) | Open Food Facts (écarté en v1) |
|---|---|---|
| Contenu | ~3 200 aliments génériques, crus et préparés | ~3 M produits de marque |
| Adapté à | Ingrédients et plats maison — le besoin exprimé | Produits emballés, scan de code-barres |
| Qualité | Mesures de laboratoire, homogènes | Contributive, très inégale |
| Volume | ~2 Mo — embarquable dans l'application | Inembarquable, nécessite une API |
| Licence | Licence Ouverte / Etalab 2.0 | ODbL |
| Hors ligne | Total | Impossible |

CIQUAL est le bon outil pour « pois chiches » et « pignons de pin » ; Open Food Facts
serait le bon outil pour « barre Granola », c'est-à-dire pour le scan de code-barres,
qui reste hors v1 (cf. [07](07-roadmap.md)).

**Obligations** : la Licence Ouverte 2.0 impose la mention de la paternité. Un écran
« Sources » doit citer *« ANSES. Table de composition nutritionnelle des aliments
Ciqual »* avec la version importée. La **version du jeu de données est figée à
l'import** et enregistrée : sans cela, une mise à jour ANSES modifierait
silencieusement des valeurs déjà utilisées dans l'historique.

À faire au moment de l'import : vérifier la version publiée la plus récente sur le site
de l'ANSES, et n'importer que les colonnes utiles (énergie kcal, protéines, glucides,
lipides, fibres) — la table complète en compte plus de soixante.

## 5. Le vrai risque : la recherche

Le risque de ce chantier n'est pas technique, il est ergonomique. CIQUAL est une base
scientifique, avec des libellés cliniques et des variantes nombreuses :

```
Pois chiches, secs
Pois chiches, cuits à l'eau, non salés
Pois chiches, cuits à l'eau, salés
Pois chiches, appertisés, égouttés
Pois chiches, appertisés, non égouttés
Houmous, préemballé
...
```

Taper « pois chiche » et recevoir onze lignes indiscernables est un échec produit :
c'est exactement la friction que Kalou existe pour supprimer. Quatre mesures, à
implémenter ensemble :

1. **Sous-ensemble curé** — environ 300 aliments courants marqués `promu`, remontés en
   tête et seuls affichés par défaut. Le reste de CIQUAL n'apparaît que sur demande
   explicite (« voir toutes les variantes »).
2. **Libellés réécrits** — « Pois chiches cuits » plutôt que « Pois chiches, cuits à
   l'eau, non salés », le libellé CIQUAL d'origine restant conservé en second champ.
   Réécriture manuelle sur le sous-ensemble curé uniquement.
3. **Alias de recherche** — « pois chiche », « chickpea », « houmous » → même aliment.
   Table de synonymes alimentée à la main, puis par les recherches infructueuses
   observées.
4. **Classement personnel d'abord** — ce que *cet* utilisateur a déjà consommé remonte
   avant tout le reste. Après deux semaines d'usage, la recherche devient quasiment un
   accès direct.

Ordre de tri retenu :

```
1. aliments déjà consommés par l'utilisateur (par fréquence × récence)
2. aliments personnels créés par l'utilisateur
3. aliments promus (sous-ensemble curé), par similarité
4. reste de CIQUAL, par similarité — sur demande
```

**Implémentation de la recherche** : `unaccent` + `pg_trgm` côté Postgres ; index FTS5
sur la copie SQLite embarquée côté mobile. La recherche doit fonctionner **hors ligne
et sans latence** — c'est ce qui fait de la composition manuelle le chemin fiable
quand le réseau manque, là où l'estimation IA doit attendre.

## 6. Portions domestiques

Personne ne pense en grammes. Une base en kcal/100 g est inutilisable sans une couche
de portions :

| Aliment | Portion | Grammes |
|---|---|---|
| Huile d'olive | 1 cuillère à soupe | 10 g |
| Pignons de pin | 1 cuillère à soupe | 10 g |
| Pois chiches cuits | 1 portion | 150 g |
| Riz cuit | 1 bol | 200 g |
| Œuf | 1 unité (moyen) | 55 g |
| Pain | 1 tranche | 30 g |

Le sélecteur de quantité propose donc les portions connues de l'aliment **avant** la
saisie en grammes, avec la valeur en grammes visible pour rester vérifiable. Les
portions sont seedées pour le sous-ensemble curé et extensibles.

**Dernière quantité utilisée** : à la seconde consommation d'un aliment, la quantité
précédente est pré-remplie. C'est le raccourci le plus rentable de tout l'écran.

## 7. Exemple complet

Le cas du § 1, tel qu'il se déroule :

```
┌──────────────────────────────────────────┐
│  Composer un repas                       │
│  ┌────────────────────────────────────┐  │
│  │ 🔍 pois chiche                     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Pois chiches cuits        139 kcal/100g │
│  Houmous                   307 kcal/100g │
│  Pois chiches secs         364 kcal/100g │
│  ⌄ Voir toutes les variantes             │
│                                          │
│  ── Mon repas ─────────────────────────  │
│  Pois chiches cuits    88 g     123      │
│  Pignons de pin        26 g     175      │
│  Huile d'olive      1 c. à s.    90      │
│  ─────────────────────────────────────   │
│  Total                          388      │
│                                          │
│  [ Enregistrer ]   [ Enregistrer et     │
│                      réutiliser ]        │
└──────────────────────────────────────────┘
```

Et la variante sans base, pour la même assiette :

```
│  Pois chiches          —        123      │   ← composant libre
│  Pignons               —        178      │   ← composant libre
```

Les deux produisent une entrée valide, avec la même structure. Les valeurs kcal/100 g
citées ici sont indicatives et proviendront du jeu CIQUAL importé.

## 8. Aliments personnels et repas enregistrés

**Aliment personnel** — créé par l'utilisateur quand la base ne suffit pas : libellé,
kcal pour 100 g *ou* kcal par portion, macros optionnelles. Privé, jamais partagé,
indexé dans sa recherche au même rang que les aliments promus.

**Repas enregistré** — une composition sauvegardée sous un nom (« mon houmous », « bol
du midi »), réutilisable en un tap et **redimensionnable** par un facteur (× 0,5, × 2)
qui s'applique à tous ses composants. C'est ce qui absorbe la répétition sans passer
par l'IA, donc à coût nul.

Un repas enregistré est un favori de type `repas` porteur de composants (cf.
[05](05-modele-de-donnees.md)). Il n'y a pas d'objet « recette » distinct en v1 : pas de
gestion d'ingrédients, de rendement ni de portions produites.

## 9. Verrouillage et invariants

1. **Toute entrée alimentaire a au moins un composant.**
2. `food_entries.kcal = Σ composants.kcal`, recalculé à chaque écriture. Aucun total
   ne peut diverger de ses lignes ; un total « écrasé à la main » se modélise comme un
   composant `libre` unique.
3. Un composant modifié par l'utilisateur porte `edited_by_user = true` et n'est
   **jamais** réécrit par une estimation ultérieure. Le verrou est au composant, pas à
   l'entrée : corriger les frites ne gèle pas le burger.
4. Un composant `reference` fige `kcal_ref_utilise` à l'écriture : une mise à jour du
   jeu CIQUAL ne réécrit pas l'historique.
5. Supprimer un aliment personnel ne supprime pas les composants qui le citent — ils
   conservent leur libellé et leurs calories figés.
6. Arrondi à l'unité par composant, puis somme. Pas de somme sur des flottants
   affichés arrondis, sinon le total ne correspond pas aux lignes affichées.

## 10. Rapprochement des estimations IA

Quand le modèle renvoie « frites, 150 g », Kalou tente un rapprochement avec un aliment
de la base (`unaccent` + trigrammes, seuil élevé) et, s'il réussit, lie le composant à
`food_id` **sans remplacer les calories estimées**.

Bénéfice : l'aliment entre dans l'historique de consommation de l'utilisateur, donc
remonte dans ses recherches futures, et la correction de quantité devient un simple
changement de grammage. Le rapprochement est *best-effort* : un échec est silencieux et
sans conséquence, le composant reste de type `ia`.

## 11. Mise à jour du jeu de référence

Le jeu CIQUAL est versionné (`reference_version`). Le client télécharge la version
courante à l'installation puis les deltas. Un aliment retiré d'une version à l'autre est
marqué `actif = false` plutôt que supprimé — l'historique doit rester lisible.

Aucune mise à jour ne modifie une valeur déjà utilisée dans une entrée passée
(invariant § 9.4).
