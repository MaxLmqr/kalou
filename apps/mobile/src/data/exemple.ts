/**
 * Données d'exemple.
 *
 * Les écrans encore non branchés sont alimentés d'ici. Un seul module, une seule
 * fois — quand l'API arrivera, c'est ce fichier qui disparaît, pas les écrans.
 * L'accueil, le profil et la pesée en sont déjà sortis : ils lisent `/days/today`,
 * `/me` et `/weigh-ins`.
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
  calibrer,
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

/**
 * Calibration au bout de quatre semaines de suivi : `w = 1`, le socle mesuré
 * remplace la formule. Les entrées sont plausibles, la sortie est calculée.
 */
export const calibration = calibrer({
  joursAvecApportsDansFenetre: 13,
  nbPeseesDansFenetre: 12,
  tendanceDebutKg: 83.3,
  tendanceFinKg: profil.tendanceKg,
  apportsTotauxKcal: 28700,
  eatTotalKcal: 1400,
  joursValidesCumules: 28,
  socleFormuleKcal: SOCLE_FORMULE,
  bmrKcal: BMR,
  socleAppliquePrecedentKcal: null,
  joursDepuisDerniereCalibration: null,
});

export const calibrationDetail = {
  mesureeLe: new Date(2026, 7, 18),
  fenetreJours: 14,
  apportsTotauxKcal: 28700,
  joursComplets: 13,
  joursDansLaFenetre: 14,
  /**
   * Ce que devient l'apport cible, avant et après. C'est ce que l'écran
   * explique.
   */
  apportCibleAvantKcal: apportCible({
    socleApplique: SOCLE_FORMULE,
    eatKcal: 0,
    deficitKcal: DEFICIT,
    w: 0,
  }),
  apportCibleApresKcal: apportCible({
    socleApplique: calibration.socleAppliqueKcal,
    eatKcal: 0,
    deficitKcal: DEFICIT,
    w: calibration.w,
  }),
};

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

export type Composant = {
  id: string;
  libelle: string;
  /** « 88 g », « 2 c. à s. · 26 g ». Absent pour un composant libre. */
  quantite?: string;
  kcal: number;
  /** `libre` = libellé et calories saisis à la main (doc 08 § 3). */
  origine: 'reference' | 'libre';
  /** L'utilisateur a corrigé la ligne proposée par l'estimation. */
  corrige?: boolean;
};

/** Le repas photographié à 12:40, tel que l'estimation l'a pré-rempli. */
export const repasEstime = {
  titre: 'Repas de 12:40',
  estimation: true,
  composants: [
    { id: 'c1', libelle: 'Poulet grillé', quantite: 'env. 120 g', kcal: 198, origine: 'reference' },
    { id: 'c2', libelle: 'Salade verte', quantite: '80 g', kcal: 14, origine: 'reference', corrige: true },
    { id: 'c3', libelle: 'Croûtons', quantite: 'env. 25 g', kcal: 98, origine: 'reference' },
    { id: 'c4', libelle: 'Sauce César', quantite: '1 c. à s. · 15 g', kcal: 45, origine: 'reference' },
  ] satisfies Composant[],
};

/** Le même composeur, atteint par la recherche : l'exemple du doc 08 § 7. */
export const repasCompose = {
  titre: 'Composer un repas',
  estimation: false,
  composants: [
    { id: 'c1', libelle: 'Pois chiches cuits', quantite: '88 g', kcal: 122, origine: 'reference' },
    { id: 'c2', libelle: 'Pignons de pin', quantite: '2 c. à s. · 26 g', kcal: 175, origine: 'reference' },
    { id: 'c3', libelle: 'Vinaigrette maison', kcal: 90, origine: 'libre' },
  ] satisfies Composant[],
};

/** Résultats de recherche dans la base CIQUAL, pour « pois chi… ». */
export const alimentsTrouves = [
  {
    id: 'a1',
    libelle: 'Pois chiches cuits',
    kcalPour100g: 139,
    portion: '1 portion · 150 g · dernière quantité',
  },
  { id: 'a2', libelle: 'Houmous', kcalPour100g: 307 },
  { id: 'a3', libelle: 'Pois chiches secs', kcalPour100g: 364 },
];

/** Table MET du doc 02 § 7, triée par usage personnel puis alphabétique. */
export const activites = [
  { id: 'course-8', libelle: 'Course 8 km/h', met: 8.3 },
  { id: 'marche-rapide', libelle: 'Marche rapide (6 km/h)', met: 4.3 },
  { id: 'velo', libelle: 'Vélo tranquille (16 km/h)', met: 6 },
  { id: 'natation', libelle: 'Natation', met: 7 },
  { id: 'musculation', libelle: 'Musculation modérée', met: 3.5 },
  { id: 'yoga', libelle: 'Yoga', met: 2.5 },
];

/** Durées proposées avant le clavier, la dernière utilisée en premier choix. */
export const dureesProposees = [20, 30, 45, 60];
export const DUREE_PAR_DEFAUT_MIN = 45;

/** Calories nettes d'une séance, au poids de tendance du jour (doc 02 § 7). */
export function caloriesActivite(met: number, dureeMin: number): number {
  return kcalNet({ met, poidsKg: profil.tendanceKg, dureeMin });
}

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
