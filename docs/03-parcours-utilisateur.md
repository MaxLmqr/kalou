# 03 — Parcours utilisateur

## 1. Le menu d'action rapide

C'est le cœur de l'application, au sens littéral : tout le reste est de la
consultation. Un bouton d'action flottant en bas de l'écran d'accueil ouvre une
feuille (bottom sheet) contenant **quatre actions** et, au-dessus, les **réutilisations
récentes**.

```
┌─────────────────────────────────┐
│  Réutiliser                     │
│  ┌───────┐ ┌───────┐ ┌───────┐  │
│  │ Café  │ │ Salade│ │Course │  │
│  │  au   │ │ César │ │ 45min │  │
│  │ lait  │ │       │ │       │  │
│  │ 120   │ │  480  │ │ −489  │  │
│  └───────┘ └───────┘ └───────┘  │
│                                 │
│  📷  Photographier un repas     │
│  🍽  Chercher ou décrire        │
│  🏃  Ajouter une activité       │
│  ⚖️  Me peser                   │
└─────────────────────────────────┘
```

**Ordre délibéré.** La photo est en premier parce que c'est le geste le plus fréquent
et le plus rapide. La pesée est en dernier parce qu'elle est quotidienne mais unique.

**Quatre actions, pas cinq.** L'ajout de la composition manuelle (cf.
[08](08-base-aliments.md)) aurait pu créer une cinquième entrée « Composer un repas »,
à côté de « Décrire un repas ». Les deux commencent par le même geste — taper du
texte — et sont donc fusionnées en une seule action, « Chercher ou décrire » : un champ
de saisie unique qui cherche dans la base d'aliments à la frappe et propose
l'estimation IA sur la phrase entière. Le chemin découle de ce que l'utilisateur tape,
il n'a pas à être choisi avant (§ 1.2).

**Les réutilisations sont au-dessus des actions**, pas en dessous : en régime établi,
la majorité des saisies sont des répétitions (le même petit-déjeuner, la même séance).
Un tap suffit, sans passer par l'IA — c'est ce qui tient la promesse des 15 secondes
et ce qui contient le coût d'estimation.

Les vignettes de réutilisation sont classées par un score combinant fréquence et
récence, filtré par moment de la journée : le café au lait remonte le matin, pas à
21 h. Elles couvrent les aliments simples, les repas enregistrés composés et les
activités.

### 1.1 Photographier un repas

1. Tap → la caméra s'ouvre **immédiatement** (pas d'écran intermédiaire).
2. Déclenchement → l'entrée est créée aussitôt en état `en_attente`, avec la vignette.
3. L'estimation arrive en 2 à 6 secondes et **remplit les composants** du repas.
4. L'utilisateur peut ajuster ligne par ligne, ajouter un composant depuis la base, ou
   ne rien faire.

L'entrée existe **avant** le résultat de l'IA. C'est ce qui rend l'action non
bloquante, utilisable en mode avion, et ce qui évite l'écran d'attente.

### 1.2 Chercher ou décrire

Un champ de texte unique, clavier ouvert d'emblée, qui sert deux intentions sans
demander laquelle :

- **à la frappe**, les résultats de la base d'aliments apparaissent — « pois chi… » →
  *Pois chiches cuits, 139 kcal/100 g*. Tap, sélecteur de quantité, le composant
  s'ajoute au repas en cours. Instantané, hors ligne, aucun appel au modèle.
- **sur la phrase entière**, un bouton « Estimer avec l'IA » traite le texte comme une
  description : *« deux tartines beurre confiture et un jus d'orange »*. Utile quand
  photographier est socialement inconfortable ou que le repas est déjà fini.

Règle d'affichage : un résultat d'aliment qui correspond bien passe devant ; si rien ne
correspond après trois mots saisis, l'estimation IA est mise en avant. Un mot ou deux
sont presque toujours une recherche, une phrase longue presque toujours une
description.

**Ce champ n'a pas d'écran à lui : il vit dans le composeur** (§ 1.3), comme dans la
maquette du § 7 de [08](08-base-aliments.md) — le champ de recherche et la liste des
composants y cohabitent. Un écran de recherche séparé imposait un aller-retour par
aliment ajouté, et cachait le total au moment précis où on le fait monter.

### 1.3 Composer un repas

L'écran de composition est le même quel que soit le point d'entrée — photo,
description ou recherche. Il affiche les composants, leurs quantités, leurs calories,
et **le total qui s'additionne en direct**. Chaque ligne est modifiable et supprimable ;
une ligne peut venir de la base ou être saisie à la main (libellé + calories) quand la
valeur est déjà connue.

Détails de conception, cf. [08](08-base-aliments.md) § 6 et § 7 :

- la quantité proposée par défaut est **la dernière utilisée pour cet aliment** ;
- les portions domestiques (« 1 cuillère à soupe ») précèdent la saisie en grammes,
  avec l'équivalent en grammes affiché pour rester vérifiable ;
- « Enregistrer et réutiliser » sauvegarde la composition comme repas nommé,
  redimensionnable ensuite par un facteur.

### 1.4 Ajouter une activité

Liste des activités MET, triée par usage personnel puis alphabétique, avec recherche.
Sélection → sélecteur de durée pré-rempli sur la dernière durée utilisée pour cette
activité. Les calories nettes s'affichent en direct pendant le réglage de la durée,
pour que le lien entre effort et apport cible soit lisible.

**Deux écrans en plein écran, et non une feuille** — la seule exception à la règle du
geste court. Le choix se mène au clavier sur vingt-deux entrées : une feuille à détente
n'a ni la hauteur pour la liste, ni la place pour le clavier. Les deux écrans forment
leur propre pile, pour que le retour du réglage revienne au choix et non à l'accueil :
la correction la plus fréquente est « pas cette activité-là ».

Chaque ligne de la liste porte l'ordre de grandeur de l'effort — les calories nettes
d'une séance de trente minutes, au poids de tendance — plutôt que son MET, qui ne dit
rien à qui ne connaît pas la table. L'écran de réglage montre, lui, ce qui sera **figé**
dans l'enregistrement : le poids retenu et la durée.

### 1.5 Me peser

Un sélecteur numérique pré-positionné sur la dernière pesée. Un tap pour valider.
Après validation, la variation de **tendance** est affichée — jamais la variation
brute par rapport à hier. La pesée apparaît ensuite dans le journal du jour (§ 2), au
même titre qu'un repas ou qu'une séance.

## 2. Écran d'accueil

**L'application s'ouvre toujours ici.** Quelle que soit l'URL de lancement, le premier
écran est l'accueil : aucun lien profond n'a de sens à honorer tant qu'il n'y a ni
notification (§ 7) ni partage, et un client de développement qui rejoue la dernière URL
ouverte ferait démarrer l'application au milieu d'une saisie. L'accueil est aussi
l'ancre de la pile : une modale ouverte par un lien a donc toujours quelque chose sous
elle à fermer.

```
┌─────────────────────────────────┐
│  AUJOURD'HUI                    │
│  Mercredi 20 août               │
│ ┌─────────────────────────────┐ │
│ │          1 747              │ │
│ │     calories restantes      │ │
│ │  ●━━━━━━━━━━━━━━○━━━━━━━    │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Mangé                   475 │ │
│ │ Besoin                2 833 │ │
│ │ Apport cible          2 222 │ │
│ │ Protéines      ≥ 42 / 135 g │ │
│ │ Apport cible estimé depuis  │ │
│ │ ta morphologie…             │ │
│ └─────────────────────────────┘ │
│  JOURNAL                        │
│  ⚖ 07:05  Pesée       82,4 kg   │
│  🍽 08:12  Café au lait    120   │
│  🍽 12:40  Salade César    355   │
│  🏃 18:05  Course 45 min  −489   │
│                                 │
│                          ( + )  │
└─────────────────────────────────┘
```

Les chiffres de cet écran sont ceux du § 3.2 de [02](02-modele-calorique.md) — socle
2 061, déficit 550 — avec 489 kcal de sport et 475 kcal mangés : besoin
(2 061 + 489) / 0,90 = 2 833, apport cible (2 061 + 489 − 550) / 0,90 = 2 222,
restant 2 222 − 475 = 1 747.

**Aucune annotation sur la ligne « Besoin ».** Elle a porté un « dont 489 par
l'activité », et c'était faux : la correction de TEF s'applique aussi à l'activité, donc
une séance de 489 kcal ajoute 489 / 0,90 = 543 kcal au besoin. Le « dont » ne tombait
donc jamais juste — et une fois corrigé à 543, il annonçait un chiffre que rien d'autre
à l'écran ne recoupait. La séance qui l'a produit est dans le journal, signée, une ligne
plus bas : c'est suffisant. L'API sert le montant (`eat_ajout_kcal`) pour qui veut
vérifier le calcul, l'accueil ne l'affiche pas.

**Un seul grand chiffre** : les calories restantes. Les protéines sont la seule autre
grandeur suivie (§ 9 de [02](02-modele-calorique.md)) : une ligne discrète, un plancher
et non une cible, affichée en borne inférieure quand une entrée libre rend la somme
incomplète. Aucune alerte si elle n'est pas atteinte. Les trois lignes en dessous sont
le détail, en typographie secondaire. La barre de progression est neutre : elle se
remplit, et continue au-delà sans changer de couleur pour l'alarme.

**La date est le titre de l'écran**, et elle est composée comme tel : en grand, dans la
graisse de titrage. Un chiffre de calories restantes sans jour ne veut rien dire, et
c'est la seule chose qui situe tout le reste.

**L'honnêteté sur l'incertitude tient en une phrase fixe**, au bas du bloc de détail :
« apport cible estimé depuis ta morphologie et ta tendance de poids ». Tant que la
calibration est hors périmètre (§ 5), il n'y a pas deux régimes à distinguer : une
pastille « estimé » qui ne changerait jamais n'apprendrait rien, et une promesse de
mesure à venir engagerait ce que l'application ne fait pas.

**Deux blocs, pas quatre lignes flottantes.** Le chiffre unique et sa piste de
progression sont sur une carte posée ; les quatre lignes de détail sont dans un bloc
creusé juste dessous. C'est la même information que ci-dessus, mais la hiérarchie ne
repose plus seulement sur la taille du chiffre.

**Le journal du jour** est directement sur l'accueil, pas dans un onglet. Son en-tête
dit « Journal » et non « Aujourd'hui » : c'est l'en-tête de l'écran qui porte le jour,
et le répéter à mi-hauteur ne dirait rien de plus. Chaque ligne est modifiable par tap
et supprimable par balayage. Une entrée en attente d'estimation affiche une pastille
discrète plutôt qu'un compte à rebours.

**Trois genres, une pastille chacun** : repas, séance, et **pesée**. La pesée est une
saisie du jour comme les autres, et l'accueil est l'endroit où l'on vérifie ce qu'on a
saisi — l'en écarter obligeait à ouvrir un autre écran pour savoir si on s'était pesé.
Elle ne porte aucune calorie et n'entre donc dans aucun total : c'est une ligne de
journal, pas un apport. La pastille est un rond neutre portant un tracé ; c'est l'icône
qui dit le genre, pas un aplat de couleur — teinter le fond aurait demandé un aplat par
rôle, à tenir en clair comme en sombre, pour une information que le tracé donne déjà.

**État négatif** : « 340 calories au-dessus » remplace « −340 calories restantes ».
Formulation factuelle, sans rouge.

## 3. Onboarding

Quatre écrans, une information par écran. L'écran de bienvenue est supprimé : il n'y a
personne à convaincre. Cet onboarding ne sera vu **qu'une seule fois** — il ne mérite
ni polish ni cas limites, seulement d'être juste.

| # | Écran | Contenu |
|---|---|---|
| 1 | Toi | Sexe (cf. § 2 de [02](02-modele-calorique.md)), date de naissance, taille |
| 2 | Ton poids | Poids actuel, poids souhaité (optionnel) |
| 3 | Ton rythme | Trois cartes : 0,25 / 0,5 / 0,75 kg par semaine, avec la date d'atteinte projetée sur chacune. Défaut : 0,5. |
| 4 | Ton apport cible | Le chiffre, et une phrase d'honnêteté : « C'est une estimation : elle vient d'une formule et de ta morphologie. C'est ta tendance de poids qui dira si elle est juste. » |

Aucune question sur le niveau d'activité. C'est un gain d'onboarding **et** un gain de
justesse.

À la sortie de l'écran 4, le menu d'action rapide s'ouvre de lui-même : la première
saisie fait partie de l'onboarding.

## 4. Écran historique

Trois strates, du plus lisible au plus détaillé :

1. **Courbe de poids** — tendance en trait plein, pesées en points. 30 / 90 jours.
   La ligne d'objectif est une pente, pas une cible ponctuelle.
2. **Balance quotidienne** — barres, une par jour, positives et négatives, avec la
   moyenne glissante 7 jours superposée. C'est la vue qui déculpabilise un écart isolé.
3. **Semaine** — apports moyens, dépense moyenne, déficit moyen, perte prédite vs
   perte observée. Ce dernier couple est le seul indicateur de véracité qui compte.

## 5. Écran calibration — hors périmètre pour l'instant

Il n'y en a pas, et rien dans l'application n'annonce une mesure à venir : pas de
pastille de phase sur l'accueil, pas de promesse à l'onboarding, pas de ligne tactile
qui ouvrirait un détail de calibration.

La calibration reste le cœur de la justesse du modèle (§ 5 de
[02](02-modele-calorique.md)) et arrive au V0.1 (cf. [07](07-roadmap.md)). Tant qu'elle
n'existe pas, la journée est calculée **intégralement** par le § 3.2 du doc 02 : socle
formulé, correction de TEF pleine. C'est le régime le plus simple du modèle, et le seul
que l'application connaisse.

Le contenu de l'écran, ses trois états et l'explication de l'écart entre socle mesuré et
apport cible restent spécifiés au § 5.5 du doc 02 : c'est là qu'il faudra revenir, pas
ici.

## 6. Profil et réglages

Trois lignes : morphologie, objectif, plancher de sécurité (lecture seule, avec son
explication). Rien d'autre — ni compte, ni notifications, ni sources de données, ni
suppression. Le fuseau horaire et l'heure de bascule de journée sont des constantes
d'application, pas des réglages.

## 7. Notifications — hors périmètre

Aucune notification en v1. Un rappel de pesée et un récapitulatif du soir demandent
deux permissions système, un planificateur et un travail de fond quotidien, pour un
rappel qu'une alarme de téléphone rend déjà. À reprendre si l'oubli de pesée devient un
problème constaté — pas avant.

Et quoi qu'il arrive : jamais de notification « tu n'as rien saisi depuis 3 jours ».

## 8. Règles de ton

- « Au-dessus de ton apport cible », jamais « tu as dépassé ».
- « Estimation », « environ », « mesuré » sont des mots à utiliser précisément.
- Pas d'emoji dans le texte système, pas de félicitations automatiques.
- Les nombres sont arrondis à l'unité pour les calories, à 100 g pour les poids.
- Vouvoiement ou tutoiement : **tutoiement**, cohérent avec le ton du README.
