# 01 — Vision et périmètre

## Le problème

Les applications de suivi calorique échouent pour deux raisons distinctes, et Kalou
est construit contre ces deux-là :

1. **La saisie est trop coûteuse.** Chercher un aliment dans une base, choisir entre
   quatorze variantes de « poulet », peser sa portion : le coût par repas est de
   30 à 90 secondes. À quatre saisies par jour, l'abandon arrive en deux semaines.
2. **Le budget calorique est faux, et le reste.** Un facteur d'activité déclaré à
   l'inscription se trompe de 300 à 500 kcal — l'ordre de grandeur du déficit
   recherché. L'utilisateur suit l'application à la lettre, ne perd pas, et conclut
   que le suivi ne marche pas.

Kalou répond à (1) par l'estimation IA d'un repas photographié ou décrit en une
phrase — et, quand l'utilisateur connaît déjà ses ingrédients, par une composition
manuelle rapide adossée à une base d'aliments française. Il répond à (2) par une
recalibration automatique du budget sur la perte de poids réellement observée.

## L'utilisateur

**Une seule personne : l'auteur de l'application.** Ce n'est pas un persona, c'est une
contrainte de conception — il n'y a pas de cas limite à couvrir « pour les autres », pas
de parcours d'inscription, pas de compromis entre profils divergents. Quelqu'un qui veut
perdre du poids durablement sans se transformer en comptable de son assiette. Elle accepte de photographier ses repas et de se peser
régulièrement ; elle n'acceptera pas de peser ses aliments ni de renseigner des
fiches nutritionnelles. Elle n'est pas athlète : le sport est occasionnel, pas
structurant.

Conséquence : la précision au gramme n'a aucune valeur pour elle **quand elle ne la
connaît pas**. Mais quand elle cuisine et connaît ses ingrédients, lui imposer une
estimation visuelle serait perdre de l'information qu'elle possède déjà. Les deux
chemins de saisie répondent à ces deux moments, pas à deux profils d'utilisateurs.

## Principes de conception

**Un seul chiffre.** L'écran d'accueil répond à une seule question : *qu'est-ce qu'il
me reste aujourd'hui ?* Tout le reste est secondaire et se déplie.

**Trois taps maximum pour enregistrer.** Ouvrir l'application, choisir l'action,
valider. Une photo de repas doit être enregistrée en moins de 15 secondes.

**Sans jugement.** Aucun rouge alarmant, aucun « vous avez dépassé », aucune série
de jours parfaits à ne pas briser. Dépasser son budget est une information, pas une
faute. Le ton du README (« votre balance calorique du jour, claire et sans
jugement ») est une contrainte de design, pas une accroche marketing.

**Honnête sur l'incertitude.** Une estimation IA est affichée comme une estimation.
Un budget non encore calibré le dit. Kalou ne présente jamais une approximation
comme une mesure — c'est ce qui rend crédible la mesure quand elle arrive.

**Le corps est l'instrument de mesure.** Aucune formule ne connaît la dépense réelle
d'une personne. La tendance de poids, elle, la révèle. Toute la logique de calibration
découle de ce principe.

## Ce que fait Kalou (v1)

- Un budget calorique quotidien, estimé au départ puis mesuré.
- L'enregistrement d'un repas ou d'une boisson par photo ou par description.
- La composition manuelle d'un repas à partir d'une base d'aliments (CIQUAL) ou de
  calories saisies directement — pour les repas dont on connaît les ingrédients.
- Les repas enregistrés, réutilisables en un tap et redimensionnables.
- L'enregistrement d'une activité par type et durée.
- Le suivi du poids, avec courbe de tendance lissée.
- Un objectif de perte exprimé en kg/semaine, qui pilote le déficit.
- L'historique quotidien et hebdomadaire de la balance.

## Non-objectifs

Explicitement hors périmètre v1, pour que la v1 existe :

| Écarté | Pourquoi |
|---|---|
| Macros affichées (protéines / glucides / lipides) | Alourdit l'accueil et la saisie. Les valeurs sont **stockées** dès la v1 (l'IA les produit gratuitement), donc l'affichage sera une évolution sans migration. |
| Code-barres et produits de marque (Open Food Facts) | CIQUAL couvre les ingrédients et les plats maison, qui sont le besoin réel. Une base contributive de 3 millions de produits ajoute une dépendance de qualité inégale, un réseau obligatoire, et n'est utile qu'avec le scan. |
| Recettes structurées (rendement, portions produites, échelle d'ingrédients) | Un repas enregistré redimensionnable couvre 90 % du besoin pour 10 % du modèle. |
| Apple Health / Google Fit | Coût natif élevé, et le dédoublonnage avec la saisie manuelle et le NEAT est un piège. La calibration rend le gain marginal. |
| Hydratation | Les boissons comptent pour leurs calories ; le suivi du volume est un autre produit. |
| Social, défis, séries, gamification | Contraire au principe « sans jugement ». |
| Coach conversationnel | L'IA sert à estimer, pas à converser. |
| Multi-appareil, web | Un appareil, une personne — donc un seul écrivain, et aucun moteur de synchronisation. |
| Comptes, inscription, authentification tierce | Un utilisateur unique, pré-créé. Un jeton en configuration tient lieu d'accès. |
| Export de données, portabilité | Les données sont sur une base personnelle, accessibles directement en SQL. |
| Jeûne intermittent, cycles, recharges | Complexité de modèle sans bénéfice sur l'objectif de départ. |

## Critères de réussite

Mesurables, et qui doivent orienter les arbitrages :

- **Temps de première saisie** après installation : < 60 secondes.
- **Temps d'enregistrement d'un repas** en usage courant : < 15 secondes.
- **Jours avec saisie complète** sur les 14 premiers jours : > 80 % — c'est le seuil
  en dessous duquel la calibration ne peut pas fonctionner.
- **Écart entre perte prédite et perte observée** après calibration : < 25 % sur
  4 semaines.
