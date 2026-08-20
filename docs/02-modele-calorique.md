# 02 — Modèle calorique

Ce document est la référence normative des calculs. Toute divergence entre le code et
ce document est un bug de l'un des deux. Les termes employés ici sont définis dans le
[lexique](00-lexique.md).

## 1. Vue d'ensemble

La dépense énergétique totale se décompose en quatre briques :

```
Dépense totale = BMR + NEAT + TEF + EAT

BMR   métabolisme de base — calculé (Mifflin-St Jeor)          60-70 %
NEAT  activité non sportive (marche, debout, ménage) — estimé   15-25 %
TEF   thermogenèse alimentaire (digestion) — 10 % des apports   ~10 %
EAT   sport volontaire — saisi par l'utilisateur              0-20 %
```

Kalou appelle **socle** (`baseline`) la somme `BMR + NEAT`, c'est-à-dire la dépense
d'une journée sans sport, hors digestion. Le socle est d'abord estimé par formule,
puis **mesuré** par calibration (§ 5). C'est la seule grandeur que la calibration
corrige ; tout le reste est calculé.

## 2. BMR — Mifflin-St Jeor

Retenu parce que c'est l'estimateur le plus fiable sans mesure en laboratoire
(±10 % sur la population générale), et qu'il ne demande que des données que
l'utilisateur connaît.

```
BMR = 10 × poids(kg) + 6,25 × taille(cm) − 5 × âge(années) + s

  s = +5     (homme)
  s = −161   (femme)
```

**Entrées** : le `poids` utilisé est la **tendance lissée** (§ 4), jamais une pesée
brute — sinon l'apport cible oscille de 40 kcal au gré de la rétention d'eau. L'âge est
recalculé à chaque changement d'année civile de naissance.

**Sexe non renseigné ou non binaire** : proposer les deux formules et laisser choisir
la plus proche, en expliquant qu'il s'agit d'un paramètre de calcul de masse maigre
et non d'une identité. La calibration corrigera l'écart (~165 kcal) en deux semaines.

**Recalcul** : à chaque mise à jour de la tendance de poids. Perdre 10 kg fait baisser
le BMR de 100 kcal — c'est une des deux causes classiques de plateau, et elle est ici
prise en compte automatiquement.

## 3. Socle, TEF et apport cible du jour

### 3.1 NEAT forfaitaire (phase initiale)

```
NEAT = 0,15 × BMR
socle_formule = BMR × 1,15
```

Le facteur 1,15 correspond à une vie de bureau avec des déplacements ordinaires. Il
est volontairement **prudent** : mieux vaut un apport cible légèrement bas qui se
corrige vers le haut (« Kalou t'a rendu 200 kcal ») qu'un apport trop optimiste qui ne
produit aucune perte. Aucune question n'est posée à l'utilisateur — cette valeur est
transitoire par construction.

### 3.2 TEF {#tef}

Digérer coûte environ 10 % des calories ingérées. Le TEF ne peut donc pas être une
constante : il dépend de ce qui est mangé, c'est-à-dire de ce que l'apport cible
autorise. La résolution est immédiate.

Soit `A` l'apport d'équilibre (celui pour lequel la balance est nulle) :

```
A = socle + EAT + 0,10 × A
A × 0,90 = socle + EAT
A = (socle + EAT) / 0,90
```

`A` est la grandeur affichée à l'utilisateur comme **« besoin énergétique
journalier »** : le nombre de calories qu'il peut manger sans ni perdre ni prendre.
L'apport cible en découle :

```
apport_cible = (socle + EAT − déficit) / 0,90
```

Le déficit est divisé par 0,90 lui aussi, et c'est correct : manger moins réduit aussi
le coût de la digestion. Obtenir un déficit énergétique réel de 550 kcal demande de
retirer 611 kcal de l'assiette.

**Exemple** — homme, 35 ans, 85 kg, 178 cm, objectif 0,5 kg/semaine, pas de sport :

```
BMR               = 10×85 + 6,25×178 − 5×35 + 5   = 1 792 kcal
socle             = 1 792 × 1,15                  = 2 061 kcal
besoin_journalier = 2 061 / 0,90                  = 2 290 kcal
déficit           = 0,5 × 1 100                   =   550 kcal
apport_cible      = (2 061 − 550) / 0,90          = 1 679 kcal
```

Vérification : à 1 679 kcal ingérées, TEF = 168, dépense totale = 2 229, balance =
1 679 − 2 229 = −550 kcal. ✓

### 3.3 Après calibration

La dépense mesurée par calibration (§ 5) **contient déjà le TEF**, puisqu'elle est
déduite d'un bilan énergétique réel. Le facteur 0,90 ne s'applique donc plus :

```
besoin_journalier = socle_calibré + EAT_du_jour
apport_cible      = besoin_journalier − déficit
```

L'incohérence résiduelle (le TEF mesuré l'a été au niveau d'apport de la fenêtre
d'observation, pas à celui du jour) est de second ordre : environ ±20 kcal pour une
variation d'apport de 200 kcal. Elle est ignorée sciemment.

### 3.4 Transition entre les deux régimes

Les § 3.2 et § 3.3 décrivent deux régimes, mais le socle transite progressivement
de l'un à l'autre (§ 5.3). Basculer brutalement du diviseur 0,90 au régime calibré
dès que `w > 0` ferait tomber l'apport cible de l'exemple ci-dessus de 1 679 à
1 511 kcal — précisément le saut que § 5.3 cherche à éviter.

La correction de TEF est donc interpolée en même temps que le socle :

```
facteur_tef = w + (1 − w) / 0,90

besoin_journalier = (socle_appliqué + EAT) × facteur_tef
apport_cible      = (socle_appliqué + EAT − déficit) × facteur_tef
```

`w = 0` redonne le § 3.2 à l'identique, `w = 1` le § 3.3. C'est cohérent
physiquement : la part de TEF à ajouter décroît à mesure que le socle mesuré —
qui la contient déjà — prend le pas sur le socle formulé.

## 4. Tendance de poids

Une pesée brute contient 0,5 à 2 kg de bruit (hydratation, contenu digestif, cycle
hormonal). Aucune décision n'est prise sur une pesée brute.

**Lissage exponentiel** (EMA), appliqué dans l'ordre chronologique des pesées :

```
tendance_0 = première pesée
tendance_n = tendance_{n−1} + α × (pesée_n − tendance_{n−1})
  avec α = 0,15   (demi-vie ≈ 4,3 jours)
```

- Une journée sans pesée ne met pas à jour la tendance (pas d'interpolation).
- Après une interruption de plus de 14 jours, la tendance est **réinitialisée** sur
  la première nouvelle pesée : la valeur d'avant ne décrit plus le corps actuel.
- Une pesée s'écartant de plus de 3 kg de la tendance est acceptée mais signalée
  (« pesée inhabituelle — erreur de saisie ? »), pour ne pas polluer la calibration
  avec un 8,5 kg tapé au lieu de 85 kg.
- L'utilisateur voit la courbe de tendance en trait plein et ses pesées en points.
  C'est ce qui désamorce l'angoisse du « +800 g ce matin ».

## 5. Calibration automatique

Le principe : sur une fenêtre suffisamment longue, la variation de poids révèle la
dépense réelle. C'est une mesure, pas une estimation.

### 5.1 Fenêtre et conditions

- Fenêtre glissante de **14 jours** (`N = 14`).
- Conditions d'activation : au moins **11 jours sur 14 avec apports saisis** et au
  moins **6 pesées** dans la fenêtre. Le nombre de jours fait foi : 11/14 vaut
  78,6 %, un seuil exprimé en « 80 % » en donnerait 12.
- Première calibration possible au **jour 10** ; poids plein accordé au **jour 28**.
- Si les conditions ne sont plus réunies, la dernière valeur calibrée est **gelée**
  (jamais recalculée à la baisse sur des données trouées) et l'état est affiché.

### 5.2 Calcul

```
Δ_poids      = tendance(fin fenêtre) − tendance(début fenêtre)        [kg]
E_mobilisée  = Δ_poids × 7 700                                       [kcal]
dépense_mesurée = (Σ apports_fenêtre − E_mobilisée) / N              [kcal/j]
socle_mesuré    = dépense_mesurée − (Σ EAT_net_fenêtre / N)          [kcal/j]
```

`7 700 kcal/kg` est la densité énergétique du tissu adipeux. L'hypothèse « le poids
perdu est du gras » est fausse les premiers jours (glycogène et eau) et
approximativement vraie ensuite — c'est précisément pourquoi la fenêtre est de
14 jours et pourquoi la première calibration attend le jour 10.

**Le soustraction du sport est essentielle** : la dépense mesurée inclut les séances
de la fenêtre. Sans la retirer, le sport serait compté deux fois — une fois dans le
socle, une fois à la saisie du jour.

### 5.3 Transition progressive

```
w = clamp((jours_valides_cumulés − 10) / 18 ; 0 ; 1)
socle_appliqué = w × socle_mesuré + (1 − w) × socle_formule
```

`w` passe de 0 (jour 10) à 1 (jour 28). Pas de saut visible dans l'apport cible.

`jours_valides_cumulés` compte les jours avec apports saisis **depuis le début du
suivi**, à ne pas confondre avec les jours valides *de la fenêtre* du § 5.1 (qui
conditionnent l'activation). Avec ces derniers, `w` plafonnerait à
(14 − 10) / 18 ≈ 0,22 et la mesure ne prendrait jamais le pas sur la formule.

### 5.4 Garde-fous

Non négociables — ils protègent d'une spirale documentée.

| Garde-fou | Règle | Raison |
|---|---|---|
| Vitesse de variation | `socle_appliqué` ne bouge pas de plus de **±5 % par semaine** | Absorbe un artefact de fenêtre |
| Bornes absolues | `socle_appliqué ∈ [BMR × 1,00 ; BMR × 2,20]` | Une valeur hors de cet intervalle est un bug de données, pas une physiologie |
| Sous-déclaration | Calibration suspendue sous **11 jours saisis sur 14** | **La spirale** : sous-déclarer les apports fait mesurer une dépense trop basse, donc rétrécit l'apport cible, donc aggrave la faim et la sous-déclaration |
| Plancher d'apport | `apport_cible ≥ plancher` — 1 500 (H) / 1 200 (F) | Sécurité sanitaire ; si le déficit visé l'exige, on réduit le rythme et on le dit. Le BMR **n'est pas** un plancher : combiné au socle NEAT de +15 %, il rendrait le rythme recommandé par défaut inatteignable pour le profil du § 3.2, dont l'apport cible de 1 679 kcal est pourtant celui de ce document |

### 5.5 Ce que l'utilisateur voit

Un écran de calibration, consultable, jamais imposé :

> **Kalou a mesuré ta dépense**
> 2 285 kcal par jour — au lieu de 2 061 estimés.
> Mesuré sur tes 14 derniers jours : 27 300 kcal saisies, −0,65 kg de tendance.
> Ton apport cible augmente de 56 kcal.

Le socle gagne 224 kcal mais l'apport cible n'en gagne que 56 : la mesure **contient
déjà** le coût de la digestion, que la formule ajoutait par-dessus (§ 3.4). Sans une
phrase pour le dire, l'écart entre les deux chiffres se lit comme une erreur de
calcul — l'écran doit l'expliquer, pas seulement l'afficher.

Cette transparence est fonctionnelle : elle explique pourquoi l'apport cible a changé, ce
qui évite l'interprétation « l'appli déraille ».

## 6. Objectif de perte et déficit

```
déficit_quotidien = rythme_kg_semaine × 7 700 / 7
                  = rythme_kg_semaine × 1 100
```

| Rythme | Déficit/jour | Convient à |
|---|---|---|
| 0,25 kg/sem | 275 kcal | Perte lente, quasi indolore, forte adhérence |
| 0,5 kg/sem | 550 kcal | Défaut recommandé |
| 0,75 kg/sem | 825 kcal | Exigeant, à surveiller |
| 1,0 kg/sem | 1 100 kcal | Uniquement si le poids de départ le permet |

**Plafonds** appliqués silencieusement puis expliqués :

- rythme ≤ **1 % du poids corporel par semaine** (à 85 kg : 0,85 kg/sem) ;
- déficit ≤ **25 % du besoin énergétique journalier** ;
- apport cible ≥ plancher de sécurité (§ 5.4).

Si l'objectif choisi viole une contrainte, Kalou propose le rythme le plus proche
atteignable et affiche la date d'atteinte estimée pour les deux, plutôt que de refuser.

**Date d'atteinte** = `(tendance_actuelle − poids_cible) / rythme`, arrondie à la
semaine, présentée comme une projection et recalculée à chaque calibration.

## 7. Dépense sportive (EAT) par table MET

Le MET est un multiple de la dépense de repos. La formule usuelle donne la dépense
**brute** :

```
kcal_brut/min = MET × 3,5 × poids(kg) / 200
```

Le BMR couvrant déjà le repos pendant la séance, Kalou retient la dépense **nette** —
sans quoi une heure de yoga « rapporterait » 130 kcal déjà comptées dans le socle :

```
kcal_net = (MET − 1) × 3,5 × poids(kg) / 200 × durée(min)
```

**Exemple** — course à 8 km/h (MET 8,3), 45 min, 85 kg :

```
brut = 8,3 × 3,5 × 85 / 200 × 45 = 556 kcal
net  = 7,3 × 3,5 × 85 / 200 × 45 = 489 kcal   ← retenu
```

Le `poids` utilisé est la tendance du jour, et il est **figé dans l'enregistrement**
(cf. 05) : l'historique ne doit pas se réécrire quand le poids change.

### Table MET de départ

Valeurs issues du *Compendium of Physical Activities* (Ainsworth et al.), arrondies.
Une seule entrée par activité — pas de déclinaison par intensité en v1, sauf pour la
marche et la course où l'écart est trop grand pour être ignoré.

| Activité | MET | Activité | MET |
|---|---|---|---|
| Marche tranquille (4 km/h) | 3,0 | Vélo tranquille (16 km/h) | 6,0 |
| Marche rapide (6 km/h) | 4,3 | Vélo soutenu (25 km/h) | 10,0 |
| Randonnée | 6,0 | Natation | 7,0 |
| Course 8 km/h | 8,3 | Rameur | 7,0 |
| Course 10 km/h | 9,8 | Elliptique | 5,0 |
| Course 12 km/h | 11,5 | Corde à sauter | 11,0 |
| Musculation modérée | 3,5 | HIIT / circuit | 8,0 |
| Musculation intense | 6,0 | Football | 7,0 |
| Yoga | 2,5 | Tennis | 7,3 |
| Pilates | 3,0 | Danse | 5,0 |
| Escaliers / stepper | 8,0 | Ménage, jardinage | 3,5 |

La table est servie par l'API (cf. 06) et mise en cache par le client, pour pouvoir
être enrichie sans publier une version de l'application.

## 8. Balance et journée

```
apports_du_jour   = Σ kcal des entrées alimentaires de la journée locale
EAT_du_jour       = Σ kcal_net des activités de la journée locale
besoin_journalier = (socle_appliqué + EAT_du_jour) × facteur_tef      (cf. § 3.4)
apport_cible      = (socle_appliqué + EAT_du_jour − déficit) × facteur_tef
restant           = apport_cible − apports_du_jour
dépense_réelle    = socle_appliqué + EAT_du_jour + (1 − w) × 0,10 × apports_du_jour
balance           = apports_du_jour − dépense_réelle
```

- **`restant`** est le chiffre unique de l'écran d'accueil. Il peut être négatif ;
  il s'affiche alors en neutre, sans alarme.
- **`balance`** est la grandeur historisée et cumulée : c'est elle qui se compare à
  la perte de poids réelle. Son TEF porte sur ce qui a **réellement** été mangé, et
  non sur l'apport d'équilibre — d'où `dépense_réelle`, distincte de
  `besoin_journalier`. Facturer le TEF de l'apport d'équilibre surestimerait le
  déficit dès que l'utilisateur s'écarte de son apport cible : sur l'exemple du § 3.2,
  −611 au lieu de −550. C'est cette définition qui est cohérente avec le § 5.2, où
  la dépense est déduite d'un bilan énergétique réel.
- **`besoin_journalier`** reste l'apport d'équilibre `A` : c'est le chiffre affiché,
  et il a l'avantage de ne pas bouger au fil des saisies de la journée.
- Une activité saisie **augmente** l'apport cible du jour. C'est cohérent avec le modèle
  (le socle ne contient pas le sport) et c'est le comportement attendu ; le risque de
  surestimation est contenu par l'usage du MET net et par la calibration, qui
  retirera l'excédent du socle.

## 9. Plancher protéique

Seule grandeur non calorique du modèle. Elle ne modifie aucun calcul d'énergie : c'est
un repère affiché, pas une contrainte.

```
plancher_proteines = 1,6 × poids(kg)        arrondi à 5 g près
```

Avec la tendance lissée à 85 kg : **136 g par jour**.

**Pourquoi cette grandeur et pas les autres.** Dans un déficit, le corps puise dans le
tissu adipeux *et* dans le muscle. Or le muscle consomme de l'énergie au repos :
en perdre fait baisser le BMR, donc l'apport cible, donc installe le plateau. Un apport
protéique suffisant fait que la masse perdue est majoritairement grasse. Accessoirement,
c'est le macronutriment le plus rassasiant à calories égales, ce qui aide à tenir le
déficit. Les glucides et les lipides n'ont pas d'effet comparable sur l'objectif et
restent hors périmètre.

**C'est un plancher, pas une cible** : le dépasser n'est pas un écart, et l'interface ne
doit pas le présenter comme tel.

**Somme incomplète.** Un composant saisi en calories libres (§ 3 de
[08](08-base-aliments.md)) ne porte pas de valeur protéique. Le total du jour est donc
une **borne inférieure** dès qu'une entrée libre est présente, et doit s'afficher comme
telle (« ≥ 78 g ») plutôt que comme une valeur exacte. Afficher un chiffre faussement
précis sur une donnée partielle est pire que de ne rien afficher.

## 10. Journal des grandeurs figées

Pour que l'historique soit auditable et stable, sont **figés à l'écriture** et jamais
recalculés : le `poids` utilisé pour un calcul MET, les kcal d'une entrée alimentaire
validée, et le triplet `(BMR, socle, déficit)` du récapitulatif quotidien. Un
changement de profil n'altère pas le passé.
