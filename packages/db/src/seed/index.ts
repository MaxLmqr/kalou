import { sql } from 'drizzle-orm'

import { db } from '../index'
import { activities } from '../schema/activite'
import { ACTIVITES } from './activities'
import { importerAliments } from './aliments'

/** Chemin du jeu de curation, relatif à ce module. */
export function cheminCurationParDefaut(): string {
  return new URL('../../../../docs/data/aliments-premier-jet.csv', import.meta.url).pathname
}

/**
 * Référentiel MET. Idempotent : rejouer le seed met à jour les libellés et les
 * MET sans toucher aux entrées d'activité déjà enregistrées, qui portent leur
 * propre MET figé (doc 05, `activity_entries`).
 */
export async function seedActivites(): Promise<void> {
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

/** Toutes les données de référence : activités et aliments. */
export async function seed(cheminCuration = cheminCurationParDefaut()): Promise<void> {
  await seedActivites()
  await importerAliments(cheminCuration)
}

if (import.meta.main) {
  await seed(process.argv[2])
  process.exit(0)
}
