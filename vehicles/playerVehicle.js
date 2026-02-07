// HeartSegment - Un cœur qui suit le segment précédent (comportement snake/worm - Projet 3 Arrival)
// Extends Vehicle, utilise arrive() pour le suivi souple
class HeartSegment extends Vehicle {
  constructor(x, y, index) {
    super(x, y);
    this.maxSpeed = 9;
    this.maxForce = 0.8;
    this.r = 14;
    this.index = index;
    this.alive = true;      // true = full heart, false = dead heart
    this.targetPos = null;   // Position à suivre (segment précédent)
  }

  // Override applyBehaviors : chaque segment utilise arrive() vers le précédent
  // Pattern identique au projet 3-Arrival (snake : anneau.arrive(anneauPrecedent.pos))
  applyBehaviors(world) {
    if (this.targetPos) {
      let arriveForce = this.arrive(this.targetPos, 30);
      arriveForce.mult(2.5);
      this.applyForce(arriveForce);
    }
  }

  // Override update : appelle super.update() (vel += acc, pos += vel, acc = 0)
  update() {
    super.update();
  }

  // Override show : affiche l'image full_HEART ou DeadHeart
  show() {
    push();
    translate(this.pos.x, this.pos.y);
    imageMode(CENTER);
    let size = this.r * 2;
    if (this.alive) {
      image(imgFullHeart, 0, 0, size, size);
    } else {
      image(imgDeadHeart, 0, 0, size, size);
    }
    imageMode(CORNER);
    pop();
  }
}

// PlayerVehicle - Véhicule contrôlé par le joueur avec cœurs en chaîne derrière
// Extends Vehicle. Comportements : arrive (souris + étoiles), avoidObstacles, separate, boundaries
class PlayerVehicle extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.maxSpeed = 8;
    this.maxForce = 0.6;
    this.r = 20;
    this.color = "cyan";
    this.lives = 4;
    this.invulnerable = false;
    this.invulnerableTime = 0;
    this.hitCooldown = 120;

    // Créer les 4 cœurs derrière le joueur (chaîne souple style snake - Projet 3)
    this.hearts = [];
    for (let i = 0; i < 4; i++) {
      let heart = new HeartSegment(x - (i + 1) * 25, y, i);
      this.hearts.push(heart);
    }
  }

  // Override applyBehaviors : combine toutes les forces de steering avec poids
  // Chaque comportement retourne une force ; on combine avec des poids ; limité par maxForce/maxSpeed
  applyBehaviors(world) {
    let force = createVector(0, 0);

    // 1. ARRIVE vers la souris (utilise arrive() de Vehicle — ralentit quand proche)
    let mousePos = createVector(mouseX, mouseY);
    let arriveForce = this.arrive(mousePos, 50);
    arriveForce.mult(3.0); // Poids fort pour réactivité au contrôle souris
    force.add(arriveForce);

    // 2. ARRIVE vers l'étoile la plus proche (attraction légère)
    if (world.checkpoints && world.checkpoints.length > 0) {
      let nearestStar = null;
      let nearestDist = Infinity;
      for (let cp of world.checkpoints) {
        if (!cp.collected) {
          let d = p5.Vector.dist(this.pos, cp.pos);
          if (d < nearestDist && d < 100) {
            nearestDist = d;
            nearestStar = cp;
          }
        }
      }
      if (nearestStar) {
        let starForce = this.arrive(nearestStar.pos, 80);
        starForce.mult(0.15); // Poids faible pour ne pas gêner le contrôle
        force.add(starForce);
      }
    }

    // 3. AVOID OBSTACLES (utilise avoidObstacles() de Vehicle)
    if (world.obstacles && world.obstacles.length > 0) {
      let avoidForce = this.avoidObstacles(world.obstacles);
      avoidForce.mult(2.0);
      force.add(avoidForce);
    }

    // 4. SEPARATE des autres véhicules (utilise separate() de Vehicle)
    if (world.allVehicles) {
      let separateForce = this.separate(world.allVehicles, 60);
      separateForce.mult(1.5);
      force.add(separateForce);
    }

    // 5. BOUNDARIES : force de répulsion aux bords (utilise boundaries() de Vehicle)
    let boundariesForce = this.boundaries();
    boundariesForce.mult(3.0);
    force.add(boundariesForce);

    this.applyForce(force);
  }

  // Override update : met à jour la chaîne de cœurs + gestion invulnérabilité
  update() {
    super.update();

    // Mettre à jour les cœurs en chaîne (chacun suit le précédent avec arrive)
    for (let i = 0; i < this.hearts.length; i++) {
      let heart = this.hearts[i];
      if (i === 0) {
        // Le premier cœur suit l'arrière de la tête
        let behind = this.vel.copy();
        if (behind.mag() > 0.01) {
          behind.normalize();
          behind.mult(-this.r * 1.2);
        } else {
          behind = createVector(-this.r * 1.2, 0);
        }
        heart.targetPos = p5.Vector.add(this.pos, behind);
      } else {
        // Les cœurs suivants suivent le cœur précédent
        heart.targetPos = this.hearts[i - 1].pos;
      }
      heart.applyBehaviors(world);
      heart.update();
    }

    // Synchroniser l'état alive/dead des cœurs avec les vies
    for (let i = 0; i < this.hearts.length; i++) {
      this.hearts[i].alive = (i < this.lives);
    }

    // Gestion de l'invulnérabilité
    if (this.invulnerable) {
      this.invulnerableTime--;
      if (this.invulnerableTime <= 0) {
        this.invulnerable = false;
      }
    }
  }

  // Position de la tête (pointe avant du personnage)
  getHeadPos() {
    let headOffset = this.vel.copy();
    if (headOffset.mag() > 0.01) {
      headOffset.normalize();
      headOffset.mult(this.r);
    } else {
      headOffset = createVector(this.r, 0);
    }
    return p5.Vector.add(this.pos, headOffset);
  }

  takeDamage(amount = 1) {
    if (this.invulnerable) return false;
    this.lives = max(0, this.lives - amount);
    this.invulnerable = true;
    this.invulnerableTime = this.hitCooldown;
    return this.lives <= 0;
  }

  heal(amount = 1) {
    this.lives = min(this.lives + amount, 4);
  }

  activateShield(duration = 300) {
    this.invulnerable = true;
    this.invulnerableTime = duration;
  }

  // Override show : affiche l'image main_character + cœurs
  show() {
    // D'abord dessiner les cœurs (derrière le joueur)
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      this.hearts[i].show();
    }

    // Dessiner le joueur (la tête)
    push();
    translate(this.pos.x, this.pos.y);

    let alpha = 255;
    if (this.invulnerable) {
      alpha = (frameCount % 10 < 5) ? 150 : 255;
    }

    if (this.vel.mag() > 0.01) {
      rotate(this.vel.heading() + HALF_PI);
    }

    // Image du personnage principal
    imageMode(CENTER);
    if (this.invulnerable) tint(255, alpha);
    image(imgMainCharacter, 0, 0, this.r * 2.5, this.r * 2.5);
    if (this.invulnerable) noTint();
    imageMode(CORNER);

    // Cercle d'invulnérabilité / bouclier
    if (this.invulnerable) {
      noFill();
      stroke(255, 255, 0, alpha);
      strokeWeight(2);
      circle(0, 0, this.r * 2.5);
    }

    pop();
  }

  // Debug : visualisation des forces et zones
  showDebug() {
    push();
    noFill();
    stroke(0, 255, 255, 100);
    strokeWeight(1);
    circle(this.pos.x, this.pos.y, this.r * 2);
    // Point de la tête (zone de dégâts)
    let headPos = this.getHeadPos();
    fill(255, 0, 0);
    noStroke();
    circle(headPos.x, headPos.y, 8);
    stroke(255, 0, 0, 80);
    noFill();
    circle(headPos.x, headPos.y, this.r * 1.5);
    // Vecteur vélocité
    stroke(0, 255, 255, 200);
    strokeWeight(2);
    let v = this.vel.copy().mult(10);
    line(this.pos.x, this.pos.y, this.pos.x + v.x, this.pos.y + v.y);
    // Ligne vers la souris (arrive target)
    stroke(0, 255, 255, 60);
    strokeWeight(1);
    line(this.pos.x, this.pos.y, mouseX, mouseY);
    // Chaîne des cœurs (arrive chain)
    stroke(255, 0, 100, 80);
    for (let i = 0; i < this.hearts.length; i++) {
      let h = this.hearts[i];
      if (i === 0) {
        line(this.pos.x, this.pos.y, h.pos.x, h.pos.y);
      } else {
        line(this.hearts[i - 1].pos.x, this.hearts[i - 1].pos.y, h.pos.x, h.pos.y);
      }
      noFill();
      circle(h.pos.x, h.pos.y, h.r * 2);
    }
    pop();
  }
}
