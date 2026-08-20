import { app } from './app'
import { env } from './env'

app.listen({ port: env.port, hostname: '0.0.0.0' })

console.log(`🦊 API sur http://localhost:${env.port} — docs sur /docs`)
