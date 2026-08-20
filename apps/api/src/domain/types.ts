export type Sexe = 'homme' | 'femme'

/** Phase de l'apport cible, telle qu'exposée par l'API (doc 06 § 4). */
export type Phase = 'formule' | 'transition' | 'calibre'

export type StatutCalibration = 'applique' | 'gele' | 'insuffisant'

export type GardeFou =
  | 'vitesse_max'
  | 'borne_basse'
  | 'borne_haute'
  | 'sous_declaration'
  | 'plancher_apport'
