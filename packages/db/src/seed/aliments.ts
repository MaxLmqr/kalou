/**
 * Import de la base d'aliments. Doc 08 § 4 et § 5, procédure du
 * `docs/data/README.md`.
 *
 * Deux étapes distinctes :
 *  1. le jeu CIQUAL complet, mécanique et sans jugement ;
 *  2. le sous-ensemble curé, rapproché de CIQUAL — c'est là que se glissent les
 *     erreurs, d'où le contrôle croisé sur les calories.
 */
import { sql } from 'drizzle-orm'

import { db } from '../index'
import { foodAliases, foodPortions, foods } from '../schema/aliments'
import { normaliserLibelle } from '../texte'
import { chargerCiqual, VERSION_CIQUAL } from './ciqual'

type LigneCuration = {
  categorie: string
  libelle: string
  alias: string[]
  kcalIndicatif: number
  uniteBase: 'g' | 'ml'
  portions: { libelle: string; grammes: number; parDefaut: boolean }[]
}

/**
 * Écart au-delà duquel un rapprochement est jugé douteux.
 *
 * Les valeurs indicatives du CSV sont annoncées justes à ±15 %. Un écart de plus
 * de 40 % ne s'explique donc pas par l'approximation : il signale presque
 * toujours une confusion d'état de préparation — « riz cru » (350 kcal) pris
 * pour « riz cuit » (130), soit le facteur 2,6 dont avertit le README.
 */
const ECART_KCAL_DOUTEUX = 0.4

/**
 * Tolérance absolue, en kcal, sous laquelle l'écart relatif n'a pas de sens.
 *
 * Un café noir à 2 kcal contre 6,9 chez CIQUAL, c'est +245 % pour 5 kcal dans
 * l'assiette : le seuil relatif seul rejetterait un rapprochement juste.
 */
const ECART_KCAL_NEGLIGEABLE = 15

function lireCuration(chemin: string, contenu: string): LigneCuration[] {
  const lignes = contenu.trim().split('\n')
  const entete = lignes[0]!.split(';')
  if (entete[1] !== 'libelle') {
    throw new Error(`Format inattendu pour ${chemin} : colonne « libelle » absente.`)
  }

  return lignes.slice(1).map((ligne) => {
    const [categorie, libelle, alias, kcal, unite, p1, g1, p2, g2] = ligne.split(';')
    const portions: LigneCuration['portions'] = []
    if (p1 && g1) portions.push({ libelle: p1, grammes: Number(g1), parDefaut: true })
    if (p2 && g2) portions.push({ libelle: p2, grammes: Number(g2), parDefaut: false })

    return {
      categorie: categorie ?? '',
      libelle: libelle ?? '',
      alias: (alias ?? '').split('|').map((a) => a.trim()).filter(Boolean),
      kcalIndicatif: Number(kcal),
      uniteBase: unite === 'ml' ? 'ml' : 'g',
      portions,
    }
  })
}

/** Étape 1 : le jeu CIQUAL complet. */
async function importerCiqual(): Promise<number> {
  const aliments = await chargerCiqual()

  const lignes = aliments.map((aliment) => ({
    id: Bun.randomUUIDv7(),
    userId: null,
    source: 'ciqual' as const,
    codeSource: aliment.code,
    libelle: aliment.libelle,
    libelleOrigine: aliment.libelle,
    libelleNormalise: normaliserLibelle(aliment.libelle),
    kcal100g: aliment.kcal100g,
    proteines100g: aliment.proteines100g,
    glucides100g: aliment.glucides100g,
    lipides100g: aliment.lipides100g,
    fibres100g: aliment.fibres100g,
    uniteBase: 'g' as const,
    referenceVersion: VERSION_CIQUAL,
  }))

  // Rejouable : on repart du libellé d'origine pour que l'étape de curation
  // puisse être relancée après correction du CSV.
  for (let debut = 0; debut < lignes.length; debut += 500) {
    await db
      .insert(foods)
      .values(lignes.slice(debut, debut + 500))
      .onConflictDoUpdate({
        target: [foods.source, foods.codeSource],
        set: {
          libelle: sql`excluded.libelle`,
          libelleOrigine: sql`excluded.libelle_origine`,
          libelleNormalise: sql`excluded.libelle_normalise`,
          kcal100g: sql`excluded.kcal_100g`,
          proteines100g: sql`excluded.proteines_100g`,
          glucides100g: sql`excluded.glucides_100g`,
          lipides100g: sql`excluded.lipides_100g`,
          fibres100g: sql`excluded.fibres_100g`,
          referenceVersion: sql`excluded.reference_version`,
          promu: false,
        },
      })
  }

  return lignes.length
}

export type RapportCuration = {
  appliques: number
  douteux: { libelle: string; candidat: string; kcalCsv: number; kcalCiqual: number }[]
  sansCandidat: string[]
}

/** Étape 2 : promotion et réécriture du sous-ensemble curé. */
async function appliquerCuration(curation: LigneCuration[]): Promise<RapportCuration> {
  const rapport: RapportCuration = { appliques: 0, douteux: [], sansCandidat: [] }

  await db.delete(foodAliases)
  await db.delete(foodPortions)

  /**
   * Un aliment CIQUAL ne peut être revendiqué que par une seule ligne curée.
   *
   * Sans cette réservation, « Pois cassés cuits » emportait
   * « Pois chiche, bouilli/cuit à l'eau » — proche par trigrammes et par
   * calories — et « Pois chiches cuits » se retrouvait ensuite sans candidat.
   * Taper « pois chiche » ne renvoyait alors aucun pois chiche.
   */
  const reserves = new Set<string>()

  for (const ligne of curation) {
    const recherche = normaliserLibelle(ligne.libelle)

    // `word_similarity` plutôt que `similarity` : la seconde pénalise les écarts
    // de longueur, et « kiwi » ne retrouvait pas « Kiwi, pulpe, crue ». La
    // première mesure la meilleure correspondance *dans* le libellé cible.
    const candidats = await db
      .select({
        id: foods.id,
        libelle: foods.libelle,
        kcal: foods.kcal100g,
        score: sql<number>`word_similarity(${recherche}, ${foods.libelleNormalise})`,
      })
      .from(foods)
      .where(
        sql`${foods.source} = 'ciqual' and word_similarity(${recherche}, ${foods.libelleNormalise}) > 0.5`,
      )
      .orderBy(sql`word_similarity(${recherche}, ${foods.libelleNormalise}) desc`)
      .limit(10)

    const disponibles = candidats.filter((c) => !reserves.has(c.id))
    if (disponibles.length === 0) {
      rapport.sansCandidat.push(ligne.libelle)
      continue
    }

    const proche = (c: (typeof disponibles)[number]) => {
      const ecart = Math.abs(c.kcal - ligne.kcalIndicatif)
      return (
        ecart <= ECART_KCAL_NEGLIGEABLE ||
        ecart / Math.max(ligne.kcalIndicatif, 1) <= ECART_KCAL_DOUTEUX
      )
    }

    // Les calories servent à **départager** : parmi les libellés proches, on
    // retient celui dont l'ordre de grandeur correspond. C'est ce qui distingue
    // « pois chiches secs » de « pois chiches cuits », d'un facteur 2,6.
    const candidat = disponibles.find(proche)

    if (!candidat) {
      const meilleur = disponibles[0]!
      rapport.douteux.push({
        libelle: ligne.libelle,
        candidat: meilleur.libelle,
        kcalCsv: ligne.kcalIndicatif,
        kcalCiqual: meilleur.kcal,
      })
      continue
    }

    // Le libellé réécrit remplace celui de CIQUAL ; l'original est conservé,
    // pour que l'aliment reste identifiable et vérifiable.
    await db
      .update(foods)
      .set({
        libelle: ligne.libelle,
        libelleNormalise: normaliserLibelle(ligne.libelle),
        uniteBase: ligne.uniteBase,
        promu: true,
      })
      .where(sql`${foods.id} = ${candidat.id}`)

    if (ligne.alias.length > 0) {
      await db
        .insert(foodAliases)
        .values(
          ligne.alias.map((alias) => ({
            foodId: candidat.id,
            aliasNormalise: normaliserLibelle(alias),
          })),
        )
        .onConflictDoNothing()
    }

    if (ligne.portions.length > 0) {
      await db.insert(foodPortions).values(
        ligne.portions.map((portion) => ({
          id: Bun.randomUUIDv7(),
          foodId: candidat.id,
          libelle: portion.libelle,
          grammes: portion.grammes,
          parDefaut: portion.parDefaut,
        })),
      )
    }

    reserves.add(candidat.id)
    rapport.appliques++
  }

  return rapport
}

export async function importerAliments(cheminCuration: string): Promise<void> {
  const total = await importerCiqual()
  console.log(`✓ ${total} aliments CIQUAL (version ${VERSION_CIQUAL})`)

  const contenu = await Bun.file(cheminCuration).text()
  const curation = lireCuration(cheminCuration, contenu)
  const rapport = await appliquerCuration(curation)

  console.log(`✓ ${rapport.appliques}/${curation.length} aliments curés promus`)

  if (rapport.douteux.length > 0) {
    console.log(`\n⚠️  ${rapport.douteux.length} rapprochements écartés (écart calorique) :`)
    for (const d of rapport.douteux) {
      console.log(
        `   « ${d.libelle} » (${d.kcalCsv} kcal) ↔ « ${d.candidat} » (${d.kcalCiqual} kcal)`,
      )
    }
  }

  if (rapport.sansCandidat.length > 0) {
    console.log(`\n⚠️  ${rapport.sansCandidat.length} sans candidat CIQUAL :`)
    console.log(`   ${rapport.sansCandidat.join(', ')}`)
  }
}

if (import.meta.main) {
  const chemin =
    process.argv[2] ??
    new URL('../../../../docs/data/aliments-premier-jet.csv', import.meta.url).pathname
  await importerAliments(chemin)
  process.exit(0)
}
