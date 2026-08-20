/**
 * Smoke test du jalon 1, contre une API en cours d'exécution.
 *
 *   bun run parcours
 *
 * Déroule le parcours complet sur un compte jetable : connexion par code,
 * onboarding, budget du jour, saisie et suppression d'un repas. Le code à usage
 * unique est lu directement en base — c'est un script de développement, pas un
 * client.
 *
 * Ce n'est pas un remplaçant des tests unitaires du domaine : il vérifie le
 * câblage (routes, session, transactions, fuseau), pas les formules.
 */
const BASE = process.env.KALOU_API ?? 'http://localhost:3000'
const EMAIL = `parcours-${Date.now()}@kalou.test`

let cookie = ''
let echecs = 0

async function appel(methode: string, chemin: string, corps?: unknown) {
  const reponse = await fetch(`${BASE}${chemin}`, {
    method: methode,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  })
  const brut = await reponse.text()
  const entete = reponse.headers.get('set-cookie')
  if (entete) cookie = entete.split(';')[0]!
  let donnees: unknown = brut
  try {
    donnees = JSON.parse(brut)
  } catch {}
  return { statut: reponse.status, donnees: donnees as any }
}

function verifier(titre: string, attendu: number, obtenu: number, detail?: unknown) {
  const ok = attendu === obtenu
  if (!ok) echecs++
  console.log(`${ok ? '✓' : '✗'} ${titre} — attendu ${attendu}, obtenu ${obtenu}`)
  if (detail !== undefined) console.log('   ', JSON.stringify(detail))
}

async function codeEnBase(email: string): Promise<string> {
  const sql = new Bun.SQL(process.env.DATABASE_URL!)
  const [ligne] = await sql`
    select value from verifications
    where identifier = ${`sign-in-otp-${email}`}
    order by created_at desc limit 1
  `
  await sql.end()
  if (!ligne) throw new Error("Aucun code en base — l'API a-t-elle bien envoyé l'OTP ?")
  return String(ligne.value).split(':')[0]!
}

console.log(`Compte de test : ${EMAIL}\n`)

await appel('POST', '/auth/email-otp/send-verification-otp', { email: EMAIL, type: 'sign-in' })
const connexion = await appel('POST', '/auth/sign-in/email-otp', {
  email: EMAIL,
  otp: await codeEnBase(EMAIL),
})
verifier('connexion par code', 200, connexion.statut)

const avant = await appel('GET', '/me')
verifier('GET /me', 200, avant.statut, avant.donnees.onboarding)

const refus = await appel('GET', '/days/today')
verifier('journée refusée tant que le profil est incomplet', 422, refus.statut)

// Le profil de référence du doc 02 § 3.2 : homme, 35 ans, 85 kg, 178 cm.
const naissance = `${new Date().getUTCFullYear() - 35}-01-01`
verifier(
  'PATCH /me/profile',
  200,
  (await appel('PATCH', '/me/profile', {
    sexe: 'homme',
    date_naissance: naissance,
    taille_cm: 178,
    timezone: 'Europe/Paris',
  })).statut,
)

const pesee = await appel('POST', '/weigh-ins', { poids_kg: 85 })
verifier('POST /weigh-ins', 200, pesee.statut, { tendance_kg: pesee.donnees.tendance_kg })

const objectif = await appel('PUT', '/me/goal', { rythme_kg_semaine: 0.5, poids_cible_kg: 78 })
verifier('PUT /me/goal', 200, objectif.statut, {
  rythme: objectif.donnees.rythme_applique,
  budget: objectif.donnees.budget_estime,
})

const excessif = await appel('PUT', '/me/goal', { rythme_kg_semaine: 2 })
verifier('objectif excessif plafonné, jamais refusé', 200, excessif.statut, {
  plafonds: excessif.donnees.plafonds_appliques,
  rythme: excessif.donnees.rythme_applique,
})
await appel('PUT', '/me/goal', { rythme_kg_semaine: 0.5 })

const jour = await appel('GET', '/days/today')
verifier('GET /days/today', 200, jour.statut, {
  budget: jour.donnees.budget_kcal,
  depense: jour.donnees.depense_kcal,
  detail: jour.donnees.detail,
})

// Les chiffres du § 3.2 du doc 02, à l'arrondi près.
verifier('budget conforme au doc 02', 1679, jour.donnees.budget_kcal)
verifier('dépense conforme au doc 02', 2290, jour.donnees.depense_kcal)
verifier('socle conforme au doc 02', 2061, jour.donnees.detail.socle)

const repas = await appel('POST', '/food-entries', {
  items: [
    { type: 'libre', libelle: 'Poulet rôti', kcal: 420 },
    { type: 'libre', libelle: 'Riz basmati', kcal: 260 },
    { type: 'libre', libelle: 'Haricots verts', kcal: 45 },
  ],
})
verifier('POST /food-entries', 200, repas.statut, {
  libelle: repas.donnees.libelle,
  total: repas.donnees.kcal,
})
verifier('total = somme des composants', 725, repas.donnees.kcal)

const apres = await appel('GET', '/days/today')
verifier('les apports comptent dans le reste', 954, apres.donnees.restant_kcal)

verifier('DELETE /food-entries/:id', 204, (await appel('DELETE', `/food-entries/${repas.donnees.id}`)).statut)
const nettoye = await appel('GET', '/days/today')
verifier("la suppression retire l'entrée du total", 0, nettoye.donnees.apports_kcal)

cookie = ''
verifier('sans session, la journée est fermée', 401, (await appel('GET', '/days/today')).statut)

console.log(echecs === 0 ? '\nParcours complet ✓' : `\n${echecs} vérification(s) en échec`)
process.exit(echecs === 0 ? 0 : 1)
