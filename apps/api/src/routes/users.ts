import { db, users } from '@kalou/db'
import { eq } from 'drizzle-orm'
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox'
import { Elysia, t } from 'elysia'

// Le schéma Drizzle est la source unique de vérité :
// table -> validation -> OpenAPI -> types Eden côté mobile.
const insertUser = createInsertSchema(users, {
  email: t.String({ format: 'email' }),
  // La colonne est nullable : le refinement doit conserver l'optionalité,
  // sinon drizzle-typebox rend le champ obligatoire.
  displayName: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
})

const userModel = {
  'user.create': t.Omit(insertUser, ['id', 'createdAt', 'updatedAt']),
  'user.public': createSelectSchema(users),
} as const

export const usersRoutes = new Elysia({ prefix: '/users' })
  .model(userModel)
  .get('/', () => db.select().from(users), {
    response: t.Array(userModel['user.public']),
  })
  .get(
    '/:id',
    async ({ params, status }) => {
      const [user] = await db.select().from(users).where(eq(users.id, params.id))
      return user ?? status(404, { message: 'Utilisateur introuvable' })
    },
    { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  )
  .post(
    '/',
    async ({ body }) => {
      const [user] = await db.insert(users).values(body).returning()
      return user
    },
    { body: 'user.create' },
  )
