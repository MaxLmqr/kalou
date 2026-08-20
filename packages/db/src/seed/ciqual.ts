/**
 * Import de la table CIQUAL de l'ANSES dans `foods`. Doc 08 § 4.
 *
 * Source : ANSES. Table de composition nutritionnelle des aliments Ciqual,
 * version 2020-07-07. Licence Ouverte / Etalab 2.0, qui impose la mention de la
 * paternité — d'où ce commentaire et la ligne du README.
 *
 * La version est **figée ici** et enregistrée dans `reference_version` : sans
 * cela, une mise à jour de l'ANSES modifierait silencieusement des valeurs déjà
 * utilisées dans l'historique (doc 08 § 4).
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const VERSION_CIQUAL = '2020-07-07'

const ARCHIVE_URL =
  'https://ciqual.anses.fr/cms/sites/default/files/inline-files/XML_2020_07_07.zip'

/** Codes des constituants retenus. La table complète en compte plus de soixante. */
const CONSTITUANTS = {
  kcal: 328, // Energie, Règlement UE N° 1169/2011 (kcal/100 g)
  proteines: 25000, // Protéines, N x facteur de Jones
  glucides: 31000,
  fibres: 34100,
  lipides: 40000,
} as const

export type AlimentCiqual = {
  code: string
  libelle: string
  kcal100g: number
  proteines100g: number | null
  glucides100g: number | null
  lipides100g: number | null
  fibres100g: number | null
}

/** Répertoire de cache, hors du dépôt : 3,4 Mo compressés, 96 Mo décompressés. */
function repertoireDeCache(): string {
  return join(dirname(new URL(import.meta.url).pathname), '..', '..', '.ciqual')
}

async function telechargerSiAbsent(): Promise<string> {
  const cache = repertoireDeCache()
  const archive = join(cache, `ciqual-${VERSION_CIQUAL}.zip`)

  if (await Bun.file(archive).exists()) return archive

  await mkdir(cache, { recursive: true })
  console.log(`Téléchargement de la table CIQUAL ${VERSION_CIQUAL}…`)
  const reponse = await fetch(ARCHIVE_URL)
  if (!reponse.ok) {
    throw new Error(`Téléchargement CIQUAL impossible : ${reponse.status} ${reponse.statusText}`)
  }
  await Bun.write(archive, reponse)
  return archive
}

/** Le jeu est publié en windows-1252, pas en UTF-8. */
function decoder(donnees: Uint8Array): string {
  return new TextDecoder('windows-1252').decode(donnees)
}

async function lireFichierDeLArchive(archive: string, nom: string): Promise<string> {
  const cache = dirname(archive)
  const extrait = join(cache, nom)

  if (!(await Bun.file(extrait).exists())) {
    const decompression = Bun.spawn(['unzip', '-o', '-q', archive, nom, '-d', cache], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    if ((await decompression.exited) !== 0) {
      throw new Error(`Décompression impossible de ${nom}`)
    }
  }

  return decoder(await Bun.file(extrait).bytes())
}

function champ(bloc: string, nom: string): string | null {
  const trouve = bloc.match(new RegExp(`<${nom}>([^<]*)</${nom}>`))
  return trouve ? trouve[1]!.trim() : null
}

/**
 * Les teneurs CIQUAL ne sont pas toutes des nombres : « traces », « - » et
 * « < 0,5 » y côtoient les valeurs mesurées. La virgule décimale est française.
 */
function teneur(brut: string | null): number | null {
  if (!brut) return null
  const nettoye = brut.replace(',', '.').replace('<', '').trim()
  if (nettoye === '' || nettoye === '-' || nettoye.startsWith('traces')) return null
  const valeur = Number(nettoye)
  return Number.isFinite(valeur) ? valeur : null
}

export async function chargerCiqual(): Promise<AlimentCiqual[]> {
  const archive = await telechargerSiAbsent()

  const alimXml = await lireFichierDeLArchive(archive, `alim_${VERSION_CIQUAL.replace(/-/g, '_')}.xml`)
  const compoXml = await lireFichierDeLArchive(
    archive,
    `compo_${VERSION_CIQUAL.replace(/-/g, '_')}.xml`,
  )

  const libelles = new Map<string, string>()
  for (const bloc of alimXml.split('<ALIM>').slice(1)) {
    const code = champ(bloc, 'alim_code')
    const nom = champ(bloc, 'alim_nom_fr')
    if (code && nom) libelles.set(code, nom)
  }

  const codesRetenus = new Set(Object.values(CONSTITUANTS).map(String))
  const compositions = new Map<string, Map<number, number | null>>()

  for (const bloc of compoXml.split('<COMPO>').slice(1)) {
    const constCode = champ(bloc, 'const_code')
    if (!constCode || !codesRetenus.has(constCode)) continue

    const alimCode = champ(bloc, 'alim_code')
    if (!alimCode) continue

    if (!compositions.has(alimCode)) compositions.set(alimCode, new Map())
    compositions.get(alimCode)!.set(Number(constCode), teneur(champ(bloc, 'teneur')))
  }

  const aliments: AlimentCiqual[] = []
  for (const [code, libelle] of libelles) {
    const valeurs = compositions.get(code)
    const kcal = valeurs?.get(CONSTITUANTS.kcal)
    // Un aliment sans énergie mesurée n'est pas utilisable pour un budget
    // calorique : on l'écarte plutôt que de le compter pour zéro.
    if (kcal === undefined || kcal === null) continue

    aliments.push({
      code,
      libelle,
      kcal100g: kcal,
      proteines100g: valeurs?.get(CONSTITUANTS.proteines) ?? null,
      glucides100g: valeurs?.get(CONSTITUANTS.glucides) ?? null,
      lipides100g: valeurs?.get(CONSTITUANTS.lipides) ?? null,
      fibres100g: valeurs?.get(CONSTITUANTS.fibres) ?? null,
    })
  }

  return aliments
}
