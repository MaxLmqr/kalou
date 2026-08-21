import { useQuery } from '@tanstack/react-query';

import { api, erreurApi } from '@/lib/api';

export const CLE_JOURNEE = ['days', 'today'] as const;

/**
 * La journée en cours — le seul appel nécessaire au rendu de l'accueil
 * (doc 06 § 4) : chiffres du modèle, protéines et journal du jour.
 *
 * C'est `/days/today` et non `/days/:date` : l'heure de bascule et le fuseau
 * vivent côté serveur, et un téléphone en voyage n'a pas le bon jour local. Le
 * client ne calcule donc pas la date qu'il demande.
 */
export function useJournee() {
  return useQuery({
    queryKey: CLE_JOURNEE,
    queryFn: async () => {
      const { data, error } = await api.days.today.get();
      if (error) throw error;
      return data;
    },
  });
}

export type Journee = NonNullable<ReturnType<typeof useJournee>['data']>;
export type EntreeDuJournal = Journee['journal'][number];

/**
 * Ce qui manque à l'onboarding, lu sur le refus du serveur.
 *
 * `/days/today` répond 422 `profil_incomplet` tant qu'un apport cible n'est pas
 * calculable : c'est un état de l'application, pas une panne, et l'accueil doit
 * le distinguer d'un serveur injoignable. La liste vient du serveur — lui seul
 * sait ce que le modèle exige (doc 06 § 3).
 */
export function manqueALOnboarding(rejet: unknown): string[] | null {
  const erreur = erreurApi(rejet);
  if (erreur?.code !== 'profil_incomplet') return null;

  const manque = erreur.details?.manque;
  return Array.isArray(manque) ? manque.map(String) : [];
}
