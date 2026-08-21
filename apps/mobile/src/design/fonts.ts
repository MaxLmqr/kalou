import {
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';
import { useFonts } from 'expo-font';

import { fontFamily } from './tokens';

/**
 * Fichiers à charger, indexés par le nom de famille que `tokens.ts` annonce.
 *
 * Le `satisfies Record<...>` n'est pas décoratif : c'est lui qui garantit qu'une
 * graisse citée par l'échelle typographique a bien un fichier derrière elle.
 * Sans lui, une faute de frappe ne se verrait pas au type — elle se verrait à
 * l'écran, en police système, et seulement sur l'écran concerné.
 *
 * On ne charge **que** les graisses utilisées par `typography`. Chaque fichier
 * pèse sur le démarrage, et une graisse chargée « au cas où » n'a jamais de
 * raison d'être retirée ensuite.
 */
const FICHIERS = {
  [fontFamily.light]: Poppins_300Light,
  [fontFamily.regular]: Poppins_400Regular,
  [fontFamily.medium]: Poppins_500Medium,
  [fontFamily.semiBold]: Poppins_600SemiBold,
} satisfies Record<(typeof fontFamily)[keyof typeof fontFamily], unknown>;

/**
 * Charge les polices de l'application.
 *
 * Rend `true` quand l'interface peut être dessinée — polices prêtes **ou**
 * chargement en échec. L'échec ne bloque pas : la police système prend le
 * relais, ce qui donne une application moins jolie mais entièrement utilisable.
 * Attendre indéfiniment sur un fichier manquant donnerait, lui, un écran de
 * démarrage sans fin.
 */
export function usePolices(): boolean {
  const [chargees, erreur] = useFonts(FICHIERS);
  return chargees || erreur !== null;
}
