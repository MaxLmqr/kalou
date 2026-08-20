import { db, foodAliases, foodPortions, foods, normaliserLibelle, userFoodUsages } from '@kalou/db'
import { and, asc, eq, sql } from 'drizzle-orm'
import { Elysia, t } from 'elysia'

import { erreur } from '../http/erreurs'
import { authMacro } from '../plugins/auth'

/** En deçà, un résultat est du bruit plutôt qu'une correspondance. */
const SEUIL_SIMILARITE = 0.3

export const foodRoutes = new Elysia()
  .use(authMacro)
  .get(
    '/foods',
    async ({ utilisateur, query }) => {
      const recherche = normaliserLibelle(query.q)
      if (recherche.length === 0) {
        return { resultats: [], plus_de_variantes: false }
      }

      const limite = query.limit ?? 20
      const toutesVariantes = query.toutes_variantes ?? false

      /**
       * Classement du doc 08 § 5, exprimé en un seul rang :
       *   1. déjà consommé par cet utilisateur (fréquence × récence)
       *   2. aliment personnel
       *   3. aliment promu (sous-ensemble curé)
       *   4. reste de CIQUAL — sur demande
       *
       * La similarité départage à l'intérieur de chaque rang. Un alias vaut une
       * correspondance sur le libellé : « houmous » doit trouver « pois chiches ».
       */
      const similarite = sql<number>`
        greatest(
          word_similarity(${recherche}, ${foods.libelleNormalise}),
          coalesce(
            (select max(word_similarity(${recherche}, ${foodAliases.aliasNormalise}))
               from ${foodAliases}
              where ${foodAliases.foodId} = ${foods.id}),
            0
          )
        )
      `

      const rang = sql<number>`
        case
          when ${userFoodUsages.usages} is not null then 0
          when ${foods.userId} is not null then 1
          when ${foods.promu} then 2
          else 3
        end
      `

      const resultats = await db
        .select({
          id: foods.id,
          libelle: foods.libelle,
          libelle_origine: foods.libelleOrigine,
          kcal_100g: foods.kcal100g,
          proteines_100g: foods.proteines100g,
          glucides_100g: foods.glucides100g,
          lipides_100g: foods.lipides100g,
          unite_base: foods.uniteBase,
          promu: foods.promu,
          personnel: sql<boolean>`${foods.userId} is not null`,
          deja_consomme: sql<boolean>`${userFoodUsages.usages} is not null`,
          rang,
          similarite,
        })
        .from(foods)
        .leftJoin(
          userFoodUsages,
          and(eq(userFoodUsages.foodId, foods.id), eq(userFoodUsages.userId, utilisateur.id)),
        )
        .where(
          sql`
            ${foods.actif}
            and (${foods.userId} is null or ${foods.userId} = ${utilisateur.id})
            and (${toutesVariantes} or ${foods.promu} or ${foods.userId} is not null
                 or ${userFoodUsages.usages} is not null)
            and ${similarite} >= ${SEUIL_SIMILARITE}
          `,
        )
        .orderBy(
          asc(rang),
          sql`${similarite} desc`,
          // À similarité égale, ce qui a été mangé le plus souvent et le plus
          // récemment passe devant.
          sql`coalesce(${userFoodUsages.usages}, 0) desc`,
          sql`${userFoodUsages.dernierUsageAt} desc nulls last`,
          asc(foods.libelle),
        )
        .limit(limite)

      // Compté à part pour pouvoir proposer « voir toutes les variantes » sans
      // un second appel qui reviendrait vide.
      let plusDeVariantes = false
      if (!toutesVariantes) {
        const [autres] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(foods)
          .where(
            sql`${foods.actif} and ${foods.userId} is null and not ${foods.promu}
                and ${similarite} >= ${SEUIL_SIMILARITE}`,
          )
        plusDeVariantes = (autres?.n ?? 0) > 0
      }

      return { resultats, plus_de_variantes: plusDeVariantes }
    },
    {
      auth: true,
      query: t.Object({
        q: t.String({ minLength: 1, maxLength: 80 }),
        limit: t.Optional(t.Integer({ minimum: 1, maximum: 50 })),
        toutes_variantes: t.Optional(t.Boolean()),
      }),
    },
  )
  .get(
    '/foods/:id',
    async ({ utilisateur, params, status }) => {
      const [aliment] = await db
        .select()
        .from(foods)
        .where(
          sql`${foods.id} = ${params.id} and ${foods.actif}
              and (${foods.userId} is null or ${foods.userId} = ${utilisateur.id})`,
        )

      if (!aliment) return status(404, erreur('aliment_introuvable', "Cet aliment n'existe pas."))

      const portions = await db
        .select({
          id: foodPortions.id,
          libelle: foodPortions.libelle,
          grammes: foodPortions.grammes,
          par_defaut: foodPortions.parDefaut,
        })
        .from(foodPortions)
        .where(eq(foodPortions.foodId, aliment.id))
        .orderBy(sql`${foodPortions.parDefaut} desc`, asc(foodPortions.libelle))

      return { ...aliment, portions }
    },
    { auth: true, params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  )
