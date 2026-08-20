/**
 * Règles typographiques des nombres (docs/03 § 8).
 *
 * Calories arrondies à l'unité, poids au dixième de kilo (100 g), séparateur
 * de milliers en espace insécable étroite comme le veut l'usage français.
 */

const NARROW_NBSP = ' ';

function group(value: number): string {
  return Math.abs(value)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NBSP);
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

/** `72.34` → « 72,3 kg ». */
export function formatWeight(kg: number, withUnit = true): string {
  const text = kg.toFixed(1).replace('.', ',');
  return withUnit ? `${text}${NARROW_NBSP}kg` : text;
}

/** `-0.42` → « −0,4 kg ». */
export function formatWeightDelta(kg: number): string {
  const rounded = Math.round(kg * 10) / 10;
  if (rounded === 0) return `0${NARROW_NBSP}kg`;
  const sign = rounded < 0 ? '−' : '+';
  return `${sign}${Math.abs(rounded).toFixed(1).replace('.', ',')}${NARROW_NBSP}kg`;
}

/** `45` → « 45 min », `90` → « 1 h 30 ». */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}${NARROW_NBSP}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}${NARROW_NBSP}h` : `${h}${NARROW_NBSP}h${NARROW_NBSP}${m}`;
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
