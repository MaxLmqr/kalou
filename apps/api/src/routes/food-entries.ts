import {
  db,
  foodEntries,
  foodEntryItems,
  foodPortions,
  foods,
  profiles,
  userFoodUsages,
} from '@kalou/db'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { Elysia, t } from 'elysia'

import { jourLocal } from '../domain'
import { erreur } from '../http/erreurs'
import { authMacro } from '../plugins/auth'

const itemReference = t.Object({
  type: t.Literal('reference'),
  food_id: t.String({ format: 'uuid' }),
  quantite: t.Number({ minimum: 0.1, maximum: 10_000 }),
  unite: t.Union([t.Literal('g'), t.Literal('ml'), t.Literal('unite'), t.Literal('portion')]),
  portion_id: t.Optional(t.String({ format: 'uuid' })),
})

const itemLibre = t.Object({
  type: t.Literal('libre'),
  libelle: t.String({ minLength: 1, maxLength: 120 }),
  kcal: t.Integer({ minimum: 0, maximum: 10_000 }),
  proteines_g: t.Optional(t.Number({ minimum: 0 })),
  glucides_g: t.Optional(t.Number({ minimum: 0 })),
  lipides_g: t.Optional(t.Number({ minimum: 0 })),
})

const items = t.Array(t.Union([itemReference, itemLibre]), { minItems: 1, maxItems: 40 })

const corpsEntree = t.Object({
  id: t.Optional(t.String({ format: 'uuid' })),
  occurred_at: t.Optional(t.String()),
  libelle: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  items,
})

type ItemEntrant = typeof items.static[number]
type ComposantEcrit = typeof foodEntryItems.$inferInsert

/** Libellé dérivé des composants quand le client n'en fournit pas. Doc 06 § 5. */
function libelleDerive(libelles: string[]): string {
  const [premier, second, ...reste] = libelles
  if (!second) return premier ?? 'Repas'
  const base = `${premier}, ${second}`
  return reste.length > 0 ? `${base} + ${reste.length}` : base
}

async function reglesDeJournee(userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId))
  return {
    timezone: profile?.timezone ?? 'Europe/Paris',
    heureBascule: profile?.heureBasculeJournee ?? 0,
  }
}

/**
 * Traduit les composants reçus en lignes à écrire.
 *
 * Partagé par la création et la correction : c'est le seul endroit où les
 * calories d'un composant `reference` sont calculées, et le seul où l'accès à un
 * aliment personnel d'autrui est refusé. Dupliquer ce corps pour le `PATCH`
 * aurait fait diverger les deux chemins à la première évolution.
 *
 * Rend soit les lignes, soit le refus à renvoyer tel quel.
 */
async function construireComposants(
  userId: string,
  entrants: ItemEntrant[],
): Promise<
  | { ok: true; composants: ComposantEcrit[]; libelles: string[] }
  | { ok: false; statut: 404 | 422; corps: ReturnType<typeof erreur> }
> {
  const idsAliments = entrants.flatMap((item) => (item.type === 'reference' ? [item.food_id] : []))

  const alimentsParId = new Map(
    idsAliments.length === 0
      ? []
      : (
          await db
            .select()
            .from(foods)
            .where(and(inArray(foods.id, idsAliments), eq(foods.actif, true)))
        ).map((aliment) => [aliment.id, aliment]),
  )

  const idsPortions = entrants.flatMap((item) =>
    item.type === 'reference' && item.portion_id ? [item.portion_id] : [],
  )
  const portionsParId = new Map(
    idsPortions.length === 0
      ? []
      : (
          await db.select().from(foodPortions).where(inArray(foodPortions.id, idsPortions))
        ).map((portion) => [portion.id, portion]),
  )

  const composants: ComposantEcrit[] = []
  const libelles: string[] = []

  for (const [position, item] of entrants.entries()) {
    if (item.type === 'libre') {
      libelles.push(item.libelle)
      composants.push({
        id: Bun.randomUUIDv7(),
        foodEntryId: '',
        position,
        type: 'libre',
        libelle: item.libelle,
        kcal: item.kcal,
        proteinesG: item.proteines_g ?? null,
        glucidesG: item.glucides_g ?? null,
        lipidesG: item.lipides_g ?? null,
      })
      continue
    }

    const aliment = alimentsParId.get(item.food_id)
    if (!aliment) {
      return {
        ok: false,
        statut: 404,
        corps: erreur('aliment_introuvable', "Cet aliment n'existe pas.", {
          food_id: item.food_id,
        }),
      }
    }
    // Un aliment personnel n'est jamais visible d'un autre compte.
    if (aliment.userId !== null && aliment.userId !== userId) {
      return {
        ok: false,
        statut: 404,
        corps: erreur('aliment_introuvable', "Cet aliment n'existe pas."),
      }
    }

    let grammes: number
    if (item.portion_id) {
      const portion = portionsParId.get(item.portion_id)
      if (!portion || portion.foodId !== aliment.id) {
        return {
          ok: false,
          statut: 404,
          corps: erreur('portion_introuvable', "Cette portion n'existe pas."),
        }
      }
      grammes = item.quantite * portion.grammes
    } else if (item.unite === 'g' || item.unite === 'ml') {
      grammes = item.quantite
    } else {
      return {
        ok: false,
        statut: 422,
        corps: erreur('portion_requise', 'Cet aliment demande une portion ou une quantité en grammes.', {
          food_id: aliment.id,
        }),
      }
    }

    const facteur = grammes / 100
    libelles.push(aliment.libelle)
    composants.push({
      id: Bun.randomUUIDv7(),
      foodEntryId: '',
      position,
      type: 'reference',
      foodId: aliment.id,
      libelle: aliment.libelle,
      quantite: item.quantite,
      unite: item.unite,
      portionId: item.portion_id ?? null,
      kcal: Math.round(aliment.kcal100g * facteur),
      proteinesG: aliment.proteines100g === null ? null : aliment.proteines100g * facteur,
      glucidesG: aliment.glucides100g === null ? null : aliment.glucides100g * facteur,
      lipidesG: aliment.lipides100g === null ? null : aliment.lipides100g * facteur,
      // Figé : l'historique reste vérifiable si l'aliment change ensuite.
      kcalRefUtilise: aliment.kcal100g,
    })
  }

  return { ok: true, composants, libelles }
}

/**
 * Note ce que l'utilisateur vient de consommer, aliment par aliment.
 *
 * Cette table porte deux comportements documentés que rien d'autre n'alimente :
 * le **classement personnel** de la recherche (doc 08 § 5, mesure 4 — ce que j'ai
 * déjà mangé passe devant CIQUAL) et la **quantité pré-remplie** à la
 * consommation suivante (doc 08 § 6, « le raccourci le plus rentable de tout
 * l'écran »). Sans cette écriture, les deux restent lettre morte et la recherche
 * ne s'améliore jamais avec l'usage.
 *
 * `incrementer` distingue une consommation d'une correction : corriger la
 * quantité d'un repas déjà saisi met à jour la dernière quantité, mais ne
 * compte pas un repas de plus.
 */
async function noterUsages(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  composants: ComposantEcrit[],
  { incrementer }: { incrementer: boolean },
) {
  // Deux lignes du même aliment dans un repas ne font qu'un usage — et surtout,
  // Postgres refuse deux fois la même cible de conflit dans un seul `insert`.
  const parAliment = new Map<string, ComposantEcrit>()
  for (const composant of composants) {
    if (composant.type === 'reference' && composant.foodId) parAliment.set(composant.foodId, composant)
  }
  if (parAliment.size === 0) return

  const maintenant = new Date()
  for (const [foodId, composant] of parAliment) {
    const derniere = {
      derniereQuantite: composant.quantite ?? null,
      derniereUnite: composant.unite ?? null,
      dernierPortionId: composant.portionId ?? null,
    }
    await tx
      .insert(userFoodUsages)
      .values({
        userId,
        foodId,
        usages: incrementer ? 1 : 0,
        dernierUsageAt: maintenant,
        ...derniere,
      })
      .onConflictDoUpdate({
        target: [userFoodUsages.userId, userFoodUsages.foodId],
        set: {
          ...(incrementer ? { usages: sql`${userFoodUsages.usages} + 1` } : {}),
          dernierUsageAt: maintenant,
          ...derniere,
        },
      })
  }
}

export const foodEntryRoutes = new Elysia()
  .use(authMacro)
  .post(
    '/food-entries',
    async ({ utilisateur, body, status }) => {
      const occurredAt = body.occurred_at ? new Date(body.occurred_at) : new Date()
      const localDate = jourLocal(occurredAt, await reglesDeJournee(utilisateur.id))

      // Les composants `reference` n'envoient pas de calories : le serveur les
      // calcule depuis l'aliment, pour que le calcul reste en un seul endroit.
      const construits = await construireComposants(utilisateur.id, body.items)
      if (!construits.ok) return status(construits.statut, construits.corps)

      const { composants, libelles } = construits
      const total = composants.reduce((somme, item) => somme + item.kcal, 0)
      const entryId = body.id ?? Bun.randomUUIDv7()

      const entree = await db.transaction(async (tx) => {
        const [cree] = await tx
          .insert(foodEntries)
          .values({
            id: entryId,
            userId: utilisateur.id,
            occurredAt,
            localDate,
            libelle: body.libelle ?? libelleDerive(libelles),
            // Le total ne s'écrit jamais directement : il est toujours Σ items.
            kcal: total,
            etat: 'manuel',
            source: 'manuel',
          })
          .returning()

        await tx.insert(foodEntryItems).values(
          composants.map((item) => ({ ...item, foodEntryId: entryId })),
        )
        await noterUsages(tx, utilisateur.id, composants, { incrementer: true })

        return cree!
      })

      return { ...entree, items: composants.map(({ foodEntryId: _, ...item }) => item) }
    },
    { auth: true, body: corpsEntree },
  )
  /**
   * Correction d'une entrée (doc 06 § 5).
   *
   * `items` **remplace** la liste : un composant n'a pas de cycle de vie propre,
   * il est écrit avec son parent. Le total est recalculé, jamais transmis.
   *
   * L'état ne bascule en `corrige` que pour une entrée issue d'une estimation :
   * c'est là que la correction dit quelque chose — le modèle a proposé, l'humain
   * a tranché. Une entrée saisie à la main puis modifiée à la main reste
   * `manuel` ; la marquer « corrigée » salirait la seule statistique qui compte,
   * celle de la justesse du modèle.
   */
  .patch(
    '/food-entries/:id',
    async ({ utilisateur, params, body, status }) => {
      const [existante] = await db
        .select()
        .from(foodEntries)
        .where(
          and(
            eq(foodEntries.id, params.id),
            eq(foodEntries.userId, utilisateur.id),
            isNull(foodEntries.deletedAt),
          ),
        )

      if (!existante) return status(404, erreur('entree_introuvable', "Cette entrée n'existe pas."))

      const occurredAt = body.occurred_at ? new Date(body.occurred_at) : existante.occurredAt
      const localDate = body.occurred_at
        ? jourLocal(occurredAt, await reglesDeJournee(utilisateur.id))
        : existante.localDate

      const construits = body.items
        ? await construireComposants(utilisateur.id, body.items)
        : null
      if (construits && !construits.ok) return status(construits.statut, construits.corps)

      const venaitDeLIA = existante.source === 'ia_photo' || existante.source === 'ia_texte'

      const { entree, composants } = await db.transaction(async (tx) => {
        if (construits?.ok) {
          await tx.delete(foodEntryItems).where(eq(foodEntryItems.foodEntryId, existante.id))
          await tx.insert(foodEntryItems).values(
            construits.composants.map((item) => ({
              ...item,
              foodEntryId: existante.id,
              // Verrou au composant : l'estimation ne réécrira pas ce choix.
              editedByUser: venaitDeLIA,
            })),
          )
          await noterUsages(tx, utilisateur.id, construits.composants, { incrementer: false })
        }

        const [modifiee] = await tx
          .update(foodEntries)
          .set({
            occurredAt,
            localDate,
            libelle:
              body.libelle ??
              (construits?.ok ? libelleDerive(construits.libelles) : existante.libelle),
            ...(construits?.ok
              ? {
                  kcal: construits.composants.reduce((somme, item) => somme + item.kcal, 0),
                  etat: venaitDeLIA ? ('corrige' as const) : existante.etat,
                  editedByUser: venaitDeLIA ? true : existante.editedByUser,
                }
              : {}),
          })
          .where(eq(foodEntries.id, existante.id))
          .returning()

        const lignes = await tx
          .select()
          .from(foodEntryItems)
          .where(eq(foodEntryItems.foodEntryId, existante.id))

        return { entree: modifiee!, composants: lignes }
      })

      return { ...entree, items: composants }
    },
    {
      auth: true,
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({
        occurred_at: t.Optional(t.String()),
        libelle: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
        items: t.Optional(items),
      }),
    },
  )
  .delete(
    '/food-entries/:id',
    async ({ utilisateur, params, status }) => {
      const [supprimee] = await db
        .update(foodEntries)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(foodEntries.id, params.id),
            eq(foodEntries.userId, utilisateur.id),
            isNull(foodEntries.deletedAt),
          ),
        )
        .returning({ id: foodEntries.id })

      if (!supprimee) return status(404, erreur('entree_introuvable', "Cette entrée n'existe pas."))
      return status(204)
    },
    { auth: true, params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  )
