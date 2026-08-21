import { QueryClientProvider } from '@tanstack/react-query';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { ThemeProvider, radius, themes, usePolices } from '@/design';
import { useSession } from '@/lib/auth';
import { queryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync();

/**
 * Ancre de la pile racine : les onglets, donc l'accueil.
 *
 * Sans elle, une URL ouvrant directement une modale — un lien profond, ou l'URL
 * que le client de développement rejoue au lancement — donne une pile d'un seul
 * écran : « Fermer » n'a alors rien à fermer, et l'écran devient une impasse.
 * L'ancre garantit que l'accueil est toujours dessous.
 */
export const unstable_settings = { anchor: '(tabs)' };

/**
 * Pile racine.
 *
 * La règle de navigation de Kalou tient en une phrase : **consulter est une
 * destination, saisir est une action**. Les trois destinations sont des onglets
 * (`(tabs)`) ; tout ce qui écrit une entrée se présente par-dessus — feuille
 * pour un geste court, plein écran pour le composeur. Rien de ce qui écrit
 * n'est un onglet, sans quoi on entrerait dans la saisie sans en ressortir.
 */
export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const policesPretes = usePolices();

  // La navigation react-navigation a son propre thème : on le dérive des mêmes
  // jetons pour qu'aucune couleur ne diverge entre les écrans et les barres.
  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    const colors = themes[scheme];
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        primary: colors.accent,
      },
    };
  }, [scheme]);

  const sheet = {
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    sheetCornerRadius: radius.xl,
  } as const;

  // Rien n'est dessiné avant que les polices soient là. L'écran de démarrage
  // reste donc visible, plutôt que de laisser voir un premier rendu en police
  // système suivi d'un saut typographique sur chaque écran.
  if (!policesPretes) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NavigationThemeProvider value={navigationTheme}>
          <StatusBar style="auto" />
          <GardeDeSession>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: themes[scheme].background },
            }}>
            <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(onboarding)" options={{ gestureEnabled: false }} />

            {/*
              Menu d'action rapide : la feuille s'arrête à sa propre hauteur.
              Quatre actions et trois vignettes n'ont aucune raison d'occuper
              l'écran entier — et laisser voir le chiffre du jour derrière
              rappelle ce qu'on est en train de modifier.
            */}
            <Stack.Screen
              name="quick-actions"
              options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }}
            />
            <Stack.Screen name="weigh-in" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
            {/*
              Ajouter une activité : plein écran, et non une feuille.

              C'est un parcours à deux temps — choisir l'activité, régler la
              durée — dont le premier se mène au clavier, sur une liste de
              vingt-deux entrées. Une feuille à détente n'a ni la hauteur pour
              la liste ni la place pour le clavier. Le sous-dossier `activity/`
              porte sa propre pile : le retour du second écran revient au choix,
              pas à l'accueil.
            */}
            <Stack.Screen name="activity" options={{ presentation: 'fullScreenModal' }} />

            {/*
              Le composeur est long et se remplit au clavier : plein écran.

              Il n'y a plus d'écran de recherche séparé — le champ vit dans le
              composeur, comme dans la maquette du doc 08 § 7. Chercher un
              aliment et voir le total monter sont le même geste.
            */}
            <Stack.Screen name="meal" options={{ presentation: 'fullScreenModal' }} />

            {/*
              Réglages du profil : un écran dédié par sujet, poussé sur la pile.

              Ces deux-là étaient des feuilles, et c'était une erreur de
              lecture de la règle : ils ne saisissent pas une entrée du jour,
              ils modifient un réglage durable. Le geste n'est pas court — un
              sexe, une date, une taille — et une feuille à détente promet une
              hauteur que le contenu ne remplit jamais. Poussés, ils ont leur
              en-tête, leur retour et toute la hauteur de l'écran.
            */}
            <Stack.Screen name="profil-morphologie" />
            <Stack.Screen name="profil-objectif" />

            <Stack.Screen name="design-system" />
          </Stack>
          </GardeDeSession>
        </NavigationThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * Garde de session, et page d'ouverture.
 *
 * Redirige vers la connexion tant qu'il n'y a pas de session, et en sort dès
 * qu'il y en a une. La règle vit ici plutôt que dans chaque écran : un oubli
 * n'exposerait pas seulement une donnée, il ferait planter le premier appel
 * authentifié de l'écran concerné.
 *
 * L'écran de démarrage reste affiché pendant la résolution — sans quoi on
 * verrait la connexion s'afficher puis disparaître à chaque lancement.
 *
 * **L'ouverture se fait sur l'accueil**, quelle que soit l'URL de lancement.
 * Un binaire lancé depuis l'écran d'accueil du téléphone démarre déjà sur `/`,
 * mais pas un client de développement : celui-ci rejoue la dernière URL
 * ouverte, et l'on se retrouve à démarrer sur un composeur de repas ou sur le
 * catalogue du design system. Aucun lien profond n'a de sens à honorer
 * aujourd'hui — il n'y a ni notification (docs/03 § 7) ni partage — donc la
 * règle est simple : au démarrage, on va à l'accueil. À rouvrir le jour où une
 * notification devra amener quelque part.
 */
function GardeDeSession({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const segments = useSegments();
  const router = useRouter();
  /** Faux dès que la première résolution de session a été traitée. */
  const auDemarrage = useRef(true);

  useEffect(() => {
    if (isPending) return;
    SplashScreen.hideAsync();

    const dansLaConnexion = segments[0] === '(auth)';
    const demarrage = auDemarrage.current;
    auDemarrage.current = false;

    if (!session) {
      if (!dansLaConnexion) router.replace('/connexion');
      return;
    }
    if (dansLaConnexion) {
      router.replace('/');
      return;
    }
    // L'accueil, et lui seul : `(tabs)` sans second segment (ou `index`). Un
    // démarrage sur l'historique ou sur le profil n'est pas plus voulu qu'un
    // démarrage au milieu d'une saisie.
    // Les routes typées le confirment : l'accueil est le groupe seul, sans second
    // segment — `(tabs)/history` et `(tabs)/profile` sont les deux seuls autres.
    const surLAccueil = segments.length === 1 && segments[0] === '(tabs)';
    if (demarrage && !surLAccueil) router.replace('/');
  }, [session, isPending, segments, router]);

  return children;
}
