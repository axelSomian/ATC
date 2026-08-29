-- Reclassification des 5 niveaux (retour PO) : distinguer clairement l'amateur
-- qui pratique la compétition (« Compétiteur ») du joueur professionnel.
-- Ancien : Débutant·e / Initié·e / Intermédiaire / Avancé·e / Compétition
-- Nouveau : Débutant / Intermédiaire / Avancé / Compétiteur / Professionnel

UPDATE "Level" SET
  "nom"    = 'Débutant',
  "profil" = 'Découvre le tennis ou a très peu d''expérience. Apprend les gestes fondamentaux et les règles.',
  "jeu"    = 'A encore du mal à maintenir un échange. Commence à travailler le placement et le positionnement.'
WHERE "level" = 1;

UPDATE "Level" SET
  "nom"    = 'Intermédiaire',
  "profil" = 'Maîtrise les fondamentaux et peut jouer des échanges et des matchs simples.',
  "jeu"    = 'Sait servir et retourner, maintient un échange. Commence à développer placement et stratégie.'
WHERE "level" = 2;

UPDATE "Level" SET
  "nom"    = 'Avancé',
  "profil" = 'Bonne maîtrise technique et tactique. Joue des matchs complets en autonomie.',
  "jeu"    = 'Coups réguliers, déplacements maîtrisés, sait construire un point. Peut disputer des compétitions amateurs.'
WHERE "level" = 3;

UPDATE "Level" SET
  "nom"    = 'Compétiteur',
  "profil" = 'Joueur expérimenté, dans une logique de compétition et de performance. « Compétiteur » ne veut pas dire professionnel : un amateur peut jouer régulièrement en compétition.',
  "jeu"    = 'Solide techniquement, tactiquement et physiquement. Bonne expérience des matchs, adapte son jeu à l''adversaire.'
WHERE "level" = 4;

UPDATE "Level" SET
  "nom"    = 'Professionnel',
  "profil" = 'Meilleur palier de la communauté ATC. Niveau de jeu très élevé, souvent un parcours ou un classement de compétition.',
  "jeu"    = 'Excellente maîtrise dans tous les compartiments : régularité, puissance et lecture du jeu de très haut niveau.'
WHERE "level" = 5;
