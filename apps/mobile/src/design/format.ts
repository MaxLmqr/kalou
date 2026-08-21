/**
 * Règles typographiques des nombres (docs/03 § 8).
 *
 * Calories arrondies à l'unité, poids au dixième de kilo (100 g), séparateur
 * de milliers en espace insécable comme le veut l'usage français.
 *
 * **Insécable, et non insécable étroite.** L'usage typographique demande une
 * fine (U+202F), mais Geist ne la dessine pas : le glyphe manquant part alors
 * en repli sur une autre police, ce qui creuse un trou d'une largeur de cadratin
 * au milieu du chiffre unique — et fait perdre l'alignement tabulaire, qui est
 * la raison d'avoir choisi cette police pour les chiffres. Une insécable
 * ordinaire (0,25 cadratin) est plus large que la règle, mais elle est dessinée
 * par la bonne police.
 */

const NBSP = ' ';

function group(value: number): string {
  return Math.abs(value)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** `1204` → « 1 204 ». Le signe est omis : c'est la formulation qui le porte. */
export function formatKcal(value: number): string {
  return group(Math.round(value));
}

/** `-489` → « −489 » (vrai signe moins, pas un trait d'union). */
export function formatSignedKcal(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return '0';
  return `${rounded < 0 ? '−' : '+'}${group(rounded)}`;
}

/**
 * Reste du jour, formulé sans jugement (docs/03 § 2) :
 * 1204 → « 1 204 » / « calories restantes »
 * -340 → « 340 » / « calories au-dessus »
 */
export function formatRemaining(value: number): { value: string; label: string } {
  const rounded = Math.round(value);
  return rounded < 0
    ? { value: group(rounded), label: 'calories au-dessus' }
    : { value: group(rounded), label: 'calories restantes' };
}

/**
 * Protéines du jour face à leur plancher : « 42 / 135 g ».
 *
 * Le total devient une **borne inférieure** dès qu'un composant libre ne porte
 * pas de valeur protéique (docs/02 § 9) : on écrit alors « ≥ 42 / 135 g »
 * plutôt qu'un chiffre faussement précis. Sans aucune valeur, on n'invente pas
 * un zéro.
 */
export function formatProteines(
  totalG: number | null,
  plancherG: number,
  partiel: boolean,
): string {
  const total = totalG === null ? '—' : `${partiel ? '≥ ' : ''}${Math.round(totalG)}`;
  return `${total} / ${Math.round(plancherG)}${NBSP}g`;
}

/** `72.34` → « 72,3 kg ». */
export function formatWeight(kg: number, withUnit = true): string {
  const text = kg.toFixed(1).replace('.', ',');
  return withUnit ? `${text}${NBSP}kg` : text;
}

/** `-0.42` → « −0,4 kg ». */
export function formatWeightDelta(kg: number): string {
  const rounded = Math.round(kg * 10) / 10;
  if (rounded === 0) return `0${NBSP}kg`;
  const sign = rounded < 0 ? '−' : '+';
  return `${sign}${Math.abs(rounded).toFixed(1).replace('.', ',')}${NBSP}kg`;
}

/** `0.5` → « 0,5 kg par semaine ». */
export function formatRythme(kgSemaine: number): string {
  const texte = kgSemaine.toFixed(2).replace(/0$/, '').replace('.', ',');
  return `${texte}${NBSP}kg par semaine`;
}

/** `45` → « 45 min », `90` → « 1 h 30 ». */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}${NBSP}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}${NBSP}h` : `${h}${NBSP}h${NBSP}${m}`;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** `new Date()` → « Mercredi 20 août ». */
export function formatDayHeading(date: Date): string {
  const text = DATE_FORMATTER.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** `new Date()` → « 08:12 ». */
export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
