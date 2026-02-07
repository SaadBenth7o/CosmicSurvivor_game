# Project Rules — Cosmic Survivor (11)

## 1. Base Class: NEVER Modify

- The file `vehicle.js` contains the base class `Vehicle`.
- **DO NOT modify `vehicle.js` under any circumstance.**
- All steering behavior methods are defined there: `seek`, `flee`, `arrive`, `pursue`, `evade`, `wander`, `avoidObstacles`, `separate`, `boundaries`, `edges`.
- All properties are defined there: `pos`, `vel`, `acc`, `maxSpeed`, `maxForce`, `r`, `color`.

## 2. Extend Via Subclasses Only

- To add new entity types, **create a subclass** that extends `Vehicle` in the `vehicles/` folder.
- Every subclass **must override** these three methods:
  - `applyBehaviors(world)` — compose steering forces with weights.
  - `show()` — custom visual rendering.
  - `update()` — call `super.update()` plus any additional logic.
- Existing subclasses:
  - `vehicles/playerVehicle.js` → `PlayerVehicle`, `HeartSegment`
  - `vehicles/hunterVehicle.js` → `HunterVehicle`
  - `vehicles/obstacleVehicle.js` → `ObstacleVehicle`

## 3. Steering Behaviors: Composable Forces

- Each behavior method (e.g., `this.seek(target)`) **returns a force vector**. It does NOT apply it directly.
- Inside `applyBehaviors(world)`:
  1. Call behavior methods to get force vectors.
  2. Multiply each force by a **weight** (e.g., `force.mult(2.0)`).
  3. Sum all weighted forces into a single combined force.
  4. Apply the combined force via `this.applyForce(combinedForce)`.
- Forces are automatically clamped by `maxForce` (per behavior) and `maxSpeed` (in `update()`).

```javascript
// CORRECT pattern:
applyBehaviors(world) {
  let force = createVector(0, 0);
  let seekForce = this.seek(target);
  seekForce.mult(1.5);
  force.add(seekForce);
  let boundaryForce = this.boundaries();
  boundaryForce.mult(3.0);
  force.add(boundaryForce);
  this.applyForce(force);
}
```

## 4. Available Steering Behaviors (from Vehicle)

| Method | Returns | Description |
|--------|---------|-------------|
| `seek(target)` | Force vector | Steer toward a position at full speed |
| `flee(target)` | Force vector | Steer away from a position (inverse of seek) |
| `arrive(target, slowRadius)` | Force vector | Steer toward a position, slowing down within slowRadius |
| `pursue(targetVehicle)` | Force vector | Seek the predicted future position of a moving target |
| `evade(targetVehicle)` | Force vector | Flee from the predicted future position of a moving target |
| `wander()` | Force vector | Random smooth movement using a projected circle |
| `avoidObstacles(obstacles)` | Force vector | Steer away from the nearest obstacle ahead |
| `separate(vehicles, radius)` | Force vector | Keep distance from nearby vehicles |
| `boundaries()` | Force vector | Repulsion force when near screen edges (50px margin) |

## 5. Assets

- All image assets are in the `Assets/` folder.
- Images are loaded in `preload()` using `loadImage()` — they are available as global `p5.Image` variables.
- Pass loaded `p5.Image` objects (not file path strings) to constructors.

## 6. Code Style

- Use clear, descriptive French or English names for variables and comments.
- Keep methods small and focused — one responsibility per method.
- Comments should explain **why**, not **what**.
- No unused variables, no dead code, no orphan files.

## 7. Game Architecture

- `sketch.js` is the main entry point: `preload()`, `setup()`, `draw()`, UI functions, helper classes (`Particle`, `Collectable`).
- Game state is managed via the global `gameState` variable: `"menu"`, `"countdown"`, `"playing"`, `"gameover"`, `"levelup"`, `"victory"`.
- The `world` object is passed to all `applyBehaviors()` calls and contains: `player`, `hunters`, `obstacles`, `checkpoints`, `allVehicles`, `debugMode`.
