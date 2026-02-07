// HunterVehicle - Ennemis qui poursuivent le joueur
// Types 0,1,2,3 (serpent). perceptionRadius optionnel en 6e argument.
class HunterVehicle extends Vehicle {
  constructor(x, y, monsterType = 0, monsterImg = null, damage = 1, perceptionRadius = null) {
    super(x, y);
    this.monsterType = monsterType;
    this.monsterImg = monsterImg;
    this.damage = damage;
    this.evadeMode = false;
    this.evadeTime = 0;
    this.perceptionRadius = 200;

    if (monsterType === 0) {
      this.maxSpeed = 4.5;
      this.maxForce = 0.2;
      this.r = 18;
      this.perceptionRadius = perceptionRadius != null ? perceptionRadius : 300;
    } else if (monsterType === 1) {
      this.maxSpeed = 5;
      this.maxForce = 0.28;
      this.r = 22;
      this.perceptionRadius = perceptionRadius != null ? perceptionRadius : 200;
    } else if (monsterType === 2) {
      this.maxSpeed = 5.5;
      this.maxForce = 0.35;
      this.r = 26;
      this.perceptionRadius = perceptionRadius != null ? perceptionRadius : 130;
    } else {
      this.maxSpeed = 6;
      this.maxForce = 0.4;
      this.r = 28;
      this.perceptionRadius = perceptionRadius != null ? perceptionRadius : 20;
    }

    this.vel = p5.Vector.random2D();
    this.vel.setMag(this.maxSpeed * 0.3);
  }

  // Override applyBehaviors : combine toutes les forces de steering avec poids
  // Chaque comportement retourne une force ; on combine avec des poids
  applyBehaviors(world) {
    let force = createVector(0, 0);

    // 1. AVOID OBSTACLES (avoidObstacles() de Vehicle) — priorité élevée
    if (world.obstacles && world.obstacles.length > 0) {
      let avoidForce = this.avoidObstacles(world.obstacles);
      avoidForce.mult(4.0);
      force.add(avoidForce);
    }

    // 2. SEPARATE des autres hunters (separate() de Vehicle)
    if (world.hunters) {
      let separateForce = this.separate(world.hunters, 40);
      separateForce.mult(1.5);
      force.add(separateForce);
    }

    // 3. Comportement principal : PURSUE / EVADE / WANDER
    if (this.evadeMode) {
      // EVADE le joueur (evade() de Vehicle)
      if (world.player) {
        let evadeForce = this.evade(world.player);
        evadeForce.mult(2.0);
        force.add(evadeForce);
      }
      this.evadeTime--;
      if (this.evadeTime <= 0) {
        this.evadeMode = false;
      }
    } else {
      if (world.player) {
        let distToPlayer = p5.Vector.dist(this.pos, world.player.pos);
        if (distToPlayer < this.perceptionRadius) {
          // PURSUE le joueur (pursue() de Vehicle)
          let pursueForce = this.pursue(world.player);
          pursueForce.mult(1.5);
          force.add(pursueForce);
        } else {
          // WANDER si le joueur est hors de portée (wander() de Vehicle)
          let wanderForce = this.wander();
          wanderForce.mult(0.5);
          force.add(wanderForce);
        }
      } else {
        let wanderForce = this.wander();
        wanderForce.mult(0.5);
        force.add(wanderForce);
      }
    }

    // 4. BOUNDARIES : force de répulsion aux bords (boundaries() de Vehicle)
    let boundariesForce = this.boundaries();
    boundariesForce.mult(3.0);
    force.add(boundariesForce);

    this.applyForce(force);
  }

  activateEvade(duration = 300) {
    this.evadeMode = true;
    this.evadeTime = duration;
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    
    // Orienter dans la direction du mouvement (+90° pour que l'image vole correctement)
    if (this.vel.mag() > 0.01) {
      rotate(this.vel.heading() + HALF_PI);
    }
    
    // Afficher l'image du monstre
    if (this.monsterImg && this.monsterImg.width > 0) {
      imageMode(CENTER);
      let size = this.r * 2.5;
      image(this.monsterImg, 0, 0, size, size);
      imageMode(CORNER);
    } else {
      // Fallback : triangle coloré selon le type
      let colors = [[255, 100, 100], [255, 50, 50], [200, 0, 0]];
      let c = colors[this.monsterType] || colors[0];
      stroke(c[0], c[1], c[2]);
      fill(c[0], c[1], c[2]);
      strokeWeight(2);
      triangle(-this.r, -this.r / 2, -this.r, this.r / 2, this.r, 0);
    }
    
    // Cercle de perception en evade mode
    if (this.evadeMode) {
      noFill();
      stroke(255, 100, 100, 50);
      circle(0, 0, this.perceptionRadius * 2);
    }
    pop();
  }

  showDebug() {
    push();
    // Cercle de perception
    noFill();
    stroke(255, 0, 0, 60);
    strokeWeight(1);
    circle(this.pos.x, this.pos.y, this.perceptionRadius * 2);
    // Cercle de collision
    stroke(255, 0, 0, 100);
    circle(this.pos.x, this.pos.y, this.r * 2);
    // Vecteur vélocité
    stroke(255, 50, 50, 200);
    strokeWeight(2);
    let vel = this.vel.copy().mult(10);
    line(this.pos.x, this.pos.y, this.pos.x + vel.x, this.pos.y + vel.y);
    // Ligne vers le joueur (pursue target)
    if (world && world.player) {
      let d = p5.Vector.dist(this.pos, world.player.pos);
      if (d < this.perceptionRadius) {
        stroke(255, 0, 0, 80);
        strokeWeight(1);
        line(this.pos.x, this.pos.y, world.player.pos.x, world.player.pos.y);
      }
    }
    // Label type et dégâts
    fill(255);
    noStroke();
    textSize(10);
    textAlign(CENTER);
    text("T" + this.monsterType + " D" + this.damage, this.pos.x, this.pos.y - this.r - 5);
    pop();
  }
}
