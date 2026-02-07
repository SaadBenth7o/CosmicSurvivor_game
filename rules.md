# Règles du projet Cosmic Survivor

- **Règle 1 — Base :** Le fichier **`vehicle.js`** n'est **jamais modifié**. Il contient la classe `Vehicle` et toutes les méthodes de steering (seek, flee, arrive, pursue, evade, wander, avoidObstacles, separate, boundaries, edges).
- **Règle 2 — Sous-classes :** Toutes les entités sont des **sous-classes** dans `vehicles/` : `PlayerVehicle`, `HeartSegment`, `StarSegment`, `HunterVehicle`, `ObstacleVehicle`. Chacune surcharge `applyBehaviors(world)`, `show()`, `update()` si nécessaire.
- **Règle 3 — Forces composables :** Chaque comportement **retourne** un vecteur force. Dans `applyBehaviors(world)` : appeler les comportements, multiplier chaque force par un **poids**, sommer, puis appliquer une seule fois avec `applyForce()`. Les forces sont bornées par `maxForce` et `maxSpeed`.
- **Règle 4 — Cœurs :** 5 cœurs par défaut, 7 max. Barre de cœurs **centrée en haut**. Cœurs perdus affichés en **noir**. Méthode `addHeart()` dans `PlayerVehicle` pour les bonus.
- **Règle 5 — Étoiles à la suite :** Nombre d’étoiles = `starsCollected` (0 au départ, jusqu’à 100 au niveau 20). Sous-classe `StarSegment` dans `vehicles/`. Touche **Espace** alterne mode **snake** (chaîne arrive) / **banc** (arrive + separate + align + cohesion).
- **Règle 6 — Menu et difficulté :** 4 boutons (Normal, Facile, Moyen, Difficile), légende « Mode », description des monstres. Pas de bouton Valider : le mode est validé en cliquant **JOUER**.
- **Règle 7 — Architecture :** `sketch.js` = entrée principale (preload, setup, draw, UI, Particle, Collectable). États de jeu : `"menu"`, `"countdown"`, `"playing"`, `"gameover"`, `"levelup"`, `"victory"`. L’objet **`world`** (player, hunters, obstacles, checkpoints, allVehicles, debugMode, starsCollected) est passé à tous les `applyBehaviors(world)`.
- **Règle 8 — Sons :** Web Audio API ; son de dégâts **uniquement** quand le joueur n’est pas invulnérable.
- **Règle 9 — Scores :** Tableau des meilleurs scores avec une colonne **Mode**.
