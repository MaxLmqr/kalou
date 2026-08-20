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
