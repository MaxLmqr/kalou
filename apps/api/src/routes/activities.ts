import { activities, activityEntries, db, profiles } from '@kalou/db'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { Elysia, t } from 'elysia'

import { jourLocal, kcalNet } from '../domain'
import { erreur, profilIncomplet } from '../http/erreurs'
import { authMacro } from '../plugins/auth'
import { tendanceAuJour } from '../services/journee'

/** Bornes de durée : une séance de plus de 12 h est une erreur de saisie. */
const DUREE_MIN = 1
const DUREE_MAX = 720

async function reglesDeJournee(userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId))
  return {
    timezone: profile?.timezone ?? 'Europe/Paris',
    heureBascule: profile?.heureBasculeJournee ?? 0,
  }
}

export const activityRoutes = new Elysia()
  .use(authMacro)
  /**
   * Référentiel MET (doc 06 § 9). Table de référence, mise en cache par le
   * client : l'`ETag` est un hachage du corps, faute d'horodatage sur la table,
   * et suffit à éviter le transfert quand le seed n'a pas bougé.
   */
  .get(
    '/activities',
    async ({ set, request, status }) => {
      const referentiel = await db
        .select({
          code: activities.code,
          libelle: activities.libelle,
          met: activities.met,
          categorie: activities.categorie,
          icone: activities.icone,
        })
        .from(activities)
        .where(eq(activities.actif, true))
        .orderBy(asc(activities.categorie), asc(activities.met))

      const etag = `W/"${Bun.hash(JSON.stringify(referentiel)).toString(36)}"`

      set.headers['cache-control'] = 'private, max-age=86400'
      set.headers.etag = etag
      if (request.headers.get('if-none-match') === etag) return status(304)

      return referentiel
    },
    { auth: true },
  )
  /**
   * Le client n'envoie ni MET ni calories (doc 06 § 9) : le serveur résout le
   * MET, lit la tendance de poids et fige les trois valeurs. Le calcul reste
   * ainsi en un seul endroit, et l'entrée reste vérifiable des années plus tard.
   */
  .post(
    '/activity-entries',
    async ({ utilisateur, body, status }) => {
      const [activite] = await db
        .select()
        .from(activities)
        .where(and(eq(activities.code, body.activity_code), eq(activities.actif, true)))

      if (!activite) {
        return status(404, erreur('activite_introuvable', "Cette activité n'existe pas.", {
          activity_code: body.activity_code,
        }))
      }

      const occurredAt = body.occurred_at ? new Date(body.occurred_at) : new Date()
      const localDate = jourLocal(occurredAt, await reglesDeJournee(utilisateur.id))

      // Le poids figé est la tendance du jour (doc 02 § 7). Elle n'existe pas
      // tant qu'aucune pesée n'a été saisie : on refuse plutôt que d'inventer un
      // poids par défaut, qui produirait une dépense fausse sans le dire.
      const poidsKg = await tendanceAuJour(utilisateur.id, localDate)
      if (poidsKg === null) return status(422, profilIncomplet(['pesee']))

      const [entree] = await db
        .insert(activityEntries)
        .values({
          id: body.id ?? Bun.randomUUIDv7(),
          userId: utilisateur.id,
          occurredAt,
          localDate,
          activityCode: activite.code,
          dureeMin: body.duree_min,
          met: activite.met,
          poidsUtiliseKg: poidsKg,
          kcalNet: Math.round(kcalNet({ met: activite.met, poidsKg, dureeMin: body.duree_min })),
        })
        .returning()

      return entree!
    },
    {
      auth: true,
      body: t.Object({
        id: t.Optional(t.String({ format: 'uuid' })),
        occurred_at: t.Optional(t.String()),
        activity_code: t.String({ minLength: 1, maxLength: 60 }),
        duree_min: t.Integer({ minimum: DUREE_MIN, maximum: DUREE_MAX }),
      }),
    },
  )
  /**
   * Correction d'une entrée : durée et instant seulement — changer d'activité,
   * c'est saisir autre chose.
   *
   * Le MET reste celui capté à la saisie : il appartient à l'entrée, pas à la
   * table, qui a pu bouger depuis. Le poids, lui, est *défini* comme la tendance
   * du jour de l'entrée ; il n'est donc refiguré que si l'entrée change de jour.
   */
  .patch(
    '/activity-entries/:id',
    async ({ utilisateur, params, body, status }) => {
      const [existante] = await db
        .select()
        .from(activityEntries)
        .where(
          and(
            eq(activityEntries.id, params.id),
            eq(activityEntries.userId, utilisateur.id),
            isNull(activityEntries.deletedAt),
          ),
        )

      if (!existante) return status(404, erreur('entree_introuvable', "Cette entrée n'existe pas."))

      const occurredAt = body.occurred_at ? new Date(body.occurred_at) : existante.occurredAt
      const localDate = body.occurred_at
        ? jourLocal(occurredAt, await reglesDeJournee(utilisateur.id))
        : existante.localDate

      let poidsKg = existante.poidsUtiliseKg
      if (localDate !== existante.localDate) {
        const tendance = await tendanceAuJour(utilisateur.id, localDate)
        if (tendance === null) return status(422, profilIncomplet(['pesee']))
        poidsKg = tendance
      }

      const dureeMin = body.duree_min ?? existante.dureeMin

      const [modifiee] = await db
        .update(activityEntries)
        .set({
          occurredAt,
          localDate,
          dureeMin,
          poidsUtiliseKg: poidsKg,
          kcalNet: Math.round(kcalNet({ met: existante.met, poidsKg, dureeMin })),
        })
        .where(eq(activityEntries.id, existante.id))
        .returning()

      return modifiee!
    },
    {
      auth: true,
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({
        occurred_at: t.Optional(t.String()),
        duree_min: t.Optional(t.Integer({ minimum: DUREE_MIN, maximum: DUREE_MAX })),
      }),
    },
  )
  .delete(
    '/activity-entries/:id',
    async ({ utilisateur, params, status }) => {
      const [supprimee] = await db
        .update(activityEntries)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(activityEntries.id, params.id),
            eq(activityEntries.userId, utilisateur.id),
            isNull(activityEntries.deletedAt),
          ),
        )
        .returning({ id: activityEntries.id })

      if (!supprimee) return status(404, erreur('entree_introuvable', "Cette entrée n'existe pas."))
      return status(204)
    },
    { auth: true, params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  )
