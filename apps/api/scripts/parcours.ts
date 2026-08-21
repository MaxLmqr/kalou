/**
 * Smoke test du jalon 1, contre une API en cours d'exécution.
 *
 *   bun run parcours
 *
 * Déroule le parcours complet sur un compte jetable : connexion par code,
 * onboarding, apport cible du jour, saisie et suppression d'un repas. Le code à
 * usage unique est lu directement en base — c'est un script de développement,
 * pas un client.
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

// Le poids figé d'une dépense est la tendance du jour : sans pesée, il n'existe
// pas, et inventer un poids par défaut produirait une dépense fausse en silence.
verifier(
  'une dépense sans pesée est refusée',
  422,
  (await appel('POST', '/activity-entries', { activity_code: 'yoga', duree_min: 30 })).statut,
)

const pesee = await appel('POST', '/weigh-ins', { poids_kg: 85 })
verifier('POST /weigh-ins', 200, pesee.statut, { tendance_kg: pesee.donnees.tendance_kg })

const objectif = await appel('PUT', '/me/goal', { rythme_kg_semaine: 0.5, poids_cible_kg: 78 })
verifier('PUT /me/goal', 200, objectif.statut, {
  rythme: objectif.donnees.rythme_applique,
  apport_cible: objectif.donnees.apport_cible_estime,
})

const excessif = await appel('PUT', '/me/goal', { rythme_kg_semaine: 2 })
verifier('objectif excessif plafonné, jamais refusé', 200, excessif.statut, {
  plafonds: excessif.donnees.plafonds_appliques,
  rythme: excessif.donnees.rythme_applique,
})
await appel('PUT', '/me/goal', { rythme_kg_semaine: 0.5 })

const jour = await appel('GET', '/days/today')
verifier('GET /days/today', 200, jour.statut, {
  apport_cible: jour.donnees.apport_cible_kcal,
  besoin_journalier: jour.donnees.besoin_journalier_kcal,
  detail: jour.donnees.detail,
  proteines: jour.donnees.proteines,
})

// Les chiffres du § 3.2 du doc 02, à l'arrondi près.
verifier('apport cible conforme au doc 02', 1679, jour.donnees.apport_cible_kcal)
verifier('besoin journalier conforme au doc 02', 2290, jour.donnees.besoin_journalier_kcal)
verifier('socle conforme au doc 02', 2061, jour.donnees.detail.socle)
// 1,6 × 85 kg = 136 g, arrondi à 5 g près (doc 02 § 9).
verifier('plancher protéique conforme au doc 02', 135, jour.donnees.proteines.plancher_g)

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
// Trois composants libres sans protéines : la somme est vide, et partielle.
verifier(
  'une entrée libre rend la somme protéique partielle',
  1,
  apres.donnees.proteines.partiel === true && apres.donnees.proteines.total_g === null ? 1 : 0,
)

verifier('DELETE /food-entries/:id', 204, (await appel('DELETE', `/food-entries/${repas.donnees.id}`)).statut)
const nettoye = await appel('GET', '/days/today')
verifier("la suppression retire l'entrée du total", 0, nettoye.donnees.apports_kcal)

// ── Base d'aliments et repas composé ────────────────────────────────────────
const recherche = await appel('GET', '/foods?q=pomme&limit=5')
verifier('GET /foods', 200, recherche.statut, {
  resultats: recherche.donnees.resultats?.length,
  premier: recherche.donnees.resultats?.[0]?.libelle,
  plus_de_variantes: recherche.donnees.plus_de_variantes,
})
verifier(
  'la recherche ne renvoie que le sous-ensemble curé par défaut',
  1,
  recherche.donnees.resultats.every((r: any) => r.promu || r.personnel || r.deja_consomme) ? 1 : 0,
)

// Le client envoie ce drapeau en chaîne (`?toutes_variantes=false`) : c'est la
// sérialisation d'Eden, et c'est à la validation d'Elysia de la ramener au
// booléen. Vérifié ici parce qu'un 422 sur ce paramètre ne se verrait qu'à la
// frappe, dans l'application.
const curees = await appel('GET', '/foods?q=pomme&limit=50&toutes_variantes=false')
const variantes = await appel('GET', '/foods?q=pomme&limit=50&toutes_variantes=true')
verifier('le drapeau de variantes accepte sa forme en chaîne', 200, variantes.statut, {
  curees: curees.donnees.resultats?.length,
  toutes: variantes.donnees.resultats?.length,
})
verifier(
  'toutes les variantes en renvoient davantage',
  1,
  variantes.donnees.resultats.length > curees.donnees.resultats.length ? 1 : 0,
)

const alimentId = recherche.donnees.resultats[0].id
const aliment = await appel('GET', `/foods/${alimentId}`)
verifier('GET /foods/:id', 200, aliment.statut, {
  libelle: aliment.donnees.libelle,
  portions: aliment.donnees.portions?.map((p: any) => `${p.libelle} = ${p.grammes} g`),
  dernier_usage: aliment.donnees.dernier_usage,
})
verifier("aucun usage avant la première consommation", 1, aliment.donnees.dernier_usage === null ? 1 : 0)

const portion = aliment.donnees.portions[0]
const compose = await appel('POST', '/food-entries', {
  items: [
    portion
      ? { type: 'reference', food_id: alimentId, quantite: 1, unite: 'portion', portion_id: portion.id }
      : { type: 'reference', food_id: alimentId, quantite: 150, unite: 'g' },
    { type: 'libre', libelle: 'Vinaigrette maison', kcal: 90 },
  ],
})
verifier('POST /food-entries avec un composant de la base', 200, compose.statut, {
  libelle: compose.donnees.libelle,
  total: compose.donnees.kcal,
  premier: compose.donnees.items?.[0],
})

const grammes = portion ? portion.grammes : 150
const attendu = Math.round(aliment.donnees.kcal_100g * (grammes / 100)) + 90
verifier('les calories du composant viennent du serveur', attendu, compose.donnees.kcal)
verifier(
  'le kcal/100 g utilisé est figé dans le composant',
  Number(aliment.donnees.kcal_100g),
  Number(compose.donnees.items[0].kcalRefUtilise),
)

const apresUsage = await appel('GET', `/foods/${alimentId}`)
verifier('la consommation est notée pour cet aliment', 1, apresUsage.donnees.dernier_usage?.usages)
verifier(
  'la dernière quantité est mémorisée pour le prochain repas',
  1,
  Number(apresUsage.donnees.dernier_usage?.derniere_quantite) === (portion ? 1 : 150) ? 1 : 0,
)

const corrige = await appel('PATCH', `/food-entries/${compose.donnees.id}`, {
  items: [{ type: 'reference', food_id: alimentId, quantite: 200, unite: 'g' }],
})
verifier('PATCH /food-entries/:id', 200, corrige.statut, {
  libelle: corrige.donnees.libelle,
  total: corrige.donnees.kcal,
  composants: corrige.donnees.items?.length,
})
verifier(
  'la correction remplace la liste et recalcule le total',
  Math.round(aliment.donnees.kcal_100g * 2),
  corrige.donnees.kcal,
)
verifier('une entrée manuelle corrigée reste manuelle', 1, corrige.donnees.etat === 'manuel' ? 1 : 0)

const apresCorrection = await appel('GET', `/foods/${alimentId}`)
verifier(
  'une correction ne compte pas une consommation de plus',
  1,
  apresCorrection.donnees.dernier_usage?.usages,
)

const rangee = await appel('GET', '/foods?q=pomme&limit=5')
verifier(
  'ce qui a été mangé remonte en tête de la recherche',
  1,
  rangee.donnees.resultats[0]?.deja_consomme === true ? 1 : 0,
)

verifier(
  'PATCH sur une entrée inconnue',
  404,
  (await appel('PATCH', '/food-entries/00000000-0000-7000-8000-000000000000', { libelle: 'x' })).statut,
)

await appel('DELETE', `/food-entries/${compose.donnees.id}`)

const referentiel = await appel('GET', '/activities')
verifier('GET /activities', 200, referentiel.statut, { activites: referentiel.donnees.length })

const inconnue = await appel('POST', '/activity-entries', {
  activity_code: 'saut_a_la_perche',
  duree_min: 30,
})
verifier('une activité hors référentiel est refusée', 404, inconnue.statut)

// L'exemple chiffré du doc 02 § 7, sur le profil de référence : course à
// 8 km/h (MET 8,3), 45 min, 85 kg → 489 kcal nettes.
const activite = await appel('POST', '/activity-entries', {
  activity_code: 'course_8kmh',
  duree_min: 45,
})
verifier('POST /activity-entries', 200, activite.statut, {
  met: activite.donnees.met,
  poids: activite.donnees.poidsUtiliseKg,
  kcal_net: activite.donnees.kcalNet,
})
verifier('dépense nette conforme au doc 02 § 7', 489, activite.donnees.kcalNet)
verifier('le MET est figé depuis le référentiel', 8.3, activite.donnees.met)
verifier('le poids figé est la tendance du jour', 85, activite.donnees.poidsUtiliseKg)

const avecEat = await appel('GET', '/days/today')
verifier("l'activité est comptée dans la journée", 489, avecEat.donnees.detail.eat_kcal)

/*
  Ce que l'activité rend n'est pas ce qu'elle a coûté : la correction de TEF
  s'applique à l'EAT comme au reste (doc 02 § 3.2), donc 489 kcal courues
  ajoutent 489 / 0,90 = 543 kcal au besoin et à l'apport cible. L'accueil
  affiche ce chiffre-là ; afficher la dépense nette donnait un « dont » qui ne
  tombait pas juste.
*/
verifier("ce que l'activité rend passe par la correction de TEF", 543, avecEat.donnees.detail.eat_ajout_kcal)
/*
  À une calorie près, et pas davantage : 489 / 0,90 vaut 543,33, et trois
  arrondis indépendants (le besoin sans sport, le besoin avec, le montant rendu)
  ne peuvent pas tomber tous les trois sur le même entier. L'écart est borné à 1,
  ce qui est le seul énoncé vrai — exiger l'égalité stricte serait un test qui
  passe par chance.
*/
const monteeDuBesoin = avecEat.donnees.besoin_journalier_kcal - jour.donnees.besoin_journalier_kcal
const monteeDeLaCible = avecEat.donnees.apport_cible_kcal - jour.donnees.apport_cible_kcal
verifier(
  "le besoin monte de ce que l'activité rend, à l'arrondi près",
  1,
  Math.abs(monteeDuBesoin - avecEat.donnees.detail.eat_ajout_kcal) <= 1 ? 1 : 0,
  { rendu: avecEat.donnees.detail.eat_ajout_kcal, montee: monteeDuBesoin },
)
verifier(
  "l'apport cible monte du même montant",
  1,
  Math.abs(monteeDeLaCible - avecEat.donnees.detail.eat_ajout_kcal) <= 1 ? 1 : 0,
  { rendu: avecEat.donnees.detail.eat_ajout_kcal, montee: monteeDeLaCible },
)
verifier(
  "l'activité apparaît dans le journal",
  1,
  avecEat.donnees.journal.filter((ligne: any) => ligne.genre === 'activite').length,
)

const corrigee = await appel('PATCH', `/activity-entries/${activite.donnees.id}`, { duree_min: 30 })
verifier('PATCH /activity-entries/:id', 200, corrigee.statut, { kcal_net: corrigee.donnees.kcalNet })
// 7,3 × 3,5 × 85 / 200 × 30 = 326 kcal.
verifier('la correction recalcule la dépense', 326, corrigee.donnees.kcalNet)

verifier(
  'DELETE /activity-entries/:id',
  204,
  (await appel('DELETE', `/activity-entries/${activite.donnees.id}`)).statut,
)
const sansEat = await appel('GET', '/days/today')
verifier("la suppression retire l'activité de l'EAT", 0, sansEat.donnees.detail.eat_kcal)

cookie = ''
verifier('sans session, la journée est fermée', 401, (await appel('GET', '/days/today')).statut)

console.log(echecs === 0 ? '\nParcours complet ✓' : `\n${echecs} vérification(s) en échec`)
process.exit(echecs === 0 ? 0 : 1)
