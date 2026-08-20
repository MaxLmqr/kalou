# Kalou

Monorepo Turborepo : application mobile Expo + backend Elysia, en TypeScript de bout en bout.

## Stack

| Brique | Choix |
|---|---|
| Runtime & package manager | Bun 1.4 (workspaces) |
| Orchestrateur | Turborepo 2.10 |
| Backend | Elysia 1.4 (`apps/api`) |
| Mobile | Expo SDK 57 / React Native 0.86 / expo-router (`apps/mobile`) |
| Base de données | PostgreSQL + Drizzle ORM (`packages/db`) |
| Typage client↔serveur | Eden Treaty (`@elysiajs/eden`) |
| Cache de données mobile | TanStack Query |
| TypeScript | 6.0.3 (version épinglée par le SDK Expo 57) |

## Arborescence

```
kalou/
├── apps/
│   ├── api/          Serveur Elysia (Bun) — expose le type `App`
│   └── mobile/       Application Expo
├── packages/
│   ├── db/           Schéma Drizzle, client Postgres, migrations
│   └── typescript-config/  Configs tsconfig partagées
├── turbo.json
└── bunfig.toml       linker hoisté (requis par Metro)
```

## Typage de bout en bout

`apps/api` exporte le type de son application ; `apps/mobile` le consomme via Eden Treaty.
Aucun codegen, aucune duplication de types :

```ts
// apps/api/src/app.ts
export type App = typeof app

// apps/mobile/src/lib/api.ts
import type { App } from '@kalou/api'
export const api = treaty<App>(baseUrl)
```

Renommer un champ d'une route casse la compilation du mobile. L'import étant
`import type`, aucun code serveur n'entre dans le bundle React Native.

La chaîne complète est : **schéma Drizzle → `drizzle-typebox` → validation Elysia →
OpenAPI + types Eden**. Le schéma de la base est la source unique de vérité.

## Démarrage

Prérequis : [Bun](https://bun.sh) ≥ 1.4 et Docker.

```bash
bun install
cp .env.example .env          # les valeurs par défaut visent le conteneur
docker compose up -d          # PostgreSQL 18 sur 127.0.0.1:5432
bun run db:migrate            # appliquer les migrations
bun run db:seed               # activités MET et aliments CIQUAL
```

Repartir d'une base propre à tout moment :

```bash
bun run db:reset              # vide, migre et réinjecte — environ 3 secondes
```

Elle coupe d'abord les connexions du serveur de développement, sans quoi
`drop schema` attend un verrou qu'il n'obtient jamais, et refuse de s'exécuter
ailleurs que sur une base locale.

Le jeu CIQUAL (3,4 Mo) est téléchargé au premier passage puis mis en cache dans
`packages/db/.ciqual/`, hors du dépôt.

La base tourne dans le conteneur `kalou-postgres` décrit par `docker-compose.yml`
(volume nommé `pgdata`, port lié à la boucle locale uniquement). `docker compose
down` l'arrête sans perdre les données ; `docker compose down -v` supprime aussi
le volume.

Lancer les deux applications :

```bash
bun run dev                   # api + mobile
bun run dev:api               # http://localhost:3000 — docs sur /docs
bun run dev:mobile            # serveur Expo
```

## Scripts

| Commande | Effet |
|---|---|
| `bun run dev` | Démarre toutes les apps |
| `bun run build` | Build de tous les packages |
| `bun run typecheck` | `tsc --noEmit` sur tout le monorepo |
| `bun run lint` | Lint |
| `bun run db:generate` | Génère une migration à partir du schéma Drizzle |
| `bun run db:migrate` | Applique les migrations |
| `bun run db:seed` | Réinjecte les données de référence (activités MET, aliments CIQUAL) |
| `bun run db:reset` | **Vide la base**, rejoue les migrations et réinjecte les données de référence |
| `bun run db:studio` | Ouvre Drizzle Studio |
| `docker compose up -d` | Démarre PostgreSQL 18 |
| `docker compose down` | L'arrête, en conservant le volume |

## Notes d'implémentation

- **`@sinclair/typebox` est épinglé en `^0.34.52` dans `apps/api`.** Elysia le déclare
  en peer dependency, mais la chaîne de dépendances d'Expo (jest) remonte une 0.27
  qui shadowe la bonne version et casse le typage des schémas.
- **`pg` est une devDependency de `packages/db`** : `drizzle-kit` ne sait pas se
  connecter via `Bun.sql`. Le runtime de l'API, lui, utilise `drizzle-orm/bun-sql`
  et n'embarque aucun driver Node.
- **`apps/mobile/expo-env.d.ts` est versionné** (le template Expo l'ignore par défaut)
  pour que `bun run typecheck` fonctionne sur un clone frais et en CI.
- **`metro.config.js`** déclare la racine du monorepo. `disableHierarchicalLookup`
  est volontairement laissé à `false` : utile avec pnpm, nuisible avec le linker
  hoisté de Bun.
- L'URL de l'API en dev est déduite de l'IP LAN du serveur Expo
  (`Constants.expoConfig.hostUri`), pour que l'app fonctionne sur un téléphone
  physique sans configuration. Surcharge possible via `EXPO_PUBLIC_API_URL`.

## Convention de commit

Le projet suit [Conventional Commits](https://www.conventionalcommits.org/).
La règle est vérifiée automatiquement par un hook `commit-msg` (commitlint) ;
`bun install` active le hook via `git config core.hooksPath .githooks`.

```
<type>(<portée>): <description>
```

| Élément | Valeurs |
|---|---|
| Types | `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `build`, `ci`, `style`, `revert` |
| Portées | `api`, `mobile`, `db`, `config`, `deps`, `ci`, `docs`, `release` (facultatif) |
| Description | en français, sans majuscule initiale ni point final, 72 caractères max |

```
feat(mobile): ajouter l'écran de saisie de repas
fix(api): corriger le calcul du budget calorique restant
chore(deps): passer Expo en SDK 57
```

Un changement cassant se signale par un `!` (`feat(api)!: ...`) ou une section
`BREAKING CHANGE:` dans le corps du message.

## Reste à faire

- Authentification (Better Auth s'intègre à Elysia et gère le cas mobile).
- Déploiement de l'API (`apps/api/Dockerfile` est prêt, image `oven/bun`).
