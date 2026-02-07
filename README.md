# 11 - Cosmic Survivor

## Concept du jeu

**Cosmic Survivor** est un jeu de survie spatial en vue du dessus (top-down) developpe avec **p5.js**. Le joueur controle un personnage volant dans l'espace, collecte des etoiles pour progresser a travers **15 niveaux**, evite des monstres de plus en plus dangereux, et navigue a travers un champ d'obstacles mobiles.

Le jeu repose entierement sur les **comportements de steering de Craig Reynolds** : chaque entite (joueur, monstres, obstacles) utilise des forces de pilotage composables (seek, flee, arrive, pursue, evade, wander, separation, avoidObstacles, boundaries) pour se deplacer de maniere autonome et realiste.

---

## Comment jouer

| Controle | Action |
|----------|--------|
| **Souris** | Deplacer le personnage (le joueur suit la souris avec le comportement `arrive`) |
| **D** | Activer / desactiver le mode Debug (visualisation technique) |
| **P / Echap** | Mettre en pause et revenir au menu d'accueil |
| **Clic sur Jouer/Reprendre** | Lancer ou reprendre la partie (avec compte a rebours 3-2-1) |

---

## Fonctionnalites

- **Page d'accueil** : menu avec concept du jeu, controles, monstres (a gauche) et tableau des 5 meilleurs scores avec medailles or/argent/bronze (a droite).
- **Pause** : appuyez sur P ou Echap pour revenir au menu. Cliquez "Reprendre" pour un compte a rebours 3-2-1 avant de continuer.
- **Historique des scores** : les 5 meilleurs scores de la session sont affiches dans le menu avec medailles (or, argent, bronze pour le top 3).
- **Collecte d'etoiles** : 8 etoiles (checkpoints) sont reparties sur l'ecran. Elles reapparaissent 3 secondes apres avoir ete collectees.
- **Progression par niveaux** : toutes les 5 etoiles collectees, le joueur passe au niveau suivant. Un nouvel ennemi apparait a chaque niveau.
- **15 niveaux** avec une difficulte progressive (voir section Monstres).
- **4 coeurs de vie** affiches derriere le joueur sous forme de chaine souple (comportement snake/worm avec `arrive`).
- **Degats a la tete uniquement** : seul un contact avec la pointe avant du joueur cause des degats.
- **Invulnerabilite temporaire** apres chaque coup recu (clignotement).
- **Collectables aleatoires** : des coeurs (soin) et des boucliers (invulnerabilite) apparaissent periodiquement.
- **Obstacles mobiles** : des asteroides (images) se deplacent en errance (`wander`), evitent les autres obstacles et les etoiles, et traversent les bords de l'ecran (wrap-around).
- **Animation de Level Up** : pause de 2 secondes avec message clignotant "NIVEAU X".
- **Ecran de victoire** : au niveau 15, les monstres explosent en slow motion avec un message "BRAVO !".
- **Mode Debug** : visualisation des cercles de collision, rayons de perception, vecteurs de velocite, zone de boundaries, FPS, et connexions de la chaine de coeurs.

---

## Systeme de niveaux

| Niveaux | Monstre | Image | Degats | Vision (rayon) | Vitesse max | Force max |
|---------|---------|-------|--------|----------------|-------------|-----------|
| 1 - 5 | Monster 0 | `monster0.png` | 1 coeur | 300 px (grande) | 4.5 | 0.20 |
| 6 - 10 | Monster 1 | `monster1.png` | 2 coeurs | 200 px (moyenne) | 5.0 | 0.28 |
| 11 - 15 | Monster Max | `MonsterMax.png` | 3 coeurs | 130 px (petite) | 5.5 | 0.35 |

**Principe d'equilibre** : plus un monstre fait de degats, plus son rayon de vision est petit. Ainsi, le Monster Max est le plus letal mais doit s'approcher tres pres pour detecter le joueur.

### Comportement des monstres

- **Dans le rayon de vision** : le monstre utilise `pursue` pour anticiper la position future du joueur et l'intercepter.
- **Hors du rayon de vision** : le monstre erre aleatoirement avec `wander`.
- **Toujours** : chaque monstre utilise `avoidObstacles` (eviter les asteroides), `separate` (garder une distance avec les autres monstres), et `boundaries` (rester dans la zone de jeu).

---

## Partie technique

### Architecture

Le projet respecte strictement les consignes du cours :
- **`vehicle.js` n'est JAMAIS modifie**. Il definit la classe `Vehicle` de base avec toutes les methodes de steering.
- Toutes les entites sont des **sous-classes** qui etendent `Vehicle` et surchargent `applyBehaviors()`, `show()`, et `update()`.
- Les forces sont **composables** : chaque comportement retourne un vecteur force, multiplie par un poids, et l'ensemble est limite par `maxForce` / `maxSpeed`.

### Fichiers du projet

| Fichier | Role |
|---------|------|
| `vehicle.js` | Classe `Vehicle` de base (NON MODIFIEE) -- definit seek, flee, arrive, pursue, evade, wander, avoidObstacles, separate, boundaries |
| `vehicles/playerVehicle.js` | Classes `HeartSegment` et `PlayerVehicle` -- joueur + chaine de coeurs |
| `vehicles/hunterVehicle.js` | Classe `HunterVehicle` -- monstres ennemis (3 types) |
| `vehicles/obstacleVehicle.js` | Classe `ObstacleVehicle` -- asteroides mobiles |
| `checkpoint.js` | Classe `Checkpoint` -- etoiles collectables |
| `sketch.js` | Logique principale : gameloop, UI, etats du jeu, particules, classe `Collectable`, classe `Particle` |
| `index.html` | Page HTML (charge p5.js + tous les scripts) |
| `style.css` | Style plein ecran |

### Mapping des comportements par entite

| Entite | Comportements de steering utilises |
|--------|-----------------------------------|
| **PlayerVehicle** | `arrive` (souris), `arrive` (etoile proche), `avoidObstacles`, `separate`, `boundaries` |
| **HeartSegment** | `arrive` (suit le segment precedent -- pattern snake du Projet 3) |
| **HunterVehicle** | `pursue` (joueur en vue), `wander` (hors vue), `avoidObstacles`, `separate`, `boundaries` |
| **ObstacleVehicle** | `wander` (errance aleatoire), `separate` (entre obstacles), `flee` (eviter les etoiles) |

---

## Detail des comportements implementes

### 1. Arrive (PlayerVehicle, HeartSegment)

**Logique** : calcule un vecteur desire vers la cible. Si la distance est inferieure au rayon de ralentissement (`slowRadius`), la vitesse desiree est reduite proportionnellement a la distance. La force de steering est la difference entre la vitesse desiree et la vitesse actuelle, limitee par `maxForce`.

**Utilisation joueur** : le joueur suit la souris avec `arrive(mousePos, 50)` (poids 3.0). Quand il est proche de la souris, il ralentit naturellement au lieu de depasser et osciller.

**Utilisation coeurs** : chaque `HeartSegment` utilise `arrive(segmentPrecedent.pos, 30)` (poids 2.5) pour creer une chaine souple derriere le joueur. Le premier coeur suit l'arriere de la tete, les suivants suivent le coeur precedent. C'est le pattern "follow-the-leader" du Projet 3 (Arrival/Snake).

### 2. Seek / Flee (Vehicle base)

**Logique Seek** : calcule un vecteur desire de `this.pos` vers `target`, normalise a `maxSpeed`. La force est `desired - velocity`, limitee par `maxForce`. Toujours a pleine vitesse vers la cible.

**Logique Flee** : inverse de seek (`seek(target).mult(-1)`). Fuit la cible a pleine vitesse.

**Utilisation** : `ObstacleVehicle` utilise `flee` pour eviter les etoiles (checkpoints). Quand un obstacle s'approche d'une etoile non collectee a moins de `radius + 20px`, il applique une force de fuite (poids 2.0) pour ne pas la recouvrir.

### 3. Pursue (HunterVehicle)

**Logique** : calcule la position future de la cible en fonction de sa velocite et de la distance (`prediction = distance / maxSpeed`). Puis applique `seek` vers cette position future. Cela permet au monstre d'anticiper le mouvement du joueur au lieu de simplement le suivre.

**Utilisation** : le `HunterVehicle` utilise `pursue(player)` (poids 1.5) quand le joueur est dans son rayon de perception. Quand le joueur est hors de portee, le monstre passe en mode `wander`.

### 4. Wander (HunterVehicle, ObstacleVehicle)

**Logique** : projette un cercle de rayon `wanderRadius` (50) a une distance `distanceCercle` (150) devant le vehicule. Un angle aleatoire (`wanderTheta`) varie legerement a chaque frame (`+/- 0.3`). Le point cible est sur ce cercle, et `seek` est applique vers ce point. Cela produit un mouvement erratique mais fluide.

**Utilisation monstres** : quand le joueur est hors du rayon de perception, le monstre erre en utilisant `wander()` (poids 0.5). Cela simule une patrouille aleatoire naturelle.

**Utilisation obstacles** : les asteroides se deplacent en permanence avec `wander()` (poids 0.5). Chacun a sa propre direction initiale aleatoire et sa propre vitesse.

### 5. Avoid Obstacles (PlayerVehicle, HunterVehicle)

**Logique** : projette un point `aheadPos` a 30px devant le vehicule (dans la direction de la velocite). Verifie si ce point entre en collision avec un obstacle. Si oui, calcule un vecteur d'evitement (de l'obstacle vers le point ahead), normalise et amplifie a `maxForce * 3`.

**Utilisation** : le joueur applique `avoidObstacles(obstacles)` avec un poids de 2.0. Les monstres l'appliquent avec un poids de 4.0 (priorite elevee) pour ne jamais traverser les asteroides.

### 6. Separate (tous les vehicules)

**Logique** : pour chaque voisin dans un rayon de perception, calcule un vecteur de difference (`this.pos - other.pos`), normalise et divise par la distance (plus le voisin est proche, plus la force est grande). La somme est normalisee, mise a `maxSpeed`, puis la force de steering est calculee.

**Utilisation** :
- `PlayerVehicle` : separation des autres vehicules (rayon 60px, poids 1.5)
- `HunterVehicle` : separation des autres monstres (rayon 40px, poids 1.5)
- `ObstacleVehicle` : separation des autres obstacles (rayon `r * 2.5`, poids 1.8)

### 7. Boundaries (PlayerVehicle, HunterVehicle)

**Logique** : definit une marge de 50px autour de l'ecran. Quand le vehicule entre dans cette marge, un vecteur desire est calcule pour le repousser vers l'interieur. La force de steering est `desired - velocity`, limitee par `maxForce`. C'est une force de **repulsion** (pas un clamp dur).

**Utilisation** : le joueur et les monstres appliquent `boundaries()` avec un poids de 3.0. Les obstacles n'utilisent pas boundaries ; ils utilisent `wrapAround` (reapparition du cote oppose).

### 8. Wrap Around (ObstacleVehicle)

**Logique** : quand un obstacle sort de l'ecran (au-dela de `margin = radius + 20`), il reapparait du cote oppose. Cela cree un flux continu d'asteroides qui entrent et sortent de la zone de jeu.

---

## Mode Debug

Activez le mode debug (touche **D** ou bouton en haut a droite) pour visualiser :

- **Joueur** : cercle de collision (cyan), point de tete (rouge), vecteur velocite, ligne vers la souris, chaine des coeurs avec connexions
- **Monstres** : cercle de perception (rouge transparent), cercle de collision, vecteur velocite, ligne vers le joueur si en poursuite, label "T0 D1" (type et degats)
- **Obstacles** : cercle de collision (orange), vecteur velocite (vert), zone de separation
- **General** : rectangle jaune de boundaries (50px), FPS, compteurs d'entites

---

## Notes techniques

- Le code respecte strictement les **regles du cours** definies dans `rules.md`.
- `vehicle.js` n'est **jamais modifie**.
- Toutes les extensions passent par des sous-classes dans `vehicles/`.
- Chaque `applyBehaviors()` combine des forces de steering avec des poids puis applique la somme via `applyForce()`.
- Les images des entites sont chargees dans `preload()` (p5.js) pour garantir qu'elles sont disponibles avant `setup()`.
- Le fond d'espace est genere par code (200 etoiles aleatoires + scintillement) pour eviter les problemes CORS en mode `file://`.
