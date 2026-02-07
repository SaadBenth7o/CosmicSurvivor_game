// Classe Checkpoint - Étoiles collectables qui réapparaissent (utilise star.png)
class Checkpoint {
  constructor(x, y, radius = 15) {
    this.pos = createVector(x, y);
    this.r = radius;
    this.collected = false;
    this.respawnTime = 0;
    this.respawnDelay = 180; // 3 secondes à 60fps
    this.pulse = 0;
  }

  display() {
    if (this.collected) return;
    push();
    translate(this.pos.x, this.pos.y);
    this.pulse += 0.08;
    let pulseSize = this.r + sin(this.pulse) * 2.5;
    imageMode(CENTER);
    image(imgStar, 0, 0, pulseSize * 2, pulseSize * 2);
    imageMode(CORNER);
    pop();
  }

  update() {
    if (this.collected && this.respawnTime > 0) {
      this.respawnTime--;
      if (this.respawnTime <= 0) {
        this.collected = false;
      }
    }
  }

  checkCollision(vehicle) {
    if (this.collected) return false;
    
    let distance = p5.Vector.dist(vehicle.pos, this.pos);
    if (distance < this.r) {
      this.collected = true;
      this.respawnTime = this.respawnDelay;
      return true;
    }
    return false;
  }
}
