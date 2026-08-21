import { activities, activityEntries, db, foodEntries, foodEntryItems, profiles, weighIns } from '@kalou/db'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { Elysia, t } from 'elysia'

import { jourLocal } from '../domain'
import { profilIncomplet } from '../http/erreurs'
import { authMacro } from '../plugins/auth'
import { calculerJournee, etatDuProfil } from '../services/journee'

/** Journal du jour : repas, séances et pesée, triés par instant. */
async function journalDuJour(userId: string, localDate: string) {
  const entrees = await db
    .select()
    .from(foodEntries)
    .where(
      and(
        eq(foodEntries.userId, userId),
        eq(foodEntries.localDate, localDate),
        isNull(foodEntries.deletedAt),
      ),
    )
    .orderBy(asc(foodEntries.occurredAt))

  const composants =
    entrees.length === 0
      ? []
      : await db
          .select()
          .from(foodEntryItems)
          .where(
            inArray(
              foodEntryItems.foodEntryId,
              entrees.map((entree) => entree.id),
            ),
          )
          .orderBy(asc(foodEntryItems.position))

  // Le libellé vit dans le référentiel MET, pas dans l'entrée : sans cette
  // jointure, le journal ne pourrait afficher que `course_8kmh`. On ne filtre
  // pas sur `actif` — une activité retirée du référentiel ne doit pas faire
  // disparaître les séances déjà enregistrées.
  const activites = await db
    .select({ entree: activityEntries, libelle: activities.libelle })
    .from(activityEntries)
    .innerJoin(activities, eq(activityEntries.activityCode, activities.code))
    .where(
      and(
        eq(activityEntries.userId, userId),
        eq(activityEntries.localDate, localDate),
        isNull(activityEntries.deletedAt),
      ),
    )
    .orderBy(asc(activityEntries.occurredAt))

  /*
    La pesée est dans le journal, au même titre qu'un repas ou qu'une séance.

    C'est une saisie du jour comme les autres, et l'accueil est l'endroit où l'on
    vérifie ce qu'on a saisi : l'en écarter obligeait à ouvrir un autre écran
    pour savoir si on s'était pesé. Elle ne porte aucune calorie et ne compte
    donc dans aucun total — c'est une ligne de journal, pas un apport.
  */
  const pesees = await db
    .select({
      id: weighIns.id,
      occurredAt: weighIns.occurredAt,
      localDate: weighIns.localDate,
      poidsKg: weighIns.poidsKg,
      estAberrante: weighIns.estAberrante,
    })
    .from(weighIns)
    .where(
      and(
        eq(weighIns.userId, userId),
        eq(weighIns.localDate, localDate),
        isNull(weighIns.deletedAt),
      ),
    )

  return [
    ...entrees.map((entree) => ({
      genre: 'repas' as const,
      ...entree,
      items: composants.filter((item) => item.foodEntryId === entree.id),
    })),
    ...activites.map(({ entree, libelle }) => ({
      genre: 'activite' as const,
      ...entree,
      libelle,
    })),
    ...pesees.map((pesee) => ({ genre: 'pesee' as const, ...pesee })),
  ].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
}

async function vueComplete(userId: string, localDate: string) {
  const etat = await etatDuProfil(userId, localDate)
  if (!etat.complet) return { ok: false as const, manque: etat.manque }

  const [vue, journal] = await Promise.all([
    calculerJournee(userId, localDate, etat),
    journalDuJour(userId, localDate),
  ])
  return { ok: true as const, vue: { ...vue, journal } }
}

export const dayRoutes = new Elysia()
  .use(authMacro)
  /**
   * Raccourci vers la journée en cours, résolue dans le fuseau du profil.
   *
   * Déclarée avant la route paramétrée, sinon `today` serait capté comme une
   * date. Le client ne peut pas la calculer lui-même : l'heure de bascule vit
   * côté serveur, et un téléphone en voyage a le mauvais fuseau.
   */
  .get(
    '/days/today',
    async ({ utilisateur, status }) => {
      const [profile] = await db.select().from(profiles).where(eq(profiles.userId, utilisateur.id))
      const localDate = jourLocal(new Date(), {
        timezone: profile?.timezone ?? 'Europe/Paris',
        heureBascule: profile?.heureBasculeJournee ?? 0,
      })

      const resultat = await vueComplete(utilisateur.id, localDate)
      return resultat.ok ? resultat.vue : status(422, profilIncomplet(resultat.manque))
    },
    { auth: true },
  )
  .get(
    '/days/:local_date',
    async ({ utilisateur, params, status }) => {
      const resultat = await vueComplete(utilisateur.id, params.local_date)
      return resultat.ok ? resultat.vue : status(422, profilIncomplet(resultat.manque))
    },
    { auth: true, params: t.Object({ local_date: t.String({ format: 'date' }) }) },
  )
