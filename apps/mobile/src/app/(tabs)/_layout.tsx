import AppTabs from '@/components/app-tabs';

/**
 * Onglet d'ouverture : l'accueil. C'est déjà le premier déclencheur déclaré dans
 * `AppTabs`, mais l'ancre le dit au routeur plutôt qu'à l'ordre des enfants —
 * réordonner la barre ne doit pas changer la page d'ouverture.
 */
export const unstable_settings = { anchor: 'index' };

/** Les trois destinations de consultation. Le détail est dans `AppTabs`. */
export default function TabsLayout() {
  return <AppTabs />;
}
