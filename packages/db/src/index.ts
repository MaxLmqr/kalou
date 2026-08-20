import { drizzle } from 'drizzle-orm/bun-sql'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL est manquant. Copie .env.example vers .env.')
}

export const db = drizzle(connectionString, { schema, casing: 'snake_case' })

export type Db = typeof db
export * from './schema'
