import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

import { CLE_JOURNEE } from './use-journee';

export const CLE_ACTIVITES = ['activities'] as const;

/**
 * Référentiel MET (doc 06 § 9).
 *
 * Table de référence servie par l'API plutôt qu'embarquée dans l'application :
 * elle peut ainsi s'enrichir sans publier une version. Elle ne bouge pourtant
 * qu'aux migrations, d'où la fraîcheur d'une journée — le serveur pose de son
 * côté un `ETag` et un `cache-control` long, ce qui évite jusqu'au transfert.
 */
export function useActivites() {
  return useQuery({
    queryKey: CLE_ACTIVITES,
    queryFn: async () => {
      const { data, error } = await api.activities.get();
      if (error) throw error;
      return data;
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export type ActiviteMet = NonNullable<ReturnType<typeof useActivites>['data']>[number];

/**
 * Catégories du référentiel, dans l'ordre d'affichage.
 *
 * L'ordre n'est pas alphabétique : il va du plus dépensier au plus quotidien,
 * qui est aussi l'ordre dans lequel on cherche une séance. Le libellé vit ici
 * parce que le serveur renvoie un code (`cardio`), pas un titre de section.
 */
export const CATEGORIES = [
  { code: 'cardio', libelle: 'Cardio' },
  { code: 'force', libelle: 'Renforcement' },
  { code: 'souplesse', libelle: 'Souplesse' },
  { code: 'quotidien', libelle: 'Au quotidien' },
] as const;

/**
 * Enregistre une séance.
 *
 * Le client n'envoie que l'activité et la durée (doc 06 § 9) : le serveur
 * résout le MET, lit la tendance de poids du jour et **fige** les trois valeurs
 * dans l'enregistrement. C'est ce qui rend une séance de l'an dernier encore
 * vérifiable, et ce qui interdit de calculer les calories ici.
 *
 * L'invalidation porte sur la journée entière, et pas seulement sur le journal :
 * une séance déplace la dépense, donc le besoin, donc l'apport cible, donc le
 * reste. Quatre chiffres de l'accueil sur cinq changent.
 */
export function useEnregistrerActivite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (champs: { activity_code: string; duree_min: number }) => {
      const { data, error } = await api['activity-entries'].post(champs);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLE_JOURNEE });
    },
  });
}

/**
 * Corrige la durée d'une séance déjà enregistrée.
 *
 * Changer d'activité n'en fait pas partie : c'est saisir autre chose, et le
 * serveur ne l'accepte pas non plus (le MET appartient à l'entrée, pas à la
 * table, qui a pu bouger depuis).
 */
export function useModifierActivite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, duree_min }: { id: string; duree_min: number }) => {
      const { data, error } = await api['activity-entries']({ id }).patch({ duree_min });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLE_JOURNEE });
    },
  });
}

/** Suppression douce côté serveur : l'historique garde la trace, pas la journée. */
export function useSupprimerActivite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api['activity-entries']({ id }).delete();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLE_JOURNEE });
    },
  });
}
