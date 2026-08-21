import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { ItemEnvoye } from '@/lib/repas';

import { CLE_JOURNEE } from './use-journee';

export const CLE_ALIMENTS = ['foods'] as const;

/**
 * Recherche dans la base d'aliments (doc 06 § 7).
 *
 * **Le client ne trie pas.** Le classement — ce que j'ai déjà mangé, mes
 * aliments, le sous-ensemble curé, puis le reste de CIQUAL — est calculé par le
 * serveur (doc 08 § 5) parce qu'il dépend de l'historique de consommation, que
 * le client n'a pas. Reclasser ici, même « pour aider », ferait diverger les
 * deux règles.
 *
 * `keepPreviousData` garde les résultats précédents affichés pendant la frappe :
 * sans lui, la liste disparaît à chaque lettre et l'écran clignote.
 */
export function useRechercheAliments(terme: string, toutesVariantes = false) {
  return useQuery({
    queryKey: [...CLE_ALIMENTS, 'recherche', terme, toutesVariantes],
    queryFn: async () => {
      const { data, error } = await api.foods.get({
        query: { q: terme, toutes_variantes: toutesVariantes },
      });
      if (error) throw error;
      return data;
    },
    enabled: terme.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

export type ResultatAliment = NonNullable<
  ReturnType<typeof useRechercheAliments>['data']
>['resultats'][number];

async function chargerAliment(id: string) {
  const { data, error } = await api.foods({ id }).get();
  if (error) throw error;
  return data;
}

/**
 * Ce que l'API sert pour un aliment. Le composeur en attend une forme plus
 * étroite (`AlimentOuvrable` de `lib/repas`) : la compatibilité des deux est
 * vérifiée à l'appel, ce qui casse la compilation si le contrat bouge.
 */
export type AlimentDetail = Awaited<ReturnType<typeof chargerAliment>>;

/**
 * Charge un aliment et ses portions, au tap sur un résultat.
 *
 * Impératif plutôt que déclaratif : c'est un geste, pas un état d'écran. Passer
 * par le cache de React Query plutôt que par `fetch` garde le second tap sur le
 * même aliment instantané — corriger une quantité est fréquent.
 */
export function useChargerAliment() {
  const queryClient = useQueryClient();

  return (id: string) =>
    queryClient.fetchQuery({
      queryKey: [...CLE_ALIMENTS, id],
      queryFn: () => chargerAliment(id),
      staleTime: 5 * 60 * 1000,
    });
}

/**
 * Invalidations communes aux trois écritures.
 *
 * La journée, parce que les apports en dépendent. Et la base d'aliments, parce
 * qu'un repas enregistré change le classement de la recherche et la quantité
 * pré-remplie de chaque aliment consommé (doc 08 § 5 et § 6) : sans cette
 * seconde invalidation, la recherche continuerait d'afficher l'ordre d'avant, et
 * le sélecteur de quantité rouvrirait sur l'ancienne valeur.
 */
function useRafraichir() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: CLE_JOURNEE });
    queryClient.invalidateQueries({ queryKey: CLE_ALIMENTS });
  };
}

/**
 * Enregistre un repas.
 *
 * Un composant `reference` **n'envoie pas ses calories** : le serveur lit le
 * kcal/100 g de l'aliment, calcule, et le fige dans le composant (doc 06 § 5).
 * L'écran en affiche un aperçu pour que le total bouge en direct, mais la valeur
 * écrite est celle du serveur.
 */
export function useEnregistrerRepas() {
  const rafraichir = useRafraichir();

  return useMutation({
    mutationFn: async (champs: { items: ItemEnvoye[]; libelle?: string }) => {
      const { data, error } = await api['food-entries'].post(champs);
      if (error) throw error;
      return data;
    },
    onSuccess: rafraichir,
  });
}

/** Corrige un repas : la liste envoyée **remplace** la précédente (doc 06 § 5). */
export function useModifierRepas() {
  const rafraichir = useRafraichir();

  return useMutation({
    mutationFn: async ({ id, items }: { id: string; items: ItemEnvoye[] }) => {
      const { data, error } = await api['food-entries']({ id }).patch({ items });
      if (error) throw error;
      return data;
    },
    onSuccess: rafraichir,
  });
}

export function useSupprimerRepas() {
  const rafraichir = useRafraichir();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api['food-entries']({ id }).delete();
      if (error) throw error;
    },
    onSuccess: rafraichir,
  });
}
