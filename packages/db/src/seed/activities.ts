import type { Activity } from '../schema/activite'

/**
 * Référentiel MET de départ. Doc 02 § 7.
 *
 * Valeurs issues du *Compendium of Physical Activities* (Ainsworth et al.),
 * arrondies. Une seule entrée par activité — pas de déclinaison par intensité
 * en v1, sauf pour la marche et la course où l'écart est trop grand pour être
 * ignoré.
 */
export const ACTIVITES: readonly Omit<Activity, 'actif'>[] = [
  { code: 'marche_4kmh', libelle: 'Marche tranquille (4 km/h)', met: 3.0, categorie: 'quotidien', icone: 'figure.walk' },
  { code: 'marche_6kmh', libelle: 'Marche rapide (6 km/h)', met: 4.3, categorie: 'quotidien', icone: 'figure.walk.motion' },
  { code: 'randonnee', libelle: 'Randonnée', met: 6.0, categorie: 'cardio', icone: 'figure.hiking' },
  { code: 'course_8kmh', libelle: 'Course 8 km/h', met: 8.3, categorie: 'cardio', icone: 'figure.run' },
  { code: 'course_10kmh', libelle: 'Course 10 km/h', met: 9.8, categorie: 'cardio', icone: 'figure.run' },
  { code: 'course_12kmh', libelle: 'Course 12 km/h', met: 11.5, categorie: 'cardio', icone: 'figure.run' },
  { code: 'velo_16kmh', libelle: 'Vélo tranquille (16 km/h)', met: 6.0, categorie: 'cardio', icone: 'bicycle' },
  { code: 'velo_25kmh', libelle: 'Vélo soutenu (25 km/h)', met: 10.0, categorie: 'cardio', icone: 'bicycle' },
  { code: 'natation', libelle: 'Natation', met: 7.0, categorie: 'cardio', icone: 'figure.pool.swim' },
  { code: 'rameur', libelle: 'Rameur', met: 7.0, categorie: 'cardio', icone: 'figure.rower' },
  { code: 'elliptique', libelle: 'Elliptique', met: 5.0, categorie: 'cardio', icone: 'figure.elliptical' },
  { code: 'corde_a_sauter', libelle: 'Corde à sauter', met: 11.0, categorie: 'cardio', icone: 'figure.jumprope' },
  { code: 'hiit', libelle: 'HIIT / circuit', met: 8.0, categorie: 'cardio', icone: 'figure.highintensity.intervaltraining' },
  { code: 'escaliers', libelle: 'Escaliers / stepper', met: 8.0, categorie: 'cardio', icone: 'figure.stair.stepper' },
  { code: 'football', libelle: 'Football', met: 7.0, categorie: 'cardio', icone: 'figure.soccer' },
  { code: 'tennis', libelle: 'Tennis', met: 7.3, categorie: 'cardio', icone: 'figure.tennis' },
  { code: 'danse', libelle: 'Danse', met: 5.0, categorie: 'cardio', icone: 'figure.dance' },
  { code: 'musculation_moderee', libelle: 'Musculation modérée', met: 3.5, categorie: 'force', icone: 'dumbbell' },
  { code: 'musculation_intense', libelle: 'Musculation intense', met: 6.0, categorie: 'force', icone: 'dumbbell.fill' },
  { code: 'yoga', libelle: 'Yoga', met: 2.5, categorie: 'souplesse', icone: 'figure.yoga' },
  { code: 'pilates', libelle: 'Pilates', met: 3.0, categorie: 'souplesse', icone: 'figure.pilates' },
  { code: 'menage_jardinage', libelle: 'Ménage, jardinage', met: 3.5, categorie: 'quotidien', icone: 'house' },
]
