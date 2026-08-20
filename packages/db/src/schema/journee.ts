import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  uuid,
} from 'drizzle-orm/pg-core'

import { users } from './auth'
import { horodatages } from './commun'
import { phaseEnum } from './enums'

/**
 * Récapitulatif quotidien **figé**, écrit à la clôture de la journée locale.
 *
 * Sans cette table, tout écran d'historique referait N calculs à chaque
 * affichage, et un changement de profil réécrirait le passé. La journée en cours
 * est calculée à la volée ; les journées closes sont lues ici et ne bougent plus
 * (doc 05 § 5, invariant 4).
 *
 * Elle n'est **jamais** synchronisée vers le client : elle est dérivée, et le
 * serveur en est seul propriétaire (doc 06 § 11).
 */
export const dailySummaries = pgTable(
  'daily_summaries',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    localDate: date().notNull(),
    /** Figés : le triplet qui a servi à établir l'apport cible de la journée. */
    bmr: integer().notNull(),
    socle: integer().notNull(),
    deficitCible: integer().notNull(),
    apportCibleKcal: integer().notNull(),
    eatKcal: integer().notNull().default(0),
    /**
     * Besoin énergétique journalier : la dépense d'équilibre affichée, celle pour
     * laquelle la balance est nulle (doc 02 § 3.2). À ne pas confondre avec la
     * dépense réelle, qui dépend de ce qui a été mangé.
     */
    besoinJournalierKcal: integer().notNull(),
    apportsKcal: integer().notNull().default(0),
    /**
     * Somme protéique du jour, `null` si aucun composant n'en porte. Borne
     * inférieure dès qu'un composant libre ne renseigne pas ses protéines —
     * d'où le drapeau qui suit (doc 02 § 9).
     */
    proteinesG: numeric({ precision: 5, scale: 1, mode: 'number' }),
    proteinesPartielles: boolean().notNull().default(false),
    /** Figé : `1,6 × tendance de poids`, arrondi à 5 g près. Doc 02 § 9. */
    plancherProteinesG: smallint().notNull(),
    /** `apports − dépense réelle`, TEF calculé sur ce qui a été mangé (§ 8). */
    balanceKcal: integer().notNull().default(0),
    /** Entrées en attente d'estimation, exclues des totaux. */
    entreesEnAttente: smallint().notNull().default(0),
    tendancePoidsKg: numeric({ precision: 5, scale: 2, mode: 'number' }),
    phase: phaseEnum().notNull(),
    ...horodatages,
  },
  (table) => [primaryKey({ columns: [table.userId, table.localDate] })],
)

export type DailySummary = typeof dailySummaries.$inferSelect
