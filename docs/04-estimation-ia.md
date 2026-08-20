# 04 — Estimation IA des repas

L'estimation est le seul chemin de saisie alimentaire de Kalou. Sa fiabilité, sa
latence et son coût sont donc des contraintes produit, pas des détails techniques.

## 1. Contrat fonctionnel

**Entrée** : une photo, ou une description libre, ou les deux (photo + précision
textuelle du type « la portion était petite »).

**Sortie** : une liste d'aliments identifiés, chacun avec une quantité estimée, des
calories, des macronutriments et un niveau de confiance ; plus une fourchette
basse/haute sur le total.

**Invariant** : le résultat est toujours **modifiable**. Les calories totales, la
quantité de chaque aliment, son libellé : tout est éditable. Une valeur corrigée par
l'utilisateur est marquée comme telle et ne sera jamais réécrite.

Ce point porte la décision de ne pas avoir de saisie libre séparée : corriger une
estimation *est* la saisie libre. Si l'utilisateur efface tout et tape « 600 », c'est
une entrée valide.

## 2. Flux

```
   Photo / texte
        │
        ├──► Entrée créée immédiatement (état: en_attente, kcal: null)
        │    → visible dans le journal du jour, avec vignette
        │
        ├──► Requête d'estimation (côté API, jamais depuis le mobile)
        │    2-6 s
        │
        ├──► Entrée complétée (état: estime, kcal renseignées, source: ia_photo)
        │
        └──► Correction éventuelle (état: corrige, edited_by_user: true)
                    │
                    └──► « Réutiliser plus tard » → devient un favori
```

**Hors ligne** : l'entrée reste en `en_attente`, la photo est stockée localement, la
requête est rejouée au retour du réseau (idempotence par `Idempotency-Key`, cf. [06](06-api.md)).
Le journal affiche l'entrée sans calories ; le budget du jour l'ignore jusqu'à
résolution, avec une mention « 1 repas en attente d'estimation » pour que le chiffre
restant ne soit pas lu comme faux.

**Échec définitif** (3 tentatives) : l'entrée bascule en `echec` et propose la saisie
manuelle des calories. Jamais de suppression silencieuse.

## 3. Modèle et paramètres

| Paramètre | Valeur | Justification |
|---|---|---|
| Modèle | `claude-opus-5` | Défaut. L'estimation de portion à partir d'une photo est la tâche la plus difficile de l'application ; c'est le poste où la qualité se voit directement. |
| Effort | `output_config: { effort: "low" }` | La tâche est courte et cadrée. L'effort élevé n'améliore pas l'estimation de portion et triple les tokens de sortie. |
| Thinking | `{ type: "adaptive" }` (défaut) | Laissé au modèle ; l'affichage reste `omitted`, le raisonnement n'est pas montré. |
| Sortie structurée | `output_config: { format: zodOutputFormat(EstimationSchema) }` via `client.messages.parse()` | Validation garantie contre le schéma, pas de parsing défensif côté API. |
| `max_tokens` | 4096 | Une estimation dépasse rarement 500 tokens ; la marge couvre un plateau composé. |
| Cache de prompt | `cache_control: { type: "ephemeral" }` sur le prompt système | Le prompt système (règles d'estimation + exemples de portions de référence) est stable et dépasse 1 024 tokens, condition minimale du cache. |

Le SDK utilisé est `@anthropic-ai/sdk` côté API. **Aucune clé ne transite par le
mobile** : le client envoie l'image à `POST /estimations`, l'API appelle le modèle.

## 4. Schéma de sortie

```ts
const AlimentSchema = z.object({
  libelle: z.string(),              // "Frites", pas "portion de frites moyenne"
  quantite: z.number(),             // valeur numérique
  unite: z.enum(["g", "ml", "unite"]),
  kcal: z.number(),
  proteines_g: z.number(),
  glucides_g: z.number(),
  lipides_g: z.number(),
  confiance: z.enum(["haute", "moyenne", "basse"]),
});

const EstimationSchema = z.object({
  aliments: z.array(AlimentSchema),
  kcal_total: z.number(),
  kcal_min: z.number(),             // borne basse plausible
  kcal_max: z.number(),             // borne haute plausible
  libelle_court: z.string(),        // "Burger et frites" — pour le journal et le favori
  hypotheses: z.array(z.string()),  // "cuisson supposée à l'huile", "portion estimée à 150 g"
  hors_sujet: z.boolean(),          // true si l'image ne contient pas de nourriture
});
```

Les macronutriments sont **collectés et stockés dès la v1** bien qu'ils ne soient pas
affichés (cf. [01](01-vision-et-perimetre.md)) : le modèle les produit sans surcoût, et
leur affichage devient une évolution d'interface pure, sans migration ni re-estimation.

`hypotheses` est affiché en repliable sous l'estimation. C'est ce qui permet à
l'utilisateur de corriger utilement : voir « portion estimée à 150 g » lui dit quoi
ajuster.

`hors_sujet` évite d'inventer un repas à partir d'une photo de chat.

## 5. Prompt système — cadrage

Le texte exact vit dans le code ; les règles qu'il doit encoder sont normatives :

1. **Estimer, pas refuser.** Une estimation moyenne est utile, une absence de réponse
   ne l'est pas. Toujours produire un nombre, quitte à élargir la fourchette.
2. **Ancrer les portions** sur des repères visuels explicites (taille de l'assiette,
   des ustensiles, de la main) et, à défaut, sur des portions standard françaises.
3. **Fourchette honnête.** `kcal_min` et `kcal_max` doivent refléter l'incertitude
   réelle : un plat identifiable au restaurant a une fourchette étroite, un plat en
   sauce non identifiable a une fourchette large.
4. **Ne pas moraliser.** Aucun commentaire sur la qualité nutritionnelle. Le modèle
   estime, il ne conseille pas.
5. **Le doute penche vers le haut.** À incertitude égale, préférer la borne haute pour
   `kcal_total` : sous-estimer les apports fausse aussi la calibration (§ 5.4 de
   [02](02-modele-calorique.md)), et c'est le biais le plus coûteux du produit.
6. **Répondre en français**, avec des libellés courts et réutilisables.

Le prompt inclut une table de portions de référence françaises (une baguette, un
croissant, une part de pizza, un verre de vin, une cuillère d'huile) qui améliore
nettement la cohérence entre estimations et rend le cache de prompt rentable.

## 6. Préparation de l'image

Côté mobile, **avant** l'envoi :

- redimensionnement au plus grand côté à **1024 px** ;
- JPEG qualité 0,7 → typiquement 100-200 ko ;
- métadonnées EXIF supprimées, sauf l'horodatage, utilisé comme heure du repas.

Un cliché natif de 4 Mo n'améliore pas l'estimation et multiplie par cinq la latence
d'upload en 4G. 1024 px correspond à environ 1 400 tokens d'entrée.

## 7. Coût

Hypothèses : image 1024 px (~1 400 tokens), prompt système ~1 200 tokens (mis en
cache), sortie ~350 tokens à effort `low`.

| Modèle | Entrée $/M | Sortie $/M | Coût / estimation | 4 repas/j/utilisateur |
|---|---|---|---|---|
| `claude-opus-5` | 5,00 | 25,00 | ~1,8 ¢ | ~2,2 $/mois |
| `claude-sonnet-5` | 3,00 | 15,00 | ~1,1 ¢ | ~1,3 $/mois |
| `claude-haiku-4-5` | 1,00 | 5,00 | ~0,4 ¢ | ~0,4 $/mois |

Ordres de grandeur, à re-mesurer avec `client.messages.countTokens()` sur des cas
réels avant toute décision d'échelle.

**Leviers, dans l'ordre d'efficacité :**

1. **Les favoris.** En régime établi, réutiliser une entrée existante coûte zéro. Si
   60 % des saisies sont des réutilisations, la facture baisse de 60 % — c'est le
   levier le plus fort, et il améliore l'expérience au lieu de la dégrader.
2. **Cache de prompt** sur le système + la table de portions (~90 % d'économie sur
   cette fraction, dès que le volume garde le cache chaud ; marginal à faible trafic).
3. **Effort `low`**, déjà retenu.
4. **Modèle moins cher pour le chemin texte seul** — décrire « un café au lait » ne
   demande pas de vision. À arbitrer plus tard, en mesurant l'écart de qualité.

Ces chiffres justifient une limite anti-abus (par exemple 40 estimations par jour et
par compte) plutôt qu'une dégradation du modèle par défaut.

## 8. Confidentialité

- Les photos sont envoyées à l'API Anthropic pour estimation. **Cela doit être dit
  explicitement** à l'onboarding, avant la première photo — pas enterré dans des CGU.
- Conservation : question ouverte (cf. [README](README.md)). Recommandation :
  vignette 256 px conservée pour l'historique visuel, original supprimé après
  estimation.
- Aucune donnée d'identité (e-mail, identifiant) n'est envoyée dans le prompt.
- La suppression du compte supprime les images et les enregistrements d'estimation.

## 9. Journalisation

Chaque estimation est enregistrée (table `estimations`, cf. [05](05-modele-de-donnees.md))
avec le modèle utilisé, les tokens consommés, la latence, le résultat brut et le
statut. Objectifs : mesurer le coût réel, comparer des versions de prompt, et — le
plus important — **mesurer le taux et l'amplitude des corrections utilisateur**. C'est
le seul indicateur de qualité disponible en production, et il doit être en place dès
la v1.
