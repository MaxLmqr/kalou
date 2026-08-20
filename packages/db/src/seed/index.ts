import { sql } from 'drizzle-orm'

import { db } from '../index'
import { activities } from '../schema/activite'
import { ACTIVITES } from './activities'

/**
 * Alimente les tables de référence. Idempotent : rejouer le seed met à jour les
 * libellés et les MET sans toucher aux entrées d'activité déjà enregistrées, qui
 * portent leur propre MET figé (doc 05, `activity_entries`).
 */
export async function seed(): Promise<void> {
  const resultat = await db
    .insert(activities)
    .values([...ACTIVITES])
    .onConflictDoUpdate({
      target: activities.code,
      set: {
        libelle: sql`excluded.libelle`,
        met: sql`excluded.met`,
        categorie: sql`excluded.categorie`,
        icone: sql`excluded.icone`,
      },
    })
    .returning({ code: activities.code })

  console.log(`✓ ${resultat.length} activités dans le référentiel MET`)
}

if (import.meta.main) {
  await seed()
  process.exit(0)
}
