import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

import { estRefusDuClient, estSessionExpiree } from './api'
import { signOut } from './auth'

/**
 * Déconnexion en cours. Un écran lance rarement une seule requête : sans ce
 * verrou, chaque appel en vol déclencherait sa propre déconnexion.
 */
let deconnexion: Promise<void> | null = null

/**
 * Un 401 ferme la session locale.
 *
 * Le plugin Expo de Better Auth garde une copie de la session dans le
 * `SecureStore` et la rejoue au démarrage sans interroger le serveur : tant que
 * la date d'expiration du cookie n'est pas passée, `useSession` affirme qu'on
 * est connecté même si le compte a disparu côté serveur. La garde de session
 * laisse alors l'application dans les onglets, où chaque appel répond 401 —
 * l'écran annonce que le serveur est injoignable, ce qui est faux, et propose
 * un « Réessayer » qui ne peut rien réparer.
 *
 * `signOut` vide le cookie et le cache du plugin ; la garde renvoie sur la
 * connexion. La route `/sign-out` de Better Auth répond succès même sans
 * session valide : ce chemin reste donc praticable précisément quand il sert.
 */
function fermerLaSession(rejet: unknown): void {
  if (!estSessionExpiree(rejet)) return

  deconnexion ??= (async () => {
    try {
      await signOut()
    } finally {
      // Les données de l'ancien compte n'ont pas à survivre à sa session.
      queryClient.clear()
      deconnexion = null
    }
  })()
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Un refus du serveur ne se répare pas en réessayant : trois requêtes
      // pour le même 401 ne font que retarder le retour à la connexion, et
      // trois pour le même 422 retardent l'écran qui dit ce qui manque.
      retry: (echecs, rejet) => !estRefusDuClient(rejet) && echecs < 2,
    },
  },
  queryCache: new QueryCache({ onError: fermerLaSession }),
  mutationCache: new MutationCache({ onError: fermerLaSession }),
})
