import { db, foodEntries, foodEntryItems, foodPortions, foods, profiles } from '@kalou/db'
import { and, eq, inArray, isNull } from 'drizzle-orm'
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

const corpsEntree = t.Object({
  id: t.Optional(t.String({ format: 'uuid' })),
  occurred_at: t.Optional(t.String()),
  libelle: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  items: t.Array(t.Union([itemReference, itemLibre]), { minItems: 1, maxItems: 40 }),
})

type ItemEntrant = typeof corpsEntree.static.items[number]

/** Libellé dérivé des composants quand le client n'en fournit pas. Doc 06 § 5. */
function libelleDerive(libelles: string[]): string {
  const [premier, second, ...reste] = libelles
  if (!second) return premier ?? 'Repas'
  const base = `${premier}, ${second}`
  return reste.length > 0 ? `${base} + ${reste.length}` : base
}

export const foodEntryRoutes = new Elysia()
  .use(authMacro)
  .post(
    '/food-entries',
    async ({ utilisateur, body, status }) => {
      const [profile] = await db.select().from(profiles).where(eq(profiles.userId, utilisateur.id))
      const occurredAt = body.occurred_at ? new Date(body.occurred_at) : new Date()
      const localDate = jourLocal(occurredAt, {
        timezone: profile?.timezone ?? 'Europe/Paris',
        heureBascule: profile?.heureBasculeJournee ?? 0,
      })

      // Les composants `reference` n'envoient pas de calories : le serveur les
      // calcule depuis l'aliment, pour que le calcul reste en un seul endroit.
      const idsAliments = body.items
        .filter((item): item is Extract<ItemEntrant, { type: 'reference' }> => item.type === 'reference')
        .map((item) => item.food_id)

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

      const idsPortions = body.items
        .flatMap((item) => (item.type === 'reference' && item.portion_id ? [item.portion_id] : []))
      const portionsParId = new Map(
        idsPortions.length === 0
          ? []
          : (
              await db.select().from(foodPortions).where(inArray(foodPortions.id, idsPortions))
            ).map((portion) => [portion.id, portion]),
      )

      const composants: (typeof foodEntryItems.$inferInsert)[] = []
      const libelles: string[] = []

      for (const [position, item] of body.items.entries()) {
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
          return status(404, erreur('aliment_introuvable', "Cet aliment n'existe pas.", {
            food_id: item.food_id,
          }))
        }
        // Un aliment personnel n'est jamais visible d'un autre compte.
        if (aliment.userId !== null && aliment.userId !== utilisateur.id) {
          return status(404, erreur('aliment_introuvable', "Cet aliment n'existe pas."))
        }

        let grammes: number
        if (item.portion_id) {
          const portion = portionsParId.get(item.portion_id)
          if (!portion || portion.foodId !== aliment.id) {
            return status(404, erreur('portion_introuvable', "Cette portion n'existe pas."))
          }
          grammes = item.quantite * portion.grammes
        } else if (item.unite === 'g' || item.unite === 'ml') {
          grammes = item.quantite
        } else {
          return status(
            422,
            erreur(
              'portion_requise',
              'Cet aliment demande une portion ou une quantité en grammes.',
              { food_id: aliment.id },
            ),
          )
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

        return cree!
      })

      return { ...entree, items: composants.map(({ foodEntryId: _, ...item }) => item) }
    },
    { auth: true, body: corpsEntree },
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
