import {
  activityEntries,
  db,
  foodEntries,
  foodEntryItems,
  goals,
  profiles,
  weighIns,
  type Goal,
  type Profile,
} from '@kalou/db'
import { and, asc, eq, isNull, lte, ne, sql } from 'drizzle-orm'

import {
  age,
  apportCible,
  balance,
  besoinJournalier,
  bmr,
  deficitQuotidien,
  facteurTef,
  plancherProteines,
  restant,
  socleFormule,
  sommeProteines,
  tendanceCourante,
  type ComposantProteique,
  type Sexe,
} from '../domain'

/** Ce qui manque avant de pouvoir calculer un apport cible. */
export type ManqueOnboarding = 'sexe' | 'date_naissance' | 'taille' | 'pesee' | 'objectif'

export type EtatDuProfil =
  | { complet: true; profile: Profile; goal: Goal; tendanceKg: number }
  | { complet: false; manque: ManqueOnboarding[] }

export type VueDuJour = {
  local_date: string
  apport_cible_kcal: number
  apports_kcal: number
  besoin_journalier_kcal: number
  restant_kcal: number
  balance_kcal: number
  detail: {
    bmr: number
    socle: number
    /** Dépense sportive **nette** du jour, telle que le journal l'affiche. */
    eat_kcal: number
    /**
     * Ce que cette activité ajoute au besoin et à l'apport cible.
     *
     * Ce n'est pas `eat_kcal` : la correction de TEF s'applique à l'activité
     * comme au reste (doc 02 § 3.2), donc 489 kcal courues rendent 543 kcal
     * d'assiette — manger plus coûte aussi plus de digestion. Servi calculé
     * parce que c'est le seul chiffre qui explique l'écart entre deux journées
     * identiques dont l'une a du sport, et que le client n'a pas `w` pour le
     * retrouver lui-même.
     */
    eat_ajout_kcal: number
    deficit_cible: number
  }
  proteines: {
    /** `null` si aucun composant du jour ne porte de valeur protéique. */
    total_g: number | null
    plancher_g: number
    /** Vrai si une entrée libre rend la somme incomplète (borne inférieure). */
    partiel: boolean
  }
  entrees_en_attente: number
  tendance_poids_kg: number | null
}

/**
 * Tendance de poids telle qu'elle était à la fin d'un jour local donné.
 *
 * On ne prend que les pesées jusqu'à ce jour : consulter le 3 juin ne doit pas
 * faire intervenir une pesée du 10.
 */
export async function tendanceAuJour(userId: string, localDate: string): Promise<number | null> {
  const pesees = await db
    .select({ localDate: weighIns.localDate, poidsKg: weighIns.poidsKg })
    .from(weighIns)
    .where(
      and(eq(weighIns.userId, userId), isNull(weighIns.deletedAt), lte(weighIns.localDate, localDate)),
    )
    .orderBy(asc(weighIns.localDate))

  return tendanceCourante(pesees)
}

/** Vérifie que le profil permet un calcul d'apport cible, et dit ce qui manque sinon. */
export async function etatDuProfil(userId: string, localDate: string): Promise<EtatDuProfil> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId))
  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), isNull(goals.finLe)))

  const tendanceKg = await tendanceAuJour(userId, localDate)

  const manque: ManqueOnboarding[] = []
  if (!profile?.sexe) manque.push('sexe')
  if (!profile?.dateNaissance) manque.push('date_naissance')
  if (!profile?.tailleCm) manque.push('taille')
  if (tendanceKg === null) manque.push('pesee')
  if (!goal) manque.push('objectif')

  if (manque.length > 0 || !profile || !goal || tendanceKg === null) {
    return { complet: false, manque }
  }
  return { complet: true, profile, goal, tendanceKg }
}

/** Somme des apports du jour, hors entrées en attente d'estimation. */
async function apportsDuJour(
  userId: string,
  localDate: string,
): Promise<{ apports: number; enAttente: number }> {
  const [ligne] = await db
    .select({
      // Une entrée en attente est exclue du total : ses calories sont inconnues,
      // les compter pour zéro laisserait croire que la journée est complète.
      apports: sql<number>`coalesce(sum(${foodEntries.kcal}) filter (where ${ne(foodEntries.etat, 'en_attente')}), 0)::int`,
      enAttente: sql<number>`count(*) filter (where ${eq(foodEntries.etat, 'en_attente')})::int`,
    })
    .from(foodEntries)
    .where(
      and(
        eq(foodEntries.userId, userId),
        eq(foodEntries.localDate, localDate),
        isNull(foodEntries.deletedAt),
      ),
    )

  return { apports: ligne?.apports ?? 0, enAttente: ligne?.enAttente ?? 0 }
}

/**
 * Composants alimentaires du jour, réduits à ce qui porte les protéines.
 *
 * Les entrées en attente d'estimation n'ont aucun composant (doc 05 § 5,
 * invariant 1) : elles sortent d'elles-mêmes de la somme.
 */
async function composantsDuJour(
  userId: string,
  localDate: string,
): Promise<ComposantProteique[]> {
  return await db
    .select({ type: foodEntryItems.type, proteinesG: foodEntryItems.proteinesG })
    .from(foodEntryItems)
    .innerJoin(foodEntries, eq(foodEntryItems.foodEntryId, foodEntries.id))
    .where(
      and(
        eq(foodEntries.userId, userId),
        eq(foodEntries.localDate, localDate),
        isNull(foodEntries.deletedAt),
      ),
    )
}

/** Somme des dépenses sportives nettes du jour. */
async function eatDuJour(userId: string, localDate: string): Promise<number> {
  const [ligne] = await db
    .select({ eat: sql<number>`coalesce(sum(${activityEntries.kcalNet}), 0)::int` })
    .from(activityEntries)
    .where(
      and(
        eq(activityEntries.userId, userId),
        eq(activityEntries.localDate, localDate),
        isNull(activityEntries.deletedAt),
      ),
    )

  return ligne?.eat ?? 0
}

/**
 * Assemble la vue d'une journée. Doc 06 § 4 — le seul appel nécessaire au rendu
 * de l'écran d'accueil.
 *
 * La calibration est **hors périmètre** (doc 02 § 5, doc 07 V0.1) : le poids `w`
 * est donc nul, le socle vient de la formule et la correction de TEF s'applique
 * pleinement. C'est exactement le régime du § 3.2, et rien dans la réponse
 * n'annonce une mesure à venir.
 */
export async function calculerJournee(
  userId: string,
  localDate: string,
  etat: Extract<EtatDuProfil, { complet: true }>,
): Promise<VueDuJour> {
  const { profile, goal, tendanceKg } = etat

  const [{ apports, enAttente }, eatKcal, composants] = await Promise.all([
    apportsDuJour(userId, localDate),
    eatDuJour(userId, localDate),
    composantsDuJour(userId, localDate),
  ])

  const bmrKcal = bmr({
    sexe: profile.sexe as Sexe,
    poidsKg: tendanceKg,
    tailleCm: profile.tailleCm!,
    ageAns: age(new Date(profile.dateNaissance!), new Date(`${localDate}T12:00:00Z`)),
  })

  const socleApplique = socleFormule(bmrKcal)
  const w = 0
  const deficitKcal = deficitQuotidien(goal.rythmeKgSemaine)

  const besoin = besoinJournalier({ socleApplique, eatKcal, w })
  const cible = apportCible({ socleApplique, eatKcal, deficitKcal, w })
  const proteines = sommeProteines(composants)

  return {
    local_date: localDate,
    apport_cible_kcal: Math.round(cible),
    apports_kcal: apports,
    besoin_journalier_kcal: Math.round(besoin),
    restant_kcal: Math.round(restant(cible, apports)),
    balance_kcal: Math.round(
      balance({ apportsKcal: apports, socleApplique, eatKcal, w }),
    ),
    detail: {
      bmr: Math.round(bmrKcal),
      socle: Math.round(socleApplique),
      eat_kcal: eatKcal,
      eat_ajout_kcal: Math.round(eatKcal * facteurTef(w)),
      deficit_cible: Math.round(deficitKcal),
    },
    proteines: {
      total_g: proteines.totalG,
      plancher_g: plancherProteines(tendanceKg),
      partiel: proteines.partielle,
    },
    entrees_en_attente: enAttente,
    tendance_poids_kg: Math.round(tendanceKg * 100) / 100,
  }
}
