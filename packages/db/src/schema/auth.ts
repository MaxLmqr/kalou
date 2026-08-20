import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { horodatages } from './commun'

/**
 * Tables d'authentification, pilotées par Better Auth.
 *
 * Écarts assumés par rapport au schéma que génère `@better-auth/cli` :
 *  — noms au pluriel, pour rester homogène avec le reste du doc 05 ;
 *  — `uuid` plutôt que `text` en clé primaire, et valeurs en UUID v7 ;
 *  — `timestamptz` partout (doc 05 § 1).
 *
 * `apple_sub` et `google_sub`, prévus au doc 05 sur `users`, ne sont pas repris :
 * Better Auth range les identités externes dans `accounts`
 * (`provider_id` + `account_id`), ce qui couvre le besoin sans colonne dédiée et
 * sans limite au nombre de fournisseurs.
 */
export const users = pgTable('users', {
  id: uuid().primaryKey(),
  // Better Auth exige le champ ; l'onboarding ne le demande pas, d'où le défaut.
  name: text().notNull().default(''),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  ...horodatages,
  /** Suppression logique du compte. Doc 05 § 2. */
  deletedAt: timestamp({ withTimezone: true }),
})

export const sessions = pgTable(
  'sessions',
  {
    id: uuid().primaryKey(),
    token: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...horodatages,
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
)

export const accounts = pgTable(
  'accounts',
  {
    id: uuid().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...horodatages,
  },
  (table) => [index('accounts_user_id_idx').on(table.userId)],
)

/** Codes à usage unique : c'est ici qu'atterrit le code à 6 chiffres. */
export const verifications = pgTable(
  'verifications',
  {
    id: uuid().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...horodatages,
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
)

export type User = typeof users.$inferSelect
