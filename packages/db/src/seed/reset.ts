/**
 * Remise à zéro de la base de développement : on vide, on remigre, on reseed.
 */
import { dirname, join } from 'node:path'

import { seed } from './index'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL est manquant.')

// Seul garde-fou conservé : la commande efface tout, autant qu'elle refuse de
// le faire ailleurs que sur une base locale.
const hote = new URL(databaseUrl).hostname
if (!['localhost', '127.0.0.1', '::1'].includes(hote)) {
  console.error(`✗ « ${hote} » n'est pas une base locale : remise à zéro refusée.`)
  process.exit(1)
}

const debut = Date.now()
const sql = new Bun.SQL(databaseUrl)

// Le serveur de développement garde des connexions ouvertes, et `drop schema`
// attendrait alors un verrou qu'il n'obtient jamais.
await sql`
  select pg_terminate_backend(pid) from pg_stat_activity
   where datname = current_database() and pid <> pg_backend_pid()
`
await sql.unsafe('drop schema if exists drizzle cascade')
await sql.unsafe('drop schema if exists public cascade')
await sql.unsafe('create schema public')
await sql.end()

const migration = Bun.spawn(['bunx', 'drizzle-kit', 'migrate'], {
  cwd: join(dirname(new URL(import.meta.url).pathname), '..', '..'),
  stdout: 'pipe',
  stderr: 'pipe',
})
if ((await migration.exited) !== 0) {
  console.error(await new Response(migration.stderr).text())
  process.exit(1)
}

await seed()
console.log(`\nBase remise à zéro en ${((Date.now() - debut) / 1000).toFixed(1)} s.`)
process.exit(0)
