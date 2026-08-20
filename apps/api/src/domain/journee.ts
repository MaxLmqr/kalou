/**
 * Rattachement d'un instant à une journée locale. Doc 05 § 1 et § 5 (invariant 5).
 *
 * Chaque entrée porte l'instant absolu (`occurred_at`) et le jour local auquel
 * elle est rattachée (`local_date`), calculé **à l'écriture** puis figé. Sans ce
 * figement, un voyage ou un changement d'heure réécrirait l'histoire : un repas
 * pris un mardi soir à Paris changerait de jour parce que l'utilisateur consulte
 * son historique depuis Tokyo.
 */

const MS_PAR_JOUR = 86_400_000

export type ReglesDeJournee = {
  /** Fuseau IANA du profil, ex. `Europe/Paris`. */
  timezone: string
  /**
   * Heure à laquelle bascule la journée : 0 par défaut, 3 pour les couche-tard.
   * À 3, un en-cas pris à 01 h 30 compte pour la veille.
   */
  heureBascule?: number
}

/** Découpe un instant en composantes de calendrier dans un fuseau donné. */
function composantesLocales(instant: Date, timezone: string) {
  const parties = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)

  const valeur = (type: Intl.DateTimeFormatPartTypes): string =>
    parties.find((partie) => partie.type === type)?.value ?? ''

  return {
    date: `${valeur('year')}-${valeur('month')}-${valeur('day')}`,
    heure: Number(valeur('hour')),
  }
}

/**
 * Jour local (`YYYY-MM-DD`) auquel rattacher un instant.
 *
 * Lève si le fuseau est inconnu : mieux vaut refuser l'écriture que ranger
 * l'entrée dans un jour arbitraire.
 */
export function jourLocal(occurredAt: Date, regles: ReglesDeJournee): string {
  const { timezone, heureBascule = 0 } = regles
  const { date, heure } = composantesLocales(occurredAt, timezone)

  // Avant l'heure de bascule, on est encore dans la journée de la veille.
  return heure < heureBascule ? ajouterJours(date, -1) : date
}

/** Décale un jour local d'un nombre entier de jours calendaires. */
export function ajouterJours(localDate: string, jours: number): string {
  const decale = new Date(Date.parse(`${localDate}T00:00:00Z`) + jours * MS_PAR_JOUR)
  return decale.toISOString().slice(0, 10)
}

/** Nombre de jours calendaires entre deux jours locaux (`a` → `b`). */
export function differenceEnJours(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / MS_PAR_JOUR)
}

/** Suite des jours locaux de `debut` à `fin`, bornes comprises. */
export function jours(debut: string, fin: string): string[] {
  const total = differenceEnJours(debut, fin)
  if (total < 0) return []
  return Array.from({ length: total + 1 }, (_, index) => ajouterJours(debut, index))
}

/**
 * Bornes absolues d'une journée locale, pour interroger sur `occurred_at`.
 *
 * La borne haute est **exclusive** : un jour d'été peut durer 23 ou 25 heures,
 * et calculer `début + 24 h` se tromperait deux fois par an.
 */
export function bornesDuJour(
  localDate: string,
  regles: ReglesDeJournee,
): { debut: Date; finExclue: Date } {
  return {
    debut: instantDeBascule(localDate, regles),
    finExclue: instantDeBascule(ajouterJours(localDate, 1), regles),
  }
}

/**
 * Instant auquel commence une journée locale.
 *
 * Le décalage d'un fuseau dépend de l'instant qu'on y mesure, ce qui rend le
 * calcul circulaire. On l'approche depuis une supposition puis on la corrige :
 * une passe suffit hors changement d'heure, deux dans tous les cas.
 */
function instantDeBascule(localDate: string, regles: ReglesDeJournee): Date {
  const { timezone, heureBascule = 0 } = regles
  const vise = Date.parse(`${localDate}T${String(heureBascule).padStart(2, '0')}:00:00Z`)

  let instant = vise
  for (let passe = 0; passe < 2; passe++) {
    const decalage = decalageMs(new Date(instant), timezone)
    const corrige = vise - decalage
    if (corrige === instant) break
    instant = corrige
  }
  return new Date(instant)
}

/** Décalage du fuseau par rapport à UTC, à l'instant donné. */
function decalageMs(instant: Date, timezone: string): number {
  const local = new Date(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .format(instant)
      .replace(', ', 'T') + 'Z',
  )
  return local.getTime() - instant.getTime()
}
