// Classe Vehicle de base - NE PAS MODIFIER
// Toutes les sous-classes doivent étendre cette classe
class Vehicle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.maxSpeed = 4;
    this.maxForce = 0.2;
    this.r = 16;
    this.color = "white";
  }

  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);
  }

  show() {
    push();
    stroke(this.color || "white");
    strokeWeight(2);
    fill(this.color || "white");
    translate(this.pos.x, this.pos.y);
    if (this.vel.mag() > 0.01) {
      rotate(this.vel.heading());
    }
    triangle(-this.r, -this.r / 2, -this.r, this.r / 2, this.r, 0);
    pop();
  }

  edges() {
    if (this.pos.x > width - this.r) {
      this.pos.x = width - this.r;
      this.vel.x *= -0.5;
    } else if (this.pos.x < this.r) {
      this.pos.x = this.r;
      this.vel.x *= -0.5;
    }
    
    if (this.pos.y > height - this.r) {
      this.pos.y = height - this.r;
      this.vel.y *= -0.5;
    } else if (this.pos.y < this.r) {
      this.pos.y = this.r;
      this.vel.y *= -0.5;
    }
  }
  
  boundaries() {
    let desired = null;
    let margin = 50;
    
    if (this.pos.x < margin) {
      desired = createVector(this.maxSpeed, this.vel.y);
    } else if (this.pos.x > width - margin) {
      desired = createVector(-this.maxSpeed, this.vel.y);
    }
    
    if (this.pos.y < margin) {
      desired = createVector(this.vel.x, this.maxSpeed);
    } else if (this.pos.y > height - margin) {
      desired = createVector(this.vel.x, -this.maxSpeed);
    }
    
    if (desired !== null) {
      desired.setMag(this.maxSpeed);
      let steer = p5.Vector.sub(desired, this.vel);
      steer.limit(this.maxForce);
      return steer;
    }
    
    return createVector(0, 0);
  }

  seek(target) {
    let desired = p5.Vector.sub(target, this.pos);
    desired.setMag(this.maxSpeed);
    let force = p5.Vector.sub(desired, this.vel);
    force.limit(this.maxForce);
    return force;
  }

  flee(target) {
    return this.seek(target).mult(-1);
  }

  arrive(target, slowRadius = 100) {
    let desired = p5.Vector.sub(target, this.pos);
    let distance = desired.mag();
    let desiredSpeed = this.maxSpeed;
    
    if (distance < slowRadius) {
      desiredSpeed = map(distance, 0, slowRadius, 0, this.maxSpeed);
    }
    
    desired.setMag(desiredSpeed);
    let force = p5.Vector.sub(desired, this.vel);
    force.limit(this.maxForce);
    return force;
  }

  pursue(target) {
    let distance = p5.Vector.dist(this.pos, target.pos);
    let prediction = distance / this.maxSpeed;
    let futurePos = p5.Vector.add(target.pos, p5.Vector.mult(target.vel, prediction));
    return this.seek(futurePos);
  }

  evade(target) {
    let distance = p5.Vector.dist(this.pos, target.pos);
    let prediction = distance / this.maxSpeed;
    let futurePos = p5.Vector.add(target.pos, p5.Vector.mult(target.vel, prediction));
    return this.flee(futurePos);
  }

  wander() {
    let distanceCercle = 150;
    let wanderRadius = 50;
    
    let pointDevant = this.vel.copy();
    if (pointDevant.mag() < 0.1) {
      pointDevant = p5.Vector.fromAngle(random(TWO_PI));
    }
    pointDevant.setMag(distanceCercle);
    pointDevant.add(this.pos);
    
    if (!this.wanderTheta) {
      this.wanderTheta = 0;
    }
    this.wanderTheta += random(-0.3, 0.3);
    
    let heading = this.vel.mag() > 0.1 ? this.vel.heading() : 0;
    let wanderAngle = heading + this.wanderTheta;
    let pointSurCercle = createVector(
      wanderRadius * cos(wanderAngle),
      wanderRadius * sin(wanderAngle)
    );
    pointSurCercle.add(pointDevant);
    
    return this.seek(pointSurCercle);
  }

  avoidObstacles(obstacles) {
    let ahead = this.vel.copy();
    if (ahead.mag() > 0.1) {
      ahead.normalize();
      ahead.mult(30);
    } else {
      ahead = createVector(30, 0);
    }
    let aheadPos = p5.Vector.add(this.pos, ahead);
    
    let obstacleLePlusProche = null;
    let minDistance = Infinity;
    
    for (let obs of obstacles) {
      let distance = p5.Vector.dist(aheadPos, obs.pos);
      if (distance < obs.r + this.r && distance < minDistance) {
        minDistance = distance;
        obstacleLePlusProche = obs;
      }
    }
    
    if (obstacleLePlusProche) {
      let avoidance = p5.Vector.sub(aheadPos, obstacleLePlusProche.pos);
      if (avoidance.mag() > 0.1) {
        avoidance.normalize();
        avoidance.mult(this.maxForce * 3);
        return avoidance;
      }
    }
    
    return createVector(0, 0);
  }

  separate(vehicles, perceptionRadius = 50) {
    let steering = createVector();
    let count = 0;
    
    for (let other of vehicles) {
      if (other === this) continue;
      let distance = p5.Vector.dist(this.pos, other.pos);
      
      if (distance < perceptionRadius && distance > 0) {
        let diff = p5.Vector.sub(this.pos, other.pos);
        diff.normalize();
        diff.div(distance);
        steering.add(diff);
        count++;
      }
    }
    
    if (count > 0) {
      steering.div(count);
      steering.setMag(this.maxSpeed);
      steering.sub(this.vel);
      steering.limit(this.maxForce);
    }
    
    return steering;
  }

  applyBehaviors(world) {
    // À implémenter dans les sous-classes
  }
}
