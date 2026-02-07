// Cœurs : affichés uniquement en barre en haut (sketch.js), pas de chaîne qui suit le joueur.
// HeartSegment - Conservé pour règles (sous-classe Vehicle) ; non utilisé en chaîne.
class HeartSegment extends Vehicle {
  constructor(x, y, index) {
    super(x, y);
    this.maxSpeed = 9;
    this.maxForce = 0.8;
    this.r = 14;
    this.index = index;
    this.alive = true;
    this.targetPos = null;
  }
  applyBehaviors(world) {
    if (this.targetPos) {
      let f = this.arrive(this.targetPos, 30);
      f.mult(2.5);
      this.applyForce(f);
    }
  }
  update() { super.update(); }
  show() {
    push();
    translate(this.pos.x, this.pos.y);
    imageMode(CENTER);
    let size = this.r * 2;
    if (this.alive) image(imgFullHeart, 0, 0, size, size);
    else { tint(60, 60, 60); image(imgDeadHeart, 0, 0, size, size); noTint(); }
    imageMode(CORNER);
    pop();
  }
}

// StarSegment - Étoile qui suit le joueur (snake = arrive chaîne, banc = separate + align + cohesion + arrive vers joueur)
const STAR_FOLLOW_R = 4;

class StarSegment extends Vehicle {
  constructor(x, y, index) {
    super(x, y);
    this.maxSpeed = 7;
    this.maxForce = 0.6;
    this.r = STAR_FOLLOW_R;
    this.index = index;
    this.targetPos = null;
  }

  applyBehaviors(world) {
    let force = createVector(0, 0);
    if (world.obstacles && world.obstacles.length > 0) {
      let avoidForce = this.avoidObstacles(world.obstacles);
      avoidForce.mult(2.2);
      force.add(avoidForce);
    }
    let segments = world.starSegments || [];
    let snakeMode = world.starFollowMode !== "flock";

    if (snakeMode) {
      if (this.targetPos) {
        let arriveForce = this.arrive(this.targetPos, 25);
        arriveForce.mult(2.5);
        force.add(arriveForce);
      }
    } else {
      // Banc : separate + align + cohesion entre étoiles, ET arrive vers l'arrière du joueur pour suivre
      if (world.playerRearPos) {
        let followForce = this.arrive(world.playerRearPos, 80);
        followForce.mult(1.4);
        force.add(followForce);
      }
      let neighbors = segments.filter((s) => s !== this);
      if (neighbors.length > 0) {
        let sep = this.separate(neighbors, 40);
        sep.mult(1.8);
        force.add(sep);
        let center = createVector(0, 0);
        let avgVel = createVector(0, 0);
        for (let n of neighbors) {
          center.add(n.pos);
          avgVel.add(n.vel);
        }
        center.div(neighbors.length);
        avgVel.div(neighbors.length);
        let cohesionForce = this.arrive(center, 50);
        cohesionForce.mult(0.6);
        force.add(cohesionForce);
        if (avgVel.mag() > 0.01) {
          let desired = avgVel.copy().setMag(this.maxSpeed);
          let alignSteer = p5.Vector.sub(desired, this.vel);
          alignSteer.limit(this.maxForce);
          alignSteer.mult(0.5);
          force.add(alignSteer);
        }
      }
      if (world.boundaries) {
        let boundForce = this.boundaries();
        boundForce.mult(2.0);
        force.add(boundForce);
      }
    }
    this.applyForce(force);
  }

  update() {
    super.update();
  }

  show() {
    if (!imgStar || !imgStar.width) return;
    push();
    translate(this.pos.x, this.pos.y);
    imageMode(CENTER);
    let size = this.r * 2;
    image(imgStar, 0, 0, size, size);
    imageMode(CORNER);
    pop();
  }
}

// PlayerVehicle - Seules les étoiles suivent (snake/banc). 5 cœurs par défaut, 7 max (barre en haut uniquement).
class PlayerVehicle extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.maxSpeed = 8;
    this.maxForce = 0.6;
    this.r = 20;
    this.color = "cyan";
    this.lives = 5;
    this.maxLives = 5;
    this.invulnerable = false;
    this.invulnerableTime = 0;
    this.hitCooldown = 120;
    this.starFollowMode = "snake";
    this.starSegments = [];
  }

  addHeart() {
    if (this.maxLives >= 7) return;
    this.maxLives++;
    this.lives = this.maxLives;
  }

  getPlayerRearPos() {
    let behind = this.vel.copy();
    if (behind.mag() > 0.01) behind.normalize();
    else behind = createVector(1, 0);
    behind.mult(-this.r * 1.5);
    return p5.Vector.add(this.pos, behind);
  }

  applyBehaviors(world) {
    let force = createVector(0, 0);
    let mousePos = createVector(mouseX, mouseY);
    let arriveForce = this.arrive(mousePos, 50);
    arriveForce.mult(3.0);
    force.add(arriveForce);
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
        starForce.mult(0.15);
        force.add(starForce);
      }
    }
    if (world.obstacles && world.obstacles.length > 0) {
      let avoidForce = this.avoidObstacles(world.obstacles);
      avoidForce.mult(2.0);
      force.add(avoidForce);
    }
    if (world.allVehicles) {
      let separateForce = this.separate(world.allVehicles, 60);
      separateForce.mult(1.5);
      force.add(separateForce);
    }
    let boundariesForce = this.boundaries();
    boundariesForce.mult(3.0);
    force.add(boundariesForce);
    this.applyForce(force);
  }

  update() {
    super.update();

    let targetCount = 0;
    if (world && typeof world.starsCollected === "number") {
      targetCount = min(max(0, floor(world.starsCollected)), 100);
    }
    while (this.starSegments.length < targetCount) {
      let idx = this.starSegments.length;
      this.starSegments.push(new StarSegment(this.pos.x - (idx + 1) * 12, this.pos.y, idx));
    }
    while (this.starSegments.length > targetCount) {
      this.starSegments.pop();
    }

    if (world) {
      world.starSegments = this.starSegments;
      world.starFollowMode = this.starFollowMode;
      world.playerRearPos = this.getPlayerRearPos();
      world.boundaries = true;
    }
    let rearPos = this.getPlayerRearPos();
    for (let i = 0; i < this.starSegments.length; i++) {
      let seg = this.starSegments[i];
      if (i === 0) seg.targetPos = rearPos;
      else seg.targetPos = this.starSegments[i - 1].pos;
      seg.applyBehaviors(world);
      seg.update();
    }

    if (this.invulnerable) {
      this.invulnerableTime--;
      if (this.invulnerableTime <= 0) this.invulnerable = false;
    }
  }

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
    this.lives = min(this.lives + amount, this.maxLives);
  }

  activateShield(duration = 300) {
    this.invulnerable = true;
    this.invulnerableTime = duration;
  }

  show() {
    for (let i = this.starSegments.length - 1; i >= 0; i--) {
      this.starSegments[i].show();
    }
    push();
    translate(this.pos.x, this.pos.y);
    let alpha = 255;
    if (this.invulnerable) {
      alpha = (frameCount % 10 < 5) ? 150 : 255;
    }
    if (this.vel.mag() > 0.01) {
      rotate(this.vel.heading() + HALF_PI);
    }
    imageMode(CENTER);
    if (this.invulnerable) tint(255, alpha);
    image(imgMainCharacter, 0, 0, this.r * 2.5, this.r * 2.5);
    if (this.invulnerable) noTint();
    imageMode(CORNER);
    if (this.invulnerable) {
      noFill();
      stroke(255, 255, 0, alpha);
      strokeWeight(2);
      circle(0, 0, this.r * 2.5);
    }
    pop();
  }

  showDebug() {
    push();
    noFill();
    stroke(0, 255, 255, 100);
    strokeWeight(1);
    circle(this.pos.x, this.pos.y, this.r * 2);
    let headPos = this.getHeadPos();
    fill(255, 0, 0);
    noStroke();
    circle(headPos.x, headPos.y, 8);
    stroke(255, 0, 0, 80);
    noFill();
    circle(headPos.x, headPos.y, this.r * 1.5);
    stroke(0, 255, 255, 200);
    strokeWeight(2);
    let v = this.vel.copy().mult(10);
    line(this.pos.x, this.pos.y, this.pos.x + v.x, this.pos.y + v.y);
    stroke(0, 255, 255, 60);
    strokeWeight(1);
    line(this.pos.x, this.pos.y, mouseX, mouseY);
    stroke(255, 200, 0, 80);
    for (let i = 0; i < this.starSegments.length; i++) {
      let s = this.starSegments[i];
      if (i === 0) line(this.pos.x, this.pos.y, s.pos.x, s.pos.y);
      else line(this.starSegments[i - 1].pos.x, this.starSegments[i - 1].pos.y, s.pos.x, s.pos.y);
      noFill();
      circle(s.pos.x, s.pos.y, s.r * 2);
    }
    pop();
  }
}
