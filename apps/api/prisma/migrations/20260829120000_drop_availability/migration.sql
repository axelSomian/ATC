-- La fonctionnalité « disponibilités » (grille hebdo privée) est retirée :
-- elle n'était exposée à personne et n'alimentait ni l'annuaire ni le matchmaking.
-- Les annonces de match (DispoPost) restent le seul mécanisme de disponibilité.
DROP TABLE IF EXISTS "Availability";
