/**
 * Données d'exemple.
 *
 * Les écrans encore non branchés sont alimentés d'ici. Un seul module, une seule
 * fois — quand l'API arrivera, c'est ce fichier qui disparaît, pas les écrans.
 * L'accueil, le profil, la pesée, les activités et les repas en sont déjà
 * sortis : ils lisent `/days/today`, `/me`, `/weigh-ins`, `/activities`,
 * `/foods` et `/food-entries`.
 *
 * **Aucun chiffre dérivable n'est écrit en dur.** Apport cible, besoin
 * journalier, reste, calories d'activité, dépense mesurée, plancher protéique,
 * dates d'atteinte : tout vient de `@kalou/api/domain`, c'est-à-dire du doc 02.
 * Les illustrations du doc 03 (un apport cible de 1 679 kcal avec 489 kcal de
 * course) ne satisfont pas le modèle du doc 02, qui fait foi ; les poser à la
 * main donnerait une interface qui ment dès qu'on touche à un paramètre.
 */
import {
  apportCible,
  bmr,
  deficitQuotidien,
  kcalNet,
  semainesJusquAuPoidsCible,
  socleFormule,
  type Sexe,
} from '@kalou/api/domain';

/** Le jour que les écrans donnent pour « aujourd'hui ». */
export const AUJOURD_HUI = new Date(2026, 7, 20);

export type Profil = {
  sexe: Sexe;
  dateNaissance: Date;
  tailleCm: number;
  /** Tendance lissée, pas la dernière pesée. */
  tendanceKg: number;
  poidsCibleKg: number;
  rythmeKgSemaine: number;
};

export const profil: Profil = {
  sexe: 'homme',
  dateNaissance: new Date(Date.UTC(1988, 2, 14)),
  tailleCm: 178,
  tendanceKg: 82.4,
  poidsCibleKg: 76,
  rythmeKgSemaine: 0.5,
};

export const AGE_ANS = 38;

const BMR = bmr({
  sexe: profil.sexe,
  poidsKg: profil.tendanceKg,
  tailleCm: profil.tailleCm,
  ageAns: AGE_ANS,
});

const SOCLE_FORMULE = socleFormule(BMR);
const DEFICIT = deficitQuotidien(profil.rythmeKgSemaine);

/** Détail du socle estimé, tel que l'affiche le dernier écran de l'onboarding. */
export const socleEstime = {
  bmrKcal: BMR,
  neatKcal: SOCLE_FORMULE - BMR,
  deficitKcal: DEFICIT,
  apportCibleKcal: apportCible({
    socleApplique: SOCLE_FORMULE,
    eatKcal: 0,
    deficitKcal: DEFICIT,
    w: 0,
  }),
  /**
   * Part de la digestion dans l'apport cible : le complément des trois autres
   * lignes, et non `0,10 × socle` — c'est la division par 0,90 du doc 02 § 3.2
   * qui la produit, donc elle porte aussi sur le déficit.
   */
  get tefKcal() {
    return this.apportCibleKcal - this.bmrKcal - this.neatKcal + this.deficitKcal;
  },
};

/** Les trois rythmes proposés à l'écran 4, avec leur date d'atteinte projetée. */
export const rythmes = [0.25, 0.5, 0.75].map((rythmeKgSemaine) => {
  const semaines = semainesJusquAuPoidsCible(
    profil.tendanceKg,
    profil.poidsCibleKg,
    rythmeKgSemaine,
  );
  return {
    rythmeKgSemaine,
    deficitKcal: deficitQuotidien(rythmeKgSemaine),
    atteintLe:
      semaines === null
        ? null
        : new Date(AUJOURD_HUI.getTime() + semaines * 7 * 24 * 60 * 60 * 1000),
    recommande: rythmeKgSemaine === 0.5,
  };
});

const COURSE_45_MIN = kcalNet({ met: 8.3, poidsKg: profil.tendanceKg, dureeMin: 45 });

/** Repas enregistrés et activités, classés par fréquence puis récence (doc 03 § 1). */
export const reutilisations = [
  { id: 'r1', titre: 'Café au lait', kcal: 120, type: 'repas' as const },
  { id: 'r2', titre: 'Tartines beurre', kcal: 310, type: 'repas' as const },
  { id: 'r3', titre: 'Course 45 min', kcal: -COURSE_45_MIN, type: 'activite' as const },
];

export const dernierePesee = {
  poidsKg: 82.1,
  tendanceKg: profil.tendanceKg,
  variationSemaineKg: -0.4,
};

/** Trente derniers jours : pesées brutes, tendance lissée, balance quotidienne. */
export const historique = (() => {
  const jours = 30;
  const weighIns: (number | null)[] = [];
  const trend: number[] = [];
  const balances: number[] = [];

  // Série déterministe : décroissance régulière, bruit de pesée, et deux jours
  // au-dessus de l'apport cible. Rien d'aléatoire, pour que l'écran soit le
  // même à chaque ouverture.
  for (let index = 0; index < jours; index++) {
    const tendance = 84.1 - (index / (jours - 1)) * (84.1 - profil.tendanceKg);
    trend.push(tendance);
    weighIns.push(index % 3 === 2 ? null : tendance + (index % 2 === 0 ? 0.35 : -0.3));
    balances.push(index === 3 || index === 21 ? 210 + index * 3 : -(380 + ((index * 37) % 320)));
  }

  const average = balances.map((_, index) => {
    const fenetre = balances.slice(Math.max(0, index - 6), index + 1);
    return fenetre.reduce((total, value) => total + value, 0) / fenetre.length;
  });

  return {
    weighIns,
    trend,
    balances,
    average,
    variationKg: trend[trend.length - 1] - trend[0],
    moyenneKcal: average[average.length - 1],
    /**
     * La ligne d'objectif est une **pente**, pas une cible ponctuelle
     * (docs/03 § 4) : on trace le rythme visé sur la fenêtre affichée, et non
     * la droite qui rejoint le poids souhaité — laquelle écraserait l'échelle
     * et rendrait la tendance illisible.
     */
    objectif: {
      from: trend[0],
      to: trend[0] - (profil.rythmeKgSemaine * jours) / 7,
    },
  };
})();

export const semaine = {
  apportsMoyens: 1786,
  depenseMoyenne: 2298,
  pertePreditKg: -0.52,
  perteObserveeKg: -0.68,
};
