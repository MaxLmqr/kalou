/**
 * Normalisation des libellés pour la recherche. Doc 08 § 5.
 *
 * La même fonction sert à remplir `libelle_normalise` à l'import et à préparer
 * la requête de l'utilisateur : si les deux divergeaient, « pâtes » cesserait de
 * trouver « pates ».
 */
export function normaliserLibelle(texte: string): string {
  return texte
    .normalize('NFD')
    // Retire les diacritiques laissés par la décomposition NFD.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    // Tout ce qui n'est ni lettre ni chiffre devient une séparation : les
    // libellés CIQUAL sont pleins de virgules, parenthèses et apostrophes.
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
