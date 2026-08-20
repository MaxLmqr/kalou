-- Recherche d'aliments (doc 08 § 5).
--
-- `pg_trgm` fournit la similarité par trigrammes, qui tolère les fautes de
-- frappe et les libellés approximatifs ; `unaccent` sert au rapprochement des
-- libellés curés avec CIQUAL. La colonne `libelle_normalise` est déjà écrite
-- sans accents à l'insertion, donc la recherche courante n'a pas besoin
-- d'`unaccent` à la lecture.
--
-- Doit précéder l'index trigramme de la migration suivante.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
