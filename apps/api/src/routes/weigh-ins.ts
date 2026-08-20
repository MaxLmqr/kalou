import { db, profiles, weighIns } from '@kalou/db'
import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { Elysia, t } from 'elysia'

import { ECART_PESEE_ABERRANTE_KG, calculerTendance, jourLocal } from '../domain'
import { authMacro } from '../plugins/auth'

async function reglesDeJournee(userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId))
  return {
    timezone: profile?.timezone ?? 'Europe/Paris',
    heureBascule: profile?.heureBasculeJournee ?? 0,
  }
}

export const weighInRoutes = new Elysia()
  .use(authMacro)
  .post(
    '/weigh-ins',
    async ({ utilisateur, body }) => {
      const occurredAt = body.occurred_at ? new Date(body.occurred_at) : new Date()
      const localDate = jourLocal(occurredAt, await reglesDeJournee(utilisateur.id))

      // Une pesée par jour local : la dernière écrase (doc 05 § 2).
      await db
        .insert(weighIns)
        .values({
          id: body.id ?? Bun.randomUUIDv7(),
          userId: utilisateur.id,
          localDate,
          occurredAt,
          poidsKg: body.poids_kg,
        })
        .onConflictDoUpdate({
          target: [weighIns.userId, weighIns.localDate],
          // L'index d'unicité est partiel : sans le même prédicat, Postgres ne
          // le reconnaît pas comme cible de conflit et rejette la requête.
          targetWhere: sql`deleted_at is null`,
          set: { poidsKg: body.poids_kg, occurredAt, deletedAt: null },
        })

      const pesees = await db
        .select({ localDate: weighIns.localDate, poidsKg: weighIns.poidsKg })
        .from(weighIns)
        .where(and(eq(weighIns.userId, utilisateur.id), isNull(weighIns.deletedAt)))
        .orderBy(asc(weighIns.localDate))

      const points = calculerTendance(pesees)
      const point = points.find((p) => p.localDate === localDate)!

      // Le signalement dépend de la série entière : il ne peut être établi
      // qu'après recalcul, pas au moment de l'insertion.
      await db
        .update(weighIns)
        .set({ estAberrante: point.estAberrante })
        .where(and(eq(weighIns.userId, utilisateur.id), eq(weighIns.localDate, localDate)))

      return {
        weigh_in: {
          local_date: localDate,
          occurred_at: occurredAt.toISOString(),
          poids_kg: body.poids_kg,
          est_aberrante: point.estAberrante,
        },
        // C'est la tendance que l'interface affiche, pas la variation brute.
        tendance_kg: Math.round(point.tendanceKg * 100) / 100,
        ecart_signale_kg: point.estAberrante ? ECART_PESEE_ABERRANTE_KG : null,
      }
    },
    {
      auth: true,
      body: t.Object({
        id: t.Optional(t.String({ format: 'uuid' })),
        occurred_at: t.Optional(t.String()),
        poids_kg: t.Number({ minimum: 20, maximum: 400 }),
      }),
    },
  )
  .get(
    '/weigh-ins',
    async ({ utilisateur, query }) => {
      const pesees = await db
        .select({ localDate: weighIns.localDate, poidsKg: weighIns.poidsKg })
        .from(weighIns)
        .where(and(eq(weighIns.userId, utilisateur.id), isNull(weighIns.deletedAt)))
        .orderBy(asc(weighIns.localDate))

      // La tendance se calcule sur la série complète puis se filtre : la tronquer
      // avant donnerait une courbe qui démarre au mauvais endroit.
      const points = calculerTendance(pesees).filter(
        (point) =>
          (!query.from || point.localDate >= query.from) &&
          (!query.to || point.localDate <= query.to),
      )

      return {
        pesees: points.map((point) => ({
          local_date: point.localDate,
          poids_kg: point.poidsKg,
          est_aberrante: point.estAberrante,
        })),
        tendance: points.map((point) => ({
          local_date: point.localDate,
          tendance_kg: Math.round(point.tendanceKg * 100) / 100,
        })),
      }
    },
    {
      auth: true,
      query: t.Object({
        from: t.Optional(t.String({ format: 'date' })),
        to: t.Optional(t.String({ format: 'date' })),
      }),
    },
  )
