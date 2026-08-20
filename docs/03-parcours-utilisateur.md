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
│  ✍️  Décrire un repas           │
│  🏃  Ajouter une activité       │
│  ⚖️  Me peser                   │
└─────────────────────────────────┘
```

**Ordre délibéré.** La photo est en premier parce que c'est le geste le plus fréquent
et le plus rapide. La pesée est en dernier parce qu'elle est quotidienne mais unique.

**Les réutilisations sont au-dessus des actions**, pas en dessous : en régime établi,
la majorité des saisies sont des répétitions (le même petit-déjeuner, la même séance).
Un tap suffit, sans passer par l'IA — c'est ce qui tient la promesse des 15 secondes
et ce qui contient le coût d'estimation.

Les vignettes de réutilisation sont classées par un score combinant fréquence et
récence, filtré par moment de la journée : le café au lait remonte le matin, pas à
21 h.

### 1.1 Photographier un repas

1. Tap → la caméra s'ouvre **immédiatement** (pas d'écran intermédiaire).
2. Déclenchement → l'entrée est créée aussitôt en état `en_attente`, avec la vignette.
3. L'estimation arrive en 2 à 6 secondes et remplit les calories.
4. L'utilisateur peut ajuster, ou ne rien faire.

L'entrée existe **avant** le résultat de l'IA. C'est ce qui rend l'action non
bloquante, utilisable en mode avion, et ce qui évite l'écran d'attente.

### 1.2 Décrire un repas

Un champ de texte libre, clavier ouvert d'emblée : *« deux tartines beurre confiture
et un jus d'orange »*. Même flux que la photo. Utile quand photographier est
socialement inconfortable ou que le repas est déjà fini.

### 1.3 Ajouter une activité

Liste des activités MET, triée par usage personnel puis alphabétique, avec recherche.
Sélection → sélecteur de durée pré-rempli sur la dernière durée utilisée pour cette
activité. Les calories nettes s'affichent en direct pendant le réglage de la durée,
pour que le lien entre effort et budget soit lisible.

### 1.4 Me peser

Un sélecteur numérique pré-positionné sur la dernière pesée. Un tap pour valider.
Après validation, la variation de **tendance** est affichée — jamais la variation
brute par rapport à hier.

## 2. Écran d'accueil

```
┌─────────────────────────────────┐
│  Mercredi 20 août               │
│                                 │
│           1 204                 │
│      calories restantes         │
│                                 │
│    ●━━━━━━━━━━━━━━○━━━━━━━      │
│                                 │
│  Mangé      475                 │
│  Dépensé  2 168  (dont 489 ⚡)  │
│  Budget   1 679                 │
│                                 │
│  ── Aujourd'hui ──              │
│  08:12  Café au lait      120   │
│  12:40  Salade César      355   │
│  18:05  Course 45 min    −489   │
│                                 │
│                          ( + )  │
└─────────────────────────────────┘
```

**Un seul grand chiffre** : les calories restantes. Les trois lignes en dessous sont
le détail, en typographie secondaire. La barre de progression est neutre : elle se
remplit, et continue au-delà sans changer de couleur pour l'alarme.

**Le journal du jour** est directement sur l'accueil, pas dans un onglet. Chaque ligne
est modifiable par tap et supprimable par balayage. Une entrée en attente d'estimation
affiche une pastille discrète plutôt qu'un compte à rebours.

**État négatif** : « 340 calories au-dessus » remplace « −340 calories restantes ».
Formulation factuelle, sans rouge.

## 3. Onboarding

Cinq écrans, une information par écran, aucun formulaire dense. Objectif : première
saisie en moins de 60 secondes.

| # | Écran | Contenu |
|---|---|---|
| 1 | Bienvenue | Une phrase sur le principe, un bouton. Pas de carrousel de vente. |
| 2 | Toi | Sexe (avec la note du § 2 de [02](02-modele-calorique.md)), date de naissance, taille |
| 3 | Ton poids | Poids actuel, poids souhaité (optionnel) |
| 4 | Ton rythme | Trois cartes : 0,25 / 0,5 / 0,75 kg par semaine, avec la date d'atteinte projetée sur chacune. Défaut : 0,5. |
| 5 | Ton budget | Le chiffre, et une phrase d'honnêteté : « C'est une estimation. Dans deux semaines, Kalou l'aura mesurée pour de vrai. » |

Aucune question sur le niveau d'activité. C'est un gain d'onboarding **et** un gain de
justesse.

À la sortie de l'écran 5, le menu d'action rapide s'ouvre de lui-même : la première
saisie fait partie de l'onboarding.

## 4. Écran historique

Trois strates, du plus lisible au plus détaillé :

1. **Courbe de poids** — tendance en trait plein, pesées en points. 30 / 90 jours.
   La ligne d'objectif est une pente, pas une cible ponctuelle.
2. **Balance quotidienne** — barres, une par jour, positives et négatives, avec la
   moyenne glissante 7 jours superposée. C'est la vue qui déculpabilise un écart isolé.
3. **Semaine** — apports moyens, dépense moyenne, déficit moyen, perte prédite vs
   perte observée. Ce dernier couple est le seul indicateur de véracité qui compte.

## 5. Écran calibration

Accessible depuis l'accueil (tap sur « Dépensé ») et notifié une fois, à la première
calibration. Contenu spécifié au § 5.5 de [02](02-modele-calorique.md).

Trois états possibles, toujours explicites :

- **En cours d'apprentissage** — « encore 6 jours de données » + barre de progression.
- **Calibré** — la mesure, sa date, l'écart avec l'estimation initiale.
- **En pause** — « trop de jours sans saisie complète ; Kalou garde ta dernière
  mesure ». Formulation non accusatrice, mais claire sur la cause.

## 6. Profil et réglages

Minimal : morphologie, objectif, plancher de sécurité (lecture seule avec explication),
fuseau et heure de bascule de journée, notifications, suppression du compte et des
données.

## 7. Notifications

Deux au maximum, désactivables, jamais en série ni en rappel culpabilisant :

- **Matin** — rappel de pesée, à l'heure habituelle constatée.
- **Soir** — récapitulatif du jour, uniquement si au moins une saisie a eu lieu.

Aucune notification « tu n'as rien saisi depuis 3 jours ».

## 8. Règles de ton

- « Au-dessus de ton budget », jamais « tu as dépassé ».
- « Estimation », « environ », « mesuré » sont des mots à utiliser précisément.
- Pas d'emoji dans le texte système, pas de félicitations automatiques.
- Les nombres sont arrondis à l'unité pour les calories, à 100 g pour les poids.
- Vouvoiement ou tutoiement : **tutoiement**, cohérent avec le ton du README.
