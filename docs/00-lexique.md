# 00 — Lexique

Le vocabulaire est factuel et emprunte au domaine quand un terme existe. Chaque mot
listé ici a **un seul sens** dans toute la spécification et dans le code : les
identifiants, les colonnes de base de données et les champs d'API reprennent ces termes
tels quels.

Un terme qui change se corrige ici d'abord, et se propage ensuite. Un terme absent de
cette liste et présent dans le code est un signal : soit il manque ici, soit il ne
devrait pas exister.

## Énergie

| Terme | Identifiant | Définition | Exemple |
|---|---|---|---|
| **BMR** | `bmr` | Métabolisme de base : l'énergie dépensée au repos absolu. Calculé par Mifflin-St Jeor à partir du sexe, de l'âge, de la taille et de la tendance de poids | 1 792 kcal |
| **NEAT** | `neat` | Dépense d'activité non sportive — marche, station debout, ménage. Estimée à 15 % du BMR tant que la calibration n'a pas mesuré mieux | 269 kcal |
| **TEF** | `tef`, `facteur_tef` | Thermogenèse alimentaire : le coût énergétique de la digestion, 10 % des calories ingérées | 168 kcal |
| **EAT** | `eat_kcal` | Dépense sportive volontaire, saisie par l'utilisateur. Toujours en calories **nettes** (la part de repos est déjà dans le BMR) | 489 kcal |
| **Socle** | `socle` | `BMR + NEAT` : la dépense d'une journée sans sport, hors digestion. **Seule grandeur que la calibration corrige** | 2 061 kcal |
| **Besoin énergétique journalier** | `besoin_journalier` | L'apport pour lequel la balance est nulle — ni perte ni prise de poids. C'est le chiffre affiché comme dépense du jour, et il ne bouge pas au fil des saisies | 2 290 kcal |
| **Apport cible** | `apport_cible` | Le besoin énergétique journalier moins le déficit visé. Ce que l'utilisateur peut manger aujourd'hui | 1 679 kcal |
| **Restant** | `restant` | `apport cible − apports du jour`. Le chiffre unique de l'écran d'accueil ; peut être négatif | 1 204 kcal |
| **Apports** | `apports_kcal` | Somme des calories des entrées alimentaires de la journée locale | 475 kcal |
| **Balance** | `balance_kcal` | `apports − dépense réelle`. La grandeur historisée et cumulée, celle qui se compare à la perte de poids observée | −550 kcal |
| **Dépense réelle** | `depense_reelle` | Le socle, plus le sport, plus le TEF de ce qui a **réellement** été mangé. Distincte du besoin énergétique journalier, qui suppose l'apport d'équilibre | 2 229 kcal |
| **Déficit** | `deficit_cible` | L'écart énergétique quotidien visé, dérivé du rythme de perte : `rythme × 1 100` | 550 kcal |
| **MET** | `met` | Multiple de la dépense de repos caractérisant une activité. Kalou n'utilise que la valeur **nette**, `MET − 1` | 8,3 |

## Poids et calibration

| Terme | Identifiant | Définition | Exemple |
|---|---|---|---|
| **Pesée** | `weigh_in` | Une mesure brute sur la balance. Enregistrée, affichée en points, mais **jamais** utilisée seule pour une décision | 85,4 kg |
| **Tendance** | `tendance_poids_kg` | Poids lissé par moyenne exponentielle (α = 0,15). C'est la grandeur qui alimente le BMR, le MET et la calibration | 84,7 kg |
| **Rythme** | `rythme_kg_semaine` | L'objectif de perte hebdomadaire choisi, plafonné à 1 % du poids corporel | 0,5 kg/sem |
| **Calibration** | `calibration` | Mesure du socle réel par bilan énergétique sur une fenêtre de 14 jours, en remplacement progressif de la formule | — |
| **Fenêtre** | `fenetre_jours` | Les 14 derniers jours servant à la calibration. Au moins 11 jours saisis et 6 pesées pour qu'elle s'active | 14 jours |
| **Poids de la mesure** | `w`, `poids_w` | De 0 à 1, la part du socle mesuré face au socle formulé. 0 au jour 10, 1 au jour 28 | 0,44 |
| **Plancher d'apport** | `plancher_kcal` | Minimum de sécurité sous lequel l'apport cible ne descend pas, quel que soit le rythme visé | 1 500 kcal |
| **Plancher protéique** | `plancher_proteines_g` | `1,6 × poids`. Un minimum affiché, jamais une cible à ne pas dépasser | 136 g |

## Alimentation

| Terme | Identifiant | Définition |
|---|---|---|
| **Entrée alimentaire** | `food_entry` | Un repas, une boisson, un en-cas. **Toujours** une liste de composants, quelle que soit son origine |
| **Composant** | `food_entry_item` | Une ligne d'une entrée : un aliment et sa quantité, ou un libellé et ses calories. Trois types — `reference`, `libre`, `ia` |
| **Aliment** | `food` | Une entrée de la base : soit issue de CIQUAL, soit créée par l'utilisateur (`perso`) |
| **Aliment promu** | `promu` | Appartient au sous-ensemble curé (~150 aliments), seul affiché par défaut dans la recherche |
| **Portion** | `food_portion` | Une quantité domestique rattachée à un aliment — « 1 cuillère à soupe = 10 g » |
| **Estimation** | `estimation` | Un appel au modèle pour convertir une photo ou une description en composants. Pré-remplit le composeur, ne le remplace pas |
| **Repas enregistré** | `favorite` (type `repas`) | Une composition sauvegardée sous un nom, réutilisable en un tap et redimensionnable par un facteur |
| **Activité** | `activity_entry` | Une séance saisie : un type d'activité et une durée, convertis en calories nettes |

## Temps

| Terme | Identifiant | Définition |
|---|---|---|
| **Journée locale** | `local_date` | Le jour auquel une entrée est rattachée, calculé à l'écriture selon le fuseau de l'application et l'heure de bascule, puis **figé** |
| **Heure de bascule** | `heure_bascule_journee` | L'heure à laquelle la journée change. 0 par défaut, 3 pour les couche-tard |
| **Récapitulatif quotidien** | `daily_summary` | La photographie figée d'une journée close : socle, besoin, apport cible, apports, balance |

## Termes écartés

| Écarté | Pourquoi |
|---|---|
| « Budget » | Métaphore comptable (dette, découvert, somme à dépenser), en tension avec le principe « sans jugement ». Et il désignait deux grandeurs distinctes : le besoin énergétique journalier et l'apport cible |
| « Calories brûlées » | Imprécis, et faux pour le sport, où seul le net compte |
| « Objectif » seul | Ambigu : le rythme de perte, le poids cible et l'apport cible sont trois objectifs différents |
| « Macros » | Jargon. Les glucides et lipides ne sont pas suivis ; les protéines sont nommées telles quelles |
