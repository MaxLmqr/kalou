import { sql } from 'drizzle-orm'
import { timestamp } from 'drizzle-orm/pg-core'

/**
 * Horodatages standards. Doc 05 § 1 : `timestamptz` partout, jamais de
 * `timestamp` nu — sinon un changement d'heure ou un voyage décale l'histoire.
 */
export const horodatages = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

/**
 * Colonnes d'une table synchronisable avec le client hors ligne (doc 06 § 11).
 * La suppression est logique : un `pull` différentiel doit pouvoir annoncer au
 * client ce qui a disparu.
 */
export const synchronisable = {
  ...horodatages,
  deletedAt: timestamp({ withTimezone: true }),
}

/** Filtre des lignes vivantes, pour les index partiels. */
export const nonSupprime = sql`deleted_at is null`
