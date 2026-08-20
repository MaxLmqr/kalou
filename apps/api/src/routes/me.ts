import { db, goals, profiles } from '@kalou/db'
import { and, eq, isNull } from 'drizzle-orm'
import { Elysia, t } from 'elysia'

import { age, appliquerPlafonds, bmr, jourLocal, socleFormule, type Sexe } from '../domain'
import { erreur, profilIncomplet } from '../http/erreurs'
import { authMacro } from '../plugins/auth'
import { etatDuProfil, tendanceAuJour } from '../services/journee'

const corpsProfil = t.Object({
  sexe: t.Optional(t.Union([t.Literal('homme'), t.Literal('femme')])),
  date_naissance: t.Optional(t.String({ format: 'date' })),
  taille_cm: t.Optional(t.Integer({ minimum: 100, maximum: 250 })),
  timezone: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
  heure_bascule_journee: t.Optional(t.Integer({ minimum: 0, maximum: 6 })),
  notifications_pesee: t.Optional(t.Boolean()),
  notifications_recap: t.Optional(t.Boolean()),
})

export const meRoutes = new Elysia()
  .use(authMacro)
  .get(
    '/me',
    async ({ utilisateur }) => {
      const [profile] = await db.select().from(profiles).where(eq(profiles.userId, utilisateur.id))
      const [goal] = await db
        .select()
        .from(goals)
        .where(and(eq(goals.userId, utilisateur.id), isNull(goals.finLe)))

      const aujourdhui = jourLocal(new Date(), {
        timezone: profile?.timezone ?? 'Europe/Paris',
        heureBascule: profile?.heureBasculeJournee ?? 0,
      })
      const etat = await etatDuProfil(utilisateur.id, aujourdhui)

      return {
        user: { id: utilisateur.id, email: utilisateur.email },
        profile: profile ?? null,
        goal: goal ?? null,
        onboarding: etat.complet ? { complet: true as const } : { complet: false as const, manque: etat.manque },
        // La calibration n'existe qu'au jalon 4 ; la phase est donc figée.
        calibration_state: { phase: 'formule' as const },
      }
    },
    { auth: true },
  )
  .patch(
    '/me/profile',
    async ({ utilisateur, body }) => {
      const champs = {
        ...(body.sexe !== undefined && { sexe: body.sexe }),
        ...(body.date_naissance !== undefined && { dateNaissance: body.date_naissance }),
        ...(body.taille_cm !== undefined && { tailleCm: body.taille_cm }),
        ...(body.timezone !== undefined && { timezone: body.timezone }),
        ...(body.heure_bascule_journee !== undefined && {
          heureBasculeJournee: body.heure_bascule_journee,
        }),
        ...(body.notifications_pesee !== undefined && {
          notificationsPesee: body.notifications_pesee,
        }),
        ...(body.notifications_recap !== undefined && {
          notificationsRecap: body.notifications_recap,
        }),
      }

      // Upsert plutôt que mise à jour : le profil est normalement créé avec le
      // compte, mais un `update` sur une ligne absente échouerait en silence.
      const [profile] = await db
        .insert(profiles)
        .values({ userId: utilisateur.id, ...champs })
        .onConflictDoUpdate({ target: profiles.userId, set: champs })
        .returning()

      return profile!
    },
    { auth: true, body: corpsProfil },
  )
  .put(
    '/me/goal',
    async ({ utilisateur, body, status }) => {
      const [profile] = await db.select().from(profiles).where(eq(profiles.userId, utilisateur.id))
      const timezone = profile?.timezone ?? 'Europe/Paris'
      const aujourdhui = jourLocal(new Date(), {
        timezone,
        heureBascule: profile?.heureBasculeJournee ?? 0,
      })

      const etat = await etatDuProfil(utilisateur.id, aujourdhui)
      // L'objectif est le dernier écran de l'onboarding : tout le reste doit
      // être là, sinon les plafonds qui en dépendent ne sont pas calculables.
      const manque = etat.complet ? [] : etat.manque.filter((quoi) => quoi !== 'objectif')
      if (manque.length > 0 || !profile) return status(422, profilIncomplet(manque))

      const tendanceKg = await tendanceAuJour(utilisateur.id, aujourdhui)
      if (tendanceKg === null) return status(422, profilIncomplet(['pesee']))

      const bmrKcal = bmr({
        sexe: profile.sexe as Sexe,
        poidsKg: tendanceKg,
        tailleCm: profile.tailleCm!,
        ageAns: age(new Date(profile.dateNaissance!), new Date(`${aujourdhui}T12:00:00Z`)),
      })

      const resultat = appliquerPlafonds({
        rythmeDemandeKgSemaine: body.rythme_kg_semaine,
        poidsKg: tendanceKg,
        socleApplique: socleFormule(bmrKcal),
        eatKcal: 0,
        w: 0,
        sexe: profile.sexe as Sexe,
      })

      if (body.poids_cible_kg !== undefined && body.poids_cible_kg >= tendanceKg) {
        return status(
          422,
          erreur(
            'poids_cible_incoherent',
            'Le poids cible doit être inférieur à ton poids actuel.',
            { tendance_kg: tendanceKg },
          ),
        )
      }

      const goal = await db.transaction(async (tx) => {
        // Historisé : on clôt l'objectif courant au lieu de l'écraser, sinon
        // l'apport cible des journées passées bougerait rétroactivement.
        await tx
          .update(goals)
          .set({ finLe: aujourdhui })
          .where(and(eq(goals.userId, utilisateur.id), isNull(goals.finLe)))

        const [cree] = await tx
          .insert(goals)
          .values({
            id: Bun.randomUUIDv7(),
            userId: utilisateur.id,
            rythmeKgSemaine: Math.round(resultat.rythmeAppliqueKgSemaine * 100) / 100,
            rythmeDemande: body.rythme_kg_semaine,
            poidsCibleKg: body.poids_cible_kg ?? null,
            debutLe: aujourdhui,
          })
          .returning()

        return cree!
      })

      return {
        goal,
        rythme_applique: goal.rythmeKgSemaine,
        plafonds_appliques: resultat.plafondsAppliques,
        apport_cible_estime: Math.round(resultat.apportCibleKcal),
        besoin_journalier_estime: Math.round(resultat.besoinJournalierKcal),
      }
    },
    {
      auth: true,
      body: t.Object({
        rythme_kg_semaine: t.Number({ minimum: 0.05, maximum: 2 }),
        poids_cible_kg: t.Optional(t.Number({ minimum: 30, maximum: 300 })),
      }),
    },
  )
