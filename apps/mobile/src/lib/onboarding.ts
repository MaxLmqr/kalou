/**
 * Les codes de `manque` renvoyés par l'API (doc 06 § 3), traduits une seule
 * fois.
 *
 * Le serveur nomme ce qui empêche le calcul (`date_naissance`), pas ce qu'il
 * faut en dire ni où le corriger : les afficher tels quels ferait lire
 * « date_naissance » à l'utilisateur. La table vit ici parce que deux écrans
 * s'en servent — l'accueil, qui ne peut rien afficher tant qu'il manque quelque
 * chose, et le profil, qui l'annonce.
 */
const MANQUE = {
  sexe: { libelle: 'ton sexe biologique', route: '/profil-morphologie' },
  date_naissance: { libelle: 'ta date de naissance', route: '/profil-morphologie' },
  taille: { libelle: 'ta taille', route: '/profil-morphologie' },
  pesee: { libelle: 'une première pesée', route: '/weigh-in' },
  objectif: { libelle: 'un objectif de perte', route: '/profil-objectif' },
} as const satisfies Record<string, { libelle: string; route: string }>;

type CodeManque = keyof typeof MANQUE;

/** Là où l'on va renseigner la valeur absente. */
export type RouteManque = (typeof MANQUE)[CodeManque]['route'];

function connu(code: string): code is CodeManque {
  return code in MANQUE;
}

/** « a, b et c » — l'énumération française, pas une liste à puces. */
export function enumerer(elements: string[]): string {
  if (elements.length <= 1) return elements[0] ?? '';
  return `${elements.slice(0, -1).join(', ')} et ${elements[elements.length - 1]}`;
}

/** « ta taille et un objectif de perte ». Un code inconnu passe tel quel. */
export function libellesManque(codes: readonly string[]): string {
  return enumerer(codes.map((code) => (connu(code) ? MANQUE[code].libelle : code)));
}

/**
 * Où envoyer l'utilisateur pour débloquer le calcul.
 *
 * Le serveur liste ce qui manque dans l'ordre où le modèle en a besoin : on
 * ouvre donc le premier écran utile, sans demander de choisir. `null` si aucun
 * code n'est reconnu — on ne propose pas un chemin au hasard.
 */
export function premiereEtapeManquante(codes: readonly string[]): RouteManque | null {
  const code = codes.find(connu);
  return code ? MANQUE[code].route : null;
}
