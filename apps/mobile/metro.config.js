// Metro doit connaître la racine du monorepo, sinon il ne résout ni les
// workspaces (@kalou/api) ni les dépendances hoistées à la racine.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// 1. Surveiller tout le monorepo (hot reload sur les packages partagés).
config.watchFolders = [workspaceRoot]

// 2. Chercher les modules dans l'app puis à la racine.
//    NB : on laisse `disableHierarchicalLookup` à sa valeur par défaut (false).
//    Le linker hoisté de Bun (voir bunfig.toml) garantit déjà une seule copie
//    de react / react-native ; le désactiver ferait échouer certaines résolutions.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

module.exports = config
