import { sql } from 'drizzle-orm'
import { boolean, date, index, numeric, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { users } from './auth'
import { synchronisable } from './commun'

/**
 * Pesées brutes. La tendance n'est **pas** stockée ici : elle est dérivée de la
 * série par lissage exponentiel (doc 02 § 4), et la recalculer garantit qu'elle
 * reste cohérente si une pesée est corrigée ou supprimée.
 */
export const weighIns = pgTable(
  'weigh_ins',
  {
    id: uuid().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Jour local de rattachement, figé à l'écriture. */
    localDate: date().notNull(),
    occurredAt: timestamp({ withTimezone: true }).notNull(),
    poidsKg: numeric({ precision: 5, scale: 2, mode: 'number' }).notNull(),
    /** Écart > 3 kg avec la tendance : incluse dans le calcul, mais signalée. */
    estAberrante: boolean().notNull().default(false),
    ...synchronisable,
  },
  (table) => [
    // Une pesée par jour local ; la dernière écrase. Doc 05 § 3.
    uniqueIndex('weigh_ins_jour_unique')
      .on(table.userId, table.localDate)
      .where(sql`deleted_at is null`),
    index('weigh_ins_tendance_idx')
      .on(table.userId, table.localDate)
      .where(sql`deleted_at is null`),
    // Synchronisation différentielle (doc 06 § 11).
    index('weigh_ins_sync_idx').on(table.userId, table.updatedAt),
  ],
)

export type WeighIn = typeof weighIns.$inferSelect
