/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Portées autorisées : une par workspace, plus quelques transverses.
    'scope-enum': [
      2,
      'always',
      ['api', 'mobile', 'db', 'config', 'deps', 'ci', 'docs', 'release'],
    ],
    // Les descriptions du projet sont en français : on n'impose pas une casse
    // particulière, seulement l'absence de majuscule initiale et de point final.
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
}
