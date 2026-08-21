import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';

import { CLE_JOURNEE } from './use-journee';
import { CLE_MOI } from './use-moi';

export const CLE_PESEES = ['weigh-ins'] as const;

/**
 * Série complète des pesées et de la tendance lissée (doc 06 § 10).
 *
 * Pas de fenêtre : sur une application personnelle, la série tient en quelques
 * centaines de points, et la tendance se calcule de toute façon sur l'histoire
 * entière côté serveur — la tronquer à la lecture ferait démarrer la courbe au
 * mauvais endroit.
 */
export function usePesees() {
  return useQuery({
    queryKey: CLE_PESEES,
    queryFn: async () => {
      const { data, error } = await api['weigh-ins'].get({ query: {} });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Enregistre une pesée. Une par journée locale : la dernière écrase.
 *
 * Invalide aussi `/me` : une première pesée débloque l'objectif, qui n'est pas
 * calculable sans tendance. Sans cette invalidation, l'écran d'objectif
 * continuerait de refuser alors que la condition est levée. Et la journée, dont
 * le socle et le plancher protéique sont calculés sur la tendance.
 */
export function useEnregistrerPesee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (poidsKg: number) => {
      const { data, error } = await api['weigh-ins'].post({ poids_kg: poidsKg });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLE_PESEES });
      queryClient.invalidateQueries({ queryKey: CLE_MOI });
      queryClient.invalidateQueries({ queryKey: CLE_JOURNEE });
    },
  });
}

/**
 * Variation de la **tendance** sur sept jours, en kg.
 *
 * C'est la seule variation que Kalou montre après une pesée (doc 03 § 1.5) :
 * l'écart avec la veille est du bruit, et le présenter comme un résultat serait
 * malhonnête. `null` tant que la série est trop courte pour dire quoi que ce soit.
 */
export function variationSurSeptJours(
  tendance: { local_date: string; tendance_kg: number }[],
): number | null {
  if (tendance.length < 2) return null;

  const dernier = tendance[tendance.length - 1]!;
  const cible = new Date(`${dernier.local_date}T12:00:00Z`);
  cible.setUTCDate(cible.getUTCDate() - 7);
  const cibleIso = cible.toISOString().slice(0, 10);

  // Le point exact peut manquer (jour sans pesée) : on prend le plus récent
  // qui le précède, faute de quoi une série trouée ne dirait jamais rien.
  const reference = [...tendance].reverse().find((point) => point.local_date <= cibleIso);
  if (!reference) return null;

  return dernier.tendance_kg - reference.tendance_kg;
}
