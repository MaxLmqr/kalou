import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

import { CLE_JOURNEE } from './use-journee';

export const CLE_MOI = ['me'] as const;

/**
 * Profil, objectif et état d'onboarding — un seul appel (doc 06 § 3).
 *
 * Toutes les écritures de cette famille invalident cette clé plutôt que de
 * corriger le cache à la main : `PUT /me/goal` clôt l'objectif courant et en
 * crée un autre, avec des plafonds appliqués côté serveur. Recopier ce
 * raisonnement dans le client, c'est se garantir deux vérités divergentes.
 */
export function useMoi() {
  return useQuery({
    queryKey: CLE_MOI,
    queryFn: async () => {
      const { data, error } = await api.me.get();
      if (error) throw error;
      return data;
    },
  });
}

export type Moi = NonNullable<ReturnType<typeof useMoi>['data']>;

type ChampsProfil = {
  sexe?: 'homme' | 'femme';
  date_naissance?: string;
  taille_cm?: number;
};

export function useEnregistrerProfil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (champs: ChampsProfil) => {
      const { data, error } = await api.me.profile.patch(champs);
      if (error) throw error;
      return data;
    },
    // La morphologie entre dans le métabolisme de base : l'apport cible du jour
    // change avec elle, et l'accueil doit le relire plutôt que le déduire.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLE_MOI });
      queryClient.invalidateQueries({ queryKey: CLE_JOURNEE });
    },
  });
}

type ChampsObjectif = {
  rythme_kg_semaine: number;
  poids_cible_kg?: number;
};

export function useEnregistrerObjectif() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (champs: ChampsObjectif) => {
      const { data, error } = await api.me.goal.put(champs);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLE_MOI });
      queryClient.invalidateQueries({ queryKey: CLE_JOURNEE });
    },
  });
}
