// ObstacleVehicle - Étend Vehicle, utilise les images Assets
// Se déplace lentement, évite les autres obstacles
// Peut sortir des bords et réapparaître de l'autre côté (va-et-vient)
class ObstacleVehicle extends Vehicle {
  constructor(x, y, radius = 55, img = null) {
    super(x, y);
    this.maxSpeed = 0.7;
    this.maxForce = 0.04;
    this.vel = p5.Vector.random2D();
    this.vel.setMag(this.maxSpeed * random(0.3, 1.0)); // Chacun son sens et vitesse
    this.r = radius;
    this.angle = random(TWO_PI);
    this.rotationSpeed = random(0.004, 0.015) * (random() > 0.5 ? 1 : -1);
    this.color = [180, 120, 80]; // Fallback si pas d'image
    this.shapePoints = this._generateShape();
    this.img = img || null; // Image p5.Image passée par le sketch
  }

  _generateShape() {
    let points = [];
    let numPoints = 8 + floor(random(4));
    for (let i = 0; i < numPoints; i++) {
      let a = (TWO_PI / numPoints) * i + random(-0.3, 0.3);
      let d = this.r * (0.7 + random(0.3));
      points.push(createVector(cos(a) * d, sin(a) * d));
    }
    return points;
  }

  // Override applyBehaviors : combine les forces de steering avec poids
  // Chaque comportement retourne une force ; on combine avec des poids
  applyBehaviors(world) {
    let force = createVector(0, 0);

    // 1. WANDER : déplacement aléatoire (wander() de Vehicle)
    let wanderForce = this.wander();
    wanderForce.mult(0.5);
    force.add(wanderForce);

    // 2. SEPARATE entre obstacles (separate() de Vehicle)
    if (world.obstacles && world.obstacles.length > 1) {
      let separateForce = this.separate(world.obstacles, this.r * 2.5);
      separateForce.mult(1.8);
      force.add(separateForce);
    }

    // 3. FLEE les checkpoints (étoiles) — ne pas marcher dessus (flee() de Vehicle)
    if (world.checkpoints && world.checkpoints.length > 0) {
      for (let cp of world.checkpoints) {
        if (cp.collected) continue;
        let d = p5.Vector.dist(this.pos, cp.pos);
        if (d < this.r + cp.r + 20) {
          let fleeForce = this.flee(cp.pos);
          fleeForce.mult(2.0);
          force.add(fleeForce);
        }
      }
    }

    // PAS de boundaries : les obstacles peuvent sortir et revenir (wrapAround)

    this.applyForce(force);
  }

  update() {
    this.angle += this.rotationSpeed;
    super.update();
  }

  // Quand un obstacle sort d'un côté, il réapparaît du côté opposé (wrap around)
  // Crée un effet de va-et-vient : certains sortent, d'autres rentrent
  wrapAround() {
    let margin = this.r + 20;
    if (this.pos.x < -margin) this.pos.x = width + margin - 5;
    else if (this.pos.x > width + margin) this.pos.x = -margin + 5;
    if (this.pos.y < -margin) this.pos.y = height + margin - 5;
    else if (this.pos.y > height + margin) this.pos.y = -margin + 5;
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);

    if (this.img && this.img.width > 0) {
      imageMode(CENTER);
      image(this.img, 0, 0, this.r * 2, this.r * 2);
      imageMode(CORNER);
    } else {
      fill(this.color[0], this.color[1], this.color[2]);
      stroke(120, 80, 50);
      strokeWeight(1.5);
      beginShape();
      for (let p of this.shapePoints) vertex(p.x, p.y);
      endShape(CLOSE);
    }

    pop();
  }

  showDebug() {
    push();
    // Cercle de collision
    noFill();
    stroke(255, 150, 0, 100);
    strokeWeight(1);
    circle(this.pos.x, this.pos.y, this.r * 2);
    // Vecteur vélocité
    stroke(0, 255, 0, 150);
    strokeWeight(2);
    let vel = this.vel.copy().mult(15);
    line(this.pos.x, this.pos.y, this.pos.x + vel.x, this.pos.y + vel.y);
    // Zone de séparation
    stroke(255, 0, 0, 40);
    strokeWeight(0.5);
    circle(this.pos.x, this.pos.y, this.r * 5);
    pop();
  }

  contains(point) {
    return p5.Vector.dist(point, this.pos) < this.r;
  }
}
