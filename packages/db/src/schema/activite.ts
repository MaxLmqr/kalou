import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { users } from './auth'
import { synchronisable } from './commun'

/**
 * Référentiel MET. Table de référence, servie par l'API et mise en cache par le
 * client, pour pouvoir être enrichie sans publier une version de l'application.
 * Alimentée depuis le § 7 du doc 02.
 */
export const activities = pgTable('activities', {
  /** Ex. `course_8kmh`. */
  code: text().primaryKey(),
  libelle: text().notNull(),
  met: numeric({ precision: 4, scale: 2, mode: 'number' }).notNull(),
  /** `cardio`, `force`, `souplesse`, `quotidien`. */
  categorie: text().notNull(),
  icone: text(),
  /** Retrait sans suppression, pour ne pas casser l'historique. */
  actif: boolean().notNull().default(true),
})

/**
 * Dépenses sportives.
 *
 * `met`, `poidsUtiliseKg` et `kcalNet` sont **figés** à l'écriture (doc 02 § 9) :
 * on doit pouvoir recalculer et vérifier une entrée de l'an dernier même si la
 * table MET ou le poids ont changé depuis.
 */
export const activityEntries = pgTable(
  'activity_entries',
  {
    id: uuid().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    occurredAt: timestamp({ withTimezone: true }).notNull(),
    localDate: date().notNull(),
    activityCode: text()
      .notNull()
      .references(() => activities.code),
    dureeMin: smallint().notNull(),
    met: numeric({ precision: 4, scale: 2, mode: 'number' }).notNull(),
    /** Tendance de poids du jour, figée. */
    poidsUtiliseKg: numeric({ precision: 5, scale: 2, mode: 'number' }).notNull(),
    /** Dépense **nette** : le repos est déjà couvert par le socle. */
    kcalNet: integer().notNull(),
    ...synchronisable,
  },
  (table) => [
    index('activity_entries_jour_idx')
      .on(table.userId, table.localDate)
      .where(sql`deleted_at is null`),
    index('activity_entries_sync_idx').on(table.userId, table.updatedAt),
  ],
)

export type Activity = typeof activities.$inferSelect
export type ActivityEntry = typeof activityEntries.$inferSelect
