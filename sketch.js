// Cosmic Survivor - Jeu de survie spatiale avec comportements de steering

// Variables globales
let player;
let hunters = [];
let obstacles = [];
let checkpoints = [];
let world;

// Paramètres du jeu
let nbHunters = 1;
let nbObstacles = 24;
let nbCheckpoints = 8;

// Images des obstacles (chargées dans preload)
let obstacleImagePaths = [
  "./Assets/obstacle1.png",
  "./Assets/obsatcle2.png",
  "./Assets/Obstacle3.png",
  "./Assets/Obstacle4.png",
  "./Assets/Obstacle5.png"
];
let obstacleImages = [];

// Images UI et collectables (chargées dans preload)
let imgStar, imgShield, imgFullHeart, imgDeadHeart;
let imgMainCharacter, imgMonster0, imgMonster1, imgMonsterMax;

// État du jeu
let gameState = "menu"; // "menu", "countdown", "playing", "gameover", "levelup", "victory"
let isResuming = false; // true si on reprend une partie en cours
let score = 0;
let timeSurvived = 0;
let particles = [];
let starsCollected = 0;
let currentLevel = 1;
let maxLevel = 15;
let collectables = [];
let lastCollectableSpawn = 0;
let collectableSpawnInterval = 600;

// Debug mode
let debugMode = false;

// Level-up animation
let levelUpTimer = 0;
let levelUpDuration = 120;

// Victory animation
let victoryTimer = 0;
let slowMotionFactor = 1;

// Countdown (3-2-1)
let countdownTimer = 0;
let countdownDuration = 180; // 3 secondes à 60fps
let countdownValue = 3;

// Historique des meilleurs scores (session)
let scoreHistory = []; // [{score, level, stars, time}]

// Fond d'espace généré
let stars = [];

// Indique si le jeu a déjà été initialisé une fois
let gameInitialized = false;

function generateStars() {
  stars = [];
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(0.5, 2),
      brightness: random(100, 255)
    });
  }
}

function preload() {
  obstacleImages = [];
  for (let i = 0; i < obstacleImagePaths.length; i++) {
    obstacleImages.push(loadImage(obstacleImagePaths[i]));
  }
  imgStar = loadImage("./Assets/star.png");
  imgShield = loadImage("./Assets/shield.png");
  imgFullHeart = loadImage("./Assets/full_HEART.png");
  imgDeadHeart = loadImage("./Assets/DeadHeart.png");
  imgMainCharacter = loadImage("./Assets/main_character-.png");
  imgMonster0 = loadImage("./Assets/monster0.png");
  imgMonster1 = loadImage("./Assets/monster1.png");
  imgMonsterMax = loadImage("./Assets/MonsterMax.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  generateStars();

  if (!gameInitialized) {
    // Premier lancement : afficher le menu sans initialiser le jeu
    gameState = "menu";
    isResuming = false;
    gameInitialized = true;
    return;
  }

  // Initialisation / réinitialisation du jeu
  initGame();
}

function initGame() {
  createCheckpoints();
  createObstacles();
  player = new PlayerVehicle(width / 2, height / 2);
  nbHunters = 1;
  createHunters();

  score = 0;
  timeSurvived = 0;
  starsCollected = 0;
  currentLevel = 1;
  collectables = [];
  particles = [];
  lastCollectableSpawn = 0;

  world = {
    player: player,
    hunters: hunters,
    obstacles: obstacles,
    checkpoints: checkpoints,
    allVehicles: [player, ...hunters],
    debugMode: false
  };
}

function createCheckpoints() {
  checkpoints = [];
  for (let i = 0; i < nbCheckpoints; i++) {
    let x = random(100, width - 100);
    let y = random(100, height - 100);
    let checkpoint = new Checkpoint(x, y);
    checkpoint.id = i;
    checkpoints.push(checkpoint);
  }
}

function createObstacles() {
  obstacles = [];
  let minDist = 140;
  for (let i = 0; i < nbObstacles; i++) {
    let x, y, valid = false, attempts = 0;
    let startFromEdge = random() < 0.3;
    while (!valid && attempts < 80) {
      if (startFromEdge) {
        let side = floor(random(4));
        if (side === 0) { x = -60; y = random(height); }
        else if (side === 1) { x = width + 60; y = random(height); }
        else if (side === 2) { x = random(width); y = -60; }
        else { x = random(width); y = height + 60; }
      } else {
        x = random(120, width - 120);
        y = random(120, height - 120);
      }
      valid = true;
      for (let obs of obstacles) {
        if (dist(x, y, obs.pos.x, obs.pos.y) < minDist) {
          valid = false;
          break;
        }
      }
      attempts++;
    }
    if (valid) {
      let img = obstacleImages.length > 0 ? obstacleImages[i % obstacleImages.length] : null;
      obstacles.push(new ObstacleVehicle(x, y, random(45, 70), img));
    }
  }
}

function createHunters() {
  hunters = [];
  for (let i = 0; i < nbHunters; i++) {
    let x = random(width);
    let y = random(height);
    hunters.push(new HunterVehicle(x, y, 0, imgMonster0, 1));
  }
}

// ============================
//         DRAW PRINCIPAL
// ============================
function draw() {
  // Fond d'espace (toujours affiché)
  background(10, 10, 20);
  for (let star of stars) {
    fill(star.brightness);
    noStroke();
    circle(star.x, star.y, star.size);
  }
  for (let i = 0; i < 20; i++) {
    let star = stars[i];
    let twinkle = sin(frameCount * 0.05 + i) * 50 + 200;
    fill(twinkle);
    circle(star.x, star.y, star.size * 1.5);
  }

  // === ÉTAT: MENU / PAGE D'ACCUEIL ===
  if (gameState === "menu") {
    // Si on est en pause, afficher le jeu figé derrière
    if (isResuming && world) {
      drawFrozenGame();
      // Overlay sombre
      fill(0, 0, 0, 160);
      noStroke();
      rect(0, 0, width, height);
    }
    drawMenuScreen();
    return;
  }

  // === ÉTAT: COUNTDOWN 3-2-1 ===
  if (gameState === "countdown") {
    // Afficher le jeu figé derrière
    if (world) drawFrozenGame();
    drawCountdown();
    return;
  }

  // Mettre à jour debugMode dans world
  if (world) world.debugMode = debugMode;

  // Mettre à jour et afficher les obstacles
  for (let obs of obstacles) {
    obs.applyBehaviors(world);
    obs.update();
    obs.wrapAround();
    obs.show();
    if (debugMode) obs.showDebug();
  }

  // Afficher les checkpoints
  for (let cp of checkpoints) {
    cp.update();
    cp.display();
  }

  // Afficher les particules
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }

  // === ÉTAT: VICTOIRE ===
  if (gameState === "victory") {
    victoryTimer++;
    slowMotionFactor = max(0.05, 1 - victoryTimer / 120);
    for (let hunter of hunters) {
      hunter.vel.mult(slowMotionFactor);
      hunter.update();
      hunter.show();
      if (frameCount % 3 === 0) {
        createImpactParticles(hunter.pos.x + random(-20, 20), hunter.pos.y + random(-20, 20));
      }
    }
    player.show();
    drawVictoryScreen();
    drawUI();
    return;
  }

  // === ÉTAT: LEVEL UP ===
  if (gameState === "levelup") {
    levelUpTimer++;
    player.show();
    for (let hunter of hunters) { hunter.show(); }
    for (let i = collectables.length - 1; i >= 0; i--) {
      collectables[i].display();
    }
    drawLevelUpScreen();
    drawUI();
    if (levelUpTimer >= levelUpDuration) {
      gameState = "playing";
      levelUpTimer = 0;
    }
    return;
  }

  // === ÉTAT: PLAYING ===
  if (gameState === "playing") {
    timeSurvived += 1 / 60;
    world.allVehicles = [player, ...hunters];

    player.applyBehaviors(world);
    player.update();
    player.edges();

    // Collisions étoiles
    for (let cp of checkpoints) {
      if (cp.checkCollision(player)) {
        score += 50;
        starsCollected++;
        createStarParticles(cp.pos.x, cp.pos.y);

        let newLevel = floor(starsCollected / 5) + 1;
        if (newLevel > currentLevel) {
          currentLevel = newLevel;
          player.heal(4);

          if (currentLevel > maxLevel) {
            saveScore();
            gameState = "victory";
            victoryTimer = 0;
            return;
          }

          while (hunters.length < currentLevel) {
            let x = random(100, width - 100);
            let y = random(100, height - 100);
            let monsterType, monsterImg, monsterDamage;
            if (currentLevel <= 5) {
              monsterType = 0; monsterImg = imgMonster0; monsterDamage = 1;
            } else if (currentLevel <= 10) {
              monsterType = 1; monsterImg = imgMonster1; monsterDamage = 2;
            } else {
              monsterType = 2; monsterImg = imgMonsterMax; monsterDamage = 3;
            }
            hunters.push(new HunterVehicle(x, y, monsterType, monsterImg, monsterDamage));
          }

          gameState = "levelup";
          levelUpTimer = 0;
          return;
        }
      }
    }

    // Collisions collectables
    for (let i = collectables.length - 1; i >= 0; i--) {
      let collectable = collectables[i];
      if (collectable.checkCollision(player)) {
        if (collectable.type === "heart") {
          player.heal(1);
          createStarParticles(collectable.pos.x, collectable.pos.y);
        } else if (collectable.type === "shield") {
          player.activateShield(300);
          createStarParticles(collectable.pos.x, collectable.pos.y);
        }
        collectables.splice(i, 1);
      }
    }

    // Collisions hunters (tête uniquement)
    let headPos = player.getHeadPos();
    for (let hunter of hunters) {
      let distance = p5.Vector.dist(headPos, hunter.pos);
      if (distance < player.r * 0.8 + hunter.r) {
        let dmg = hunter.damage || 1;
        if (player.takeDamage(dmg)) {
          saveScore();
          gameState = "gameover";
        } else {
          createImpactParticles(headPos.x, headPos.y);
        }
      }
    }

    // Spawn collectables
    if (frameCount - lastCollectableSpawn > collectableSpawnInterval && random() < 0.3) {
      let x = random(100, width - 100);
      let y = random(100, height - 100);
      let type = random() < 0.5 ? "heart" : "shield";
      collectables.push(new Collectable(x, y, type));
      lastCollectableSpawn = frameCount;
      collectableSpawnInterval = random(600, 1200);
    }

    // Afficher collectables
    for (let i = collectables.length - 1; i >= 0; i--) {
      collectables[i].update();
      collectables[i].display();
      if (collectables[i].isDead()) {
        collectables.splice(i, 1);
      }
    }

    // Mettre à jour hunters
    for (let hunter of hunters) {
      hunter.applyBehaviors(world);
      hunter.update();
      hunter.edges();
    }

    // Afficher véhicules
    player.show();
    for (let hunter of hunters) {
      hunter.show();
      if (debugMode) hunter.showDebug();
    }
    if (debugMode) player.showDebug();
  }

  // UI en jeu
  drawUI();
  if (debugMode) drawDebugOverlay();
}

// ============================
//    DESSINER LE JEU FIGE
// ============================
function drawFrozenGame() {
  for (let obs of obstacles) { obs.show(); }
  for (let cp of checkpoints) { cp.display(); }
  for (let c of collectables) { c.display(); }
  player.show();
  for (let h of hunters) { h.show(); }
}

// ============================
//      PAGE D'ACCUEIL / MENU
// ============================
function drawMenuScreen() {
  push();

  // Panneau central semi-transparent
  let panelW = min(width - 60, 1100);
  let panelH = min(height - 60, 700);
  let panelX = (width - panelW) / 2;
  let panelY = (height - panelH) / 2;

  fill(10, 10, 30, 220);
  stroke(100, 150, 255, 120);
  strokeWeight(2);
  rect(panelX, panelY, panelW, panelH, 15);

  // ===== TITRE =====
  noStroke();
  fill(255, 215, 0);
  textSize(42);
  textAlign(CENTER, TOP);
  text("COSMIC SURVIVOR", width / 2, panelY + 20);

  // Ligne de séparation sous le titre
  stroke(100, 150, 255, 60);
  strokeWeight(1);
  line(panelX + 30, panelY + 72, panelX + panelW - 30, panelY + 72);

  // ===== LAYOUT : Gauche (instructions) | Droite (scores) =====
  let leftX = panelX + 30;
  let leftW = panelW * 0.6;
  let rightX = panelX + panelW * 0.63;
  let rightW = panelW * 0.34;
  let contentY = panelY + 85;

  // ---- COLONNE GAUCHE : Concept & Instructions ----
  noStroke();
  fill(100, 200, 255);
  textSize(18);
  textAlign(LEFT, TOP);
  text("Concept du jeu", leftX, contentY);

  fill(220);
  textSize(13);
  let conceptText = "Survivez dans l'espace en collectant des etoiles pour progresser a travers 15 niveaux. " +
    "Evitez les monstres de plus en plus dangereux et naviguez entre les asteroides mobiles. " +
    "Collectez 5 etoiles pour passer au niveau suivant. A chaque niveau, un nouvel ennemi apparait !";
  text(conceptText, leftX, contentY + 25, leftW - 10, 80);

  // Contrôles
  let ctrlY = contentY + 110;
  fill(100, 200, 255);
  textSize(18);
  text("Controles", leftX, ctrlY);

  fill(220);
  textSize(13);
  text("Souris", leftX + 10, ctrlY + 25);
  fill(180); text("Deplacer le personnage", leftX + 80, ctrlY + 25);
  fill(220); text("D", leftX + 10, ctrlY + 42);
  fill(180); text("Activer / Desactiver le mode Debug", leftX + 80, ctrlY + 42);
  fill(220); text("P / Echap", leftX + 10, ctrlY + 59);
  fill(180); text("Mettre en pause (revenir au menu)", leftX + 80, ctrlY + 59);

  // Monstres
  let monY = ctrlY + 90;
  fill(100, 200, 255);
  textSize(18);
  text("Les monstres", leftX, monY);

  // Monster 0
  let mRowY = monY + 28;
  if (imgMonster0 && imgMonster0.width > 0) {
    imageMode(CENTER);
    image(imgMonster0, leftX + 18, mRowY + 10, 32, 32);
    imageMode(CORNER);
  }
  fill(255, 150, 150); textSize(13);
  text("Monstre 0 (Niv. 1-5)", leftX + 40, mRowY);
  fill(180); textSize(11);
  text("1 coeur de degats  |  Vision: 300px  |  Lent mais vigilant", leftX + 40, mRowY + 16);

  // Monster 1
  mRowY += 42;
  if (imgMonster1 && imgMonster1.width > 0) {
    imageMode(CENTER);
    image(imgMonster1, leftX + 18, mRowY + 10, 32, 32);
    imageMode(CORNER);
  }
  fill(255, 100, 100); textSize(13);
  text("Monstre 1 (Niv. 6-10)", leftX + 40, mRowY);
  fill(180); textSize(11);
  text("2 coeurs de degats  |  Vision: 200px  |  Rapide et dangereux", leftX + 40, mRowY + 16);

  // Monster Max
  mRowY += 42;
  if (imgMonsterMax && imgMonsterMax.width > 0) {
    imageMode(CENTER);
    image(imgMonsterMax, leftX + 18, mRowY + 10, 32, 32);
    imageMode(CORNER);
  }
  fill(255, 50, 50); textSize(13);
  text("Monstre Max (Niv. 11-15)", leftX + 40, mRowY);
  fill(180); textSize(11);
  text("3 coeurs de degats  |  Vision: 130px  |  Mortel mais myope", leftX + 40, mRowY + 16);

  // Niveaux
  let lvlY = mRowY + 48;
  fill(100, 200, 255);
  textSize(18);
  text("Progression", leftX, lvlY);
  fill(180); textSize(12);
  text("15 niveaux  |  5 etoiles par niveau  |  +1 ennemi par niveau", leftX + 10, lvlY + 24);
  text("Vie restauree a chaque passage de niveau", leftX + 10, lvlY + 40);
  text("Boucliers et coeurs apparaissent aleatoirement", leftX + 10, lvlY + 56);

  // ---- COLONNE DROITE : Tableau des scores ----
  // Ligne verticale de séparation
  stroke(100, 150, 255, 40);
  strokeWeight(1);
  line(rightX - 15, contentY, rightX - 15, panelY + panelH - 80);

  noStroke();
  fill(255, 215, 0);
  textSize(18);
  textAlign(CENTER, TOP);
  text("Meilleurs Scores", rightX + rightW / 2, contentY);

  // En-têtes du tableau
  let tableY = contentY + 30;
  fill(150);
  textSize(11);
  textAlign(LEFT, TOP);
  text("#", rightX + 5, tableY);
  text("Score", rightX + 45, tableY);
  text("Niveau", rightX + 110, tableY);
  text("Temps", rightX + 170, tableY);
  text("Etoiles", rightX + 230, tableY);

  // Ligne sous les en-têtes
  stroke(100, 150, 255, 40);
  line(rightX + 5, tableY + 16, rightX + rightW - 10, tableY + 16);
  noStroke();

  // Afficher les 5 meilleurs scores
  let medals = ["Or", "Argent", "Bronze"];
  let medalColors = [[255, 215, 0], [200, 200, 210], [205, 127, 50]];

  if (scoreHistory.length === 0) {
    fill(120);
    textSize(13);
    textAlign(CENTER, TOP);
    text("Aucun score pour le moment", rightX + rightW / 2, tableY + 40);
    text("Jouez pour remplir ce tableau !", rightX + rightW / 2, tableY + 60);
  } else {
    for (let i = 0; i < min(scoreHistory.length, 5); i++) {
      let entry = scoreHistory[i];
      let rowY = tableY + 22 + i * 32;
      textAlign(LEFT, TOP);

      // Médaille ou numéro
      if (i < 3) {
        fill(medalColors[i][0], medalColors[i][1], medalColors[i][2]);
        textSize(16);
        // Dessiner un cercle médaille
        let mx = rightX + 16;
        let my = rowY + 8;
        stroke(medalColors[i][0], medalColors[i][1], medalColors[i][2]);
        strokeWeight(2);
        noFill();
        circle(mx, my, 22);
        noStroke();
        fill(medalColors[i][0], medalColors[i][1], medalColors[i][2]);
        textSize(12);
        textAlign(CENTER, CENTER);
        text(i + 1, mx, my);
      } else {
        fill(120);
        textSize(13);
        textAlign(CENTER, CENTER);
        text(i + 1, rightX + 16, rowY + 8);
      }

      // Données
      textAlign(LEFT, TOP);
      fill(255); textSize(13);
      text(entry.score, rightX + 45, rowY + 2);
      fill(200);
      text(entry.level + " / 15", rightX + 110, rowY + 2);
      text(floor(entry.time) + "s", rightX + 170, rowY + 2);
      text(entry.stars, rightX + 230, rowY + 2);
    }
  }

  // ===== BOUTON JOUER / REPRENDRE =====
  let btnW = 220;
  let btnH = 50;
  let btnX = width / 2 - btnW / 2;
  let btnY = panelY + panelH - 70;

  // Hover effect
  let isHover = mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH;
  if (isHover) {
    fill(50, 180, 100);
    stroke(100, 255, 150);
  } else {
    fill(30, 140, 80);
    stroke(60, 200, 120);
  }
  strokeWeight(2);
  rect(btnX, btnY, btnW, btnH, 10);

  fill(255);
  noStroke();
  textSize(24);
  textAlign(CENTER, CENTER);
  text(isResuming ? "REPRENDRE" : "JOUER", btnX + btnW / 2, btnY + btnH / 2);

  pop();
}

// ============================
//     COUNTDOWN 3 - 2 - 1
// ============================
function drawCountdown() {
  push();

  // Overlay sombre
  fill(0, 0, 0, 120);
  noStroke();
  rect(0, 0, width, height);

  countdownTimer++;

  // Calculer la valeur du compteur (3, 2, 1)
  let elapsed = countdownTimer;
  if (elapsed <= 60) {
    countdownValue = 3;
  } else if (elapsed <= 120) {
    countdownValue = 2;
  } else if (elapsed <= 180) {
    countdownValue = 1;
  }

  // Animation de taille (pulse à chaque seconde)
  let phase = (elapsed % 60) / 60;
  let sz = lerp(90, 50, phase);
  let alpha = lerp(255, 100, phase);

  fill(255, 255, 0, alpha);
  textSize(sz);
  textAlign(CENTER, CENTER);
  text(countdownValue, width / 2, height / 2);

  // Fin du countdown
  if (countdownTimer >= countdownDuration) {
    gameState = "playing";
    countdownTimer = 0;
  }

  pop();
}

// ============================
//           UI EN JEU
// ============================
function drawUI() {
  push();
  fill(255);
  textSize(16);
  textAlign(LEFT);
  text("Score: " + score, 20, 30);
  text("Temps: " + floor(timeSurvived) + "s", 20, 50);
  text("Niveau: " + currentLevel + " / " + maxLevel, 20, 70);
  text("Etoiles: " + starsCollected + " (Prochain: " + (currentLevel * 5) + ")", 20, 90);

  // Mini indicateur de vies
  for (let i = 0; i < 4; i++) {
    let hx = 20 + i * 22;
    let hy = 105;
    if (i < player.lives) {
      image(imgFullHeart, hx, hy, 18, 18);
    } else {
      image(imgDeadHeart, hx, hy, 18, 18);
    }
  }

  // Bouton Debug Mode
  let dbgBtnX = width - 140;
  let dbgBtnY = 10;
  let dbgBtnW = 120;
  let dbgBtnH = 30;
  fill(debugMode ? color(0, 200, 100) : color(80, 80, 80));
  stroke(200);
  strokeWeight(1);
  rect(dbgBtnX, dbgBtnY, dbgBtnW, dbgBtnH, 5);
  fill(255);
  noStroke();
  textSize(13);
  textAlign(CENTER, CENTER);
  text(debugMode ? "Debug: ON" : "Debug: OFF", dbgBtnX + dbgBtnW / 2, dbgBtnY + dbgBtnH / 2);

  // Game Over
  if (gameState === "gameover") {
    fill(0, 0, 0, 150);
    noStroke();
    rect(0, 0, width, height);
    fill(255, 50, 50);
    textSize(48);
    textAlign(CENTER, CENTER);
    text("GAME OVER", width / 2, height / 2 - 30);
    fill(255);
    textSize(22);
    text("Score: " + score + "  |  Temps: " + floor(timeSurvived) + "s", width / 2, height / 2 + 20);
    textSize(16);
    fill(200);
    text("Cliquez pour revenir au menu", width / 2, height / 2 + 60);
  }

  // Info bas d'écran
  textAlign(LEFT);
  textSize(13);
  fill(180);
  text("Souris: Deplacer  |  D: Debug  |  P: Pause", 20, height - 15);

  pop();
}

function drawLevelUpScreen() {
  push();
  fill(0, 0, 0, 120);
  noStroke();
  rect(0, 0, width, height);

  let blink = sin(levelUpTimer * 0.2) > 0;
  if (blink) {
    fill(255, 255, 0);
    textSize(64);
    textAlign(CENTER, CENTER);
    text("NIVEAU " + currentLevel, width / 2, height / 2 - 30);
  }

  if (levelUpTimer > 60) {
    fill(255);
    textSize(24);
    textAlign(CENTER, CENTER);
    text("C'est parti, on continue !", width / 2, height / 2 + 40);
  }
  pop();
}

function drawVictoryScreen() {
  push();
  fill(0, 0, 0, min(victoryTimer * 2, 180));
  noStroke();
  rect(0, 0, width, height);

  if (victoryTimer > 60) {
    fill(255, 215, 0);
    textSize(64);
    textAlign(CENTER, CENTER);
    text("BRAVO !", width / 2, height / 2 - 40);
    fill(255);
    textSize(24);
    text("Vous avez conquis les 15 niveaux !", width / 2, height / 2 + 20);
    text("Score: " + score + "  |  Temps: " + floor(timeSurvived) + "s", width / 2, height / 2 + 60);
    textSize(16);
    fill(200);
    text("Cliquez pour revenir au menu", width / 2, height / 2 + 100);
  }
  pop();
}

function drawDebugOverlay() {
  push();
  noFill();
  stroke(255, 255, 0, 80);
  strokeWeight(1);
  rect(50, 50, width - 100, height - 100);

  fill(255, 255, 0, 120);
  noStroke();
  textSize(10);
  textAlign(LEFT);
  text("Boundaries (50px)", 55, 45);

  fill(0, 200, 100, 180);
  textSize(11);
  text("FPS: " + floor(frameRate()), width - 140, 55);
  text("Obstacles: " + obstacles.length, width - 140, 70);
  text("Hunters: " + hunters.length, width - 140, 85);
  text("Checkpoints: " + checkpoints.length, width - 140, 100);
  pop();
}

// ============================
//    SAUVEGARDE DES SCORES
// ============================
function saveScore() {
  // Ne sauvegarder que si le joueur a fait quelque chose
  if (score <= 0 && starsCollected <= 0) return;

  scoreHistory.push({
    score: score,
    level: currentLevel,
    stars: starsCollected,
    time: timeSurvived
  });

  // Trier par score décroissant et garder le top 5
  scoreHistory.sort((a, b) => b.score - a.score);
  if (scoreHistory.length > 5) {
    scoreHistory = scoreHistory.slice(0, 5);
  }
}

// ============================
//       ÉVÉNEMENTS CLAVIER
// ============================
function keyPressed() {
  // Toggle debug mode
  if (key === 'd' || key === 'D') {
    debugMode = !debugMode;
  }

  // Pause : retour au menu
  if (key === 'p' || key === 'P' || keyCode === ESCAPE) {
    if (gameState === "playing") {
      gameState = "menu";
      isResuming = true;
    }
  }
}

// ============================
//       ÉVÉNEMENTS SOURIS
// ============================
function mousePressed() {
  // === MENU : clic sur le bouton Jouer/Reprendre ===
  if (gameState === "menu") {
    let panelW = min(width - 60, 1100);
    let panelH = min(height - 60, 700);
    let panelX = (width - panelW) / 2;
    let panelY = (height - panelH) / 2;

    let btnW = 220;
    let btnH = 50;
    let btnX = width / 2 - btnW / 2;
    let btnY = panelY + panelH - 70;

    if (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH) {
      if (isResuming) {
        // Reprendre la partie en cours avec countdown
        gameState = "countdown";
        countdownTimer = 0;
      } else {
        // Nouvelle partie
        initGame();
        gameState = "countdown";
        countdownTimer = 0;
      }
      return;
    }
    return; // Ignorer les clics ailleurs dans le menu
  }

  // === COUNTDOWN : ignorer les clics ===
  if (gameState === "countdown") return;

  // === Toggle debug via le bouton ===
  let dbgBtnX = width - 140;
  let dbgBtnY = 10;
  let dbgBtnW = 120;
  let dbgBtnH = 30;
  if (mouseX >= dbgBtnX && mouseX <= dbgBtnX + dbgBtnW && mouseY >= dbgBtnY && mouseY <= dbgBtnY + dbgBtnH) {
    debugMode = !debugMode;
    return;
  }

  // === Game Over / Victory : retour au menu ===
  if (gameState === "gameover" || gameState === "victory") {
    gameState = "menu";
    isResuming = false;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateStars();
  if (gameState !== "menu" || isResuming) {
    createCheckpoints();
    createObstacles();
  }
}

// ============================
//    SYSTÈME DE PARTICULES
// ============================
class Particle {
  constructor(x, y, color) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-2, 2), random(-2, 2));
    this.lifetime = 30;
    this.maxLifetime = 30;
    this.color = color;
    this.size = random(3, 8);
  }

  update() {
    this.pos.add(this.vel);
    this.vel.mult(0.95);
    this.lifetime--;
  }

  display() {
    push();
    let alpha = map(this.lifetime, 0, this.maxLifetime, 0, 255);
    fill(this.color[0], this.color[1], this.color[2], alpha);
    noStroke();
    circle(this.pos.x, this.pos.y, this.size);
    pop();
  }

  isDead() {
    return this.lifetime <= 0;
  }
}

function createStarParticles(x, y) {
  for (let i = 0; i < 10; i++) {
    particles.push(new Particle(x, y, [255, 255, 0]));
  }
}

function createImpactParticles(x, y) {
  for (let i = 0; i < 15; i++) {
    particles.push(new Particle(x, y, [255, 100, 100]));
  }
}

// ============================
//    CLASSE COLLECTABLE
// ============================
class Collectable {
  constructor(x, y, type) {
    this.pos = createVector(x, y);
    this.r = 25;
    this.type = type;
    this.pulse = 0;
    this.lifetime = 600;
  }

  update() {
    this.pulse += 0.08;
    this.lifetime--;
  }

  display() {
    if (this.lifetime <= 0) return;

    push();
    translate(this.pos.x, this.pos.y);

    let pulseSize = this.r + sin(this.pulse) * 4;
    let alpha = map(this.lifetime, 0, 200, 0, 255, true);
    tint(255, alpha);

    imageMode(CENTER);
    if (this.type === "heart") {
      image(imgFullHeart, 0, 0, pulseSize * 2, pulseSize * 2);
    } else if (this.type === "shield") {
      image(imgShield, 0, 0, pulseSize * 2, pulseSize * 2);
    }
    imageMode(CORNER);
    noTint();

    pop();
  }

  checkCollision(vehicle) {
    let distance = p5.Vector.dist(vehicle.pos, this.pos);
    return distance < this.r + vehicle.r;
  }

  isDead() {
    return this.lifetime <= 0;
  }
}
