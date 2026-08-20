import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  numeric,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { users } from './auth'
import { horodatages } from './commun'
import { sexeEnum } from './enums'

/**
 * Morphologie et préférences. Une ligne par utilisateur. Doc 05 § 2.
 *
 * Tous les champs morphologiques sont nullables : la ligne est créée en même
 * temps que le compte, et l'onboarding la remplit écran par écran. Le budget
 * n'est calculable qu'une fois `sexe`, `dateNaissance` et `tailleCm` renseignés.
 */
export const profiles = pgTable('profiles', {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  sexe: sexeEnum(),
  /** L'âge est dérivé, jamais stocké. */
  dateNaissance: date(),
  tailleCm: smallint(),
  /** Fuseau IANA, ex. `Europe/Paris`. Détermine le `local_date` des entrées. */
  timezone: text().notNull().default('Europe/Paris'),
  /** 0 par défaut, 3 pour les couche-tard. Doc 05 § 1. */
  heureBasculeJournee: smallint().notNull().default(0),
  notificationsPesee: boolean().notNull().default(true),
  notificationsRecap: boolean().notNull().default(true),
  ...horodatages,
})

/**
 * Objectif de perte. Historisé : changer d'objectif ne réécrit pas le passé,
 * sinon le budget d'une journée close bougerait rétroactivement.
 */
export const goals = pgTable(
  'goals',
  {
    id: uuid().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Après application des plafonds du doc 02 § 6. */
    rythmeKgSemaine: numeric({ precision: 3, scale: 2, mode: 'number' }).notNull(),
    /** Ce que l'utilisateur avait demandé, s'il a été plafonné. */
    rythmeDemande: numeric({ precision: 3, scale: 2, mode: 'number' }).notNull(),
    poidsCibleKg: numeric({ precision: 5, scale: 2, mode: 'number' }),
    debutLe: date().notNull(),
    /** `null` = objectif actif. */
    finLe: date(),
    ...horodatages,
  },
  (table) => [
    // Au plus un objectif actif par utilisateur. Doc 05 § 2.
    uniqueIndex('goals_actif_unique').on(table.userId).where(sql`fin_le is null`),
  ],
)

export type Profile = typeof profiles.$inferSelect
export type Goal = typeof goals.$inferSelect
