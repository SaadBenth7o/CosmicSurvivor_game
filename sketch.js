// Cosmic Survivor - Jeu de survie spatial (comportements de steering)

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

// Images (preload)
let obstacleImagePaths = [
  "./Assets/obstacle1.png",
  "./Assets/obsatcle2.png",
  "./Assets/Obstacle3.png",
  "./Assets/Obstacle4.png",
  "./Assets/Obstacle5.png"
];
let obstacleImages = [];
let imgStar, imgStarScore, imgShield, imgFullHeart, imgDeadHeart;
let imgMainCharacter, imgMonster0, imgMonster1, imgMonsterMax, imgMonsterSnake;

// État du jeu
let gameState = "menu"; // "menu", "countdown", "playing", "gameover", "levelup", "victory"
let difficultyMode = "normal"; // "normal", "facile", "moyen", "difficile"
let score = 0;
let timeSurvived = 0;
let particles = [];
let starsCollected = 0;
let currentLevel = 0;
let maxLevel = 20;
let collectables = [];
let lastCollectableSpawn = 0;
let collectableSpawnInterval = 600;

// Countdown 3-2-1 (ne pas rester bloqué à 1)
const BG_THEME_INTERVAL_MS = 60; // frames par chiffre (1 seconde)
let countdownTimer = 0;
let countdownNumber = 3;

let debugMode = false;
let levelUpTimer = 0;
let levelUpDuration = 120;
let victoryTimer = 0;
let slowMotionFactor = 1;

// Sons (Web Audio API)
let audioCtx = null;
let bgGain = null;
let sfxGain = null;

// Fond d'espace
let stars = [];

// Police pixel (Press Start 2P) pour tout le projet
let pixelFont;

// Zones cliquables du menu (remplies par drawMenu, lues par mousePressed)
let menuModeButtonBounds = [];
let menuPlayButtonBounds = null;

function generateStars() {
  // Générer des étoiles pour le fond d'espace
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
  pixelFont = loadFont("https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/pressstart2p/PressStart2P-Regular.ttf");
  obstacleImages = [];
  for (let i = 0; i < obstacleImagePaths.length; i++) {
    obstacleImages.push(loadImage(obstacleImagePaths[i]));
  }
  imgStar = loadImage("./Assets/star.png");
  imgStarScore = loadImage("./Assets/star2.png");
  imgShield = loadImage("./Assets/shield.png");
  imgFullHeart = loadImage("./Assets/full_HEART.png");
  imgDeadHeart = loadImage("./Assets/DeadHeart.png");
  imgMainCharacter = loadImage("./Assets/main_character-.png");
  imgMonster0 = loadImage("./Assets/monster0.png");
  imgMonster1 = loadImage("./Assets/monster1.png");
  imgMonsterMax = loadImage("./Assets/MonsterMax.png");
  imgMonsterSnake = loadImage("./Assets/monster_snake.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  if (pixelFont) textFont(pixelFont);
  generateStars();
  
  // Créer les checkpoints
  createCheckpoints();
  
  // Créer les obstacles (images déjà chargées dans preload depuis Assets/)
  createObstacles();
  
  // Créer le joueur
  player = new PlayerVehicle(width / 2, height / 2);
  
  // Créer les hunters (commence avec 1)
  createHunters();
  
  // Initialiser les variables de progression
  starsCollected = 0;
  currentLevel = 0;
  collectables = [];
  lastCollectableSpawn = 0;
  
  world = {
    player: player,
    hunters: hunters,
    obstacles: obstacles,
    checkpoints: checkpoints,
    allVehicles: [player, ...hunters],
    debugMode: false,
    starsCollected: 0,
    starSegments: [],
    starFollowMode: "snake"
  };
}

function createCheckpoints() {
  checkpoints = [];
  
  // Créer des étoiles collectables réparties sur l'écran
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
  let minDist = 140; // Distance min entre obstacles pour ne pas se chevaucher
  
  for (let i = 0; i < nbObstacles; i++) {
    let x, y, valid = false, attempts = 0;
    // Certains obstacles commencent sur l'écran, d'autres depuis les bords (entrant)
    let startFromEdge = random() < 0.3; // 30% commencent hors écran
    
    while (!valid && attempts < 80) {
      if (startFromEdge) {
        // Spawn depuis un bord aléatoire
        let side = floor(random(4));
        if (side === 0) { x = -60; y = random(height); }        // gauche
        else if (side === 1) { x = width + 60; y = random(height); } // droite
        else if (side === 2) { x = random(width); y = -60; }    // haut
        else { x = random(width); y = height + 60; }             // bas
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
      // Distribuer les 5 images de manière équitable (chaque image utilisée au moins 2 fois)
      let img = obstacleImages.length > 0 ? obstacleImages[i % obstacleImages.length] : null;
      obstacles.push(new ObstacleVehicle(x, y, random(45, 70), img));
    }
  }
}

function createHunters() {
  hunters = [];
  let n = nbHunters;
  for (let i = 0; i < n; i++) {
    let x = random(width);
    let y = random(height);
    let type, img, dmg, vision;
    if (difficultyMode === "facile") {
      type = 0; img = imgMonster0; dmg = 1; vision = 300;
    } else if (difficultyMode === "moyen") {
      if (currentLevel < 10) { type = 1; img = imgMonster1; dmg = 2; vision = 200; }
      else { type = 2; img = imgMonsterMax; dmg = 3; vision = 130; }
    } else if (difficultyMode === "difficile") {
      if (currentLevel < 10) { type = 2; img = imgMonsterMax; dmg = 3; vision = 130; }
      else { type = 3; img = imgMonsterSnake; dmg = 4; vision = 20; }
    } else {
      if (currentLevel <= 4) { type = 0; img = imgMonster0; dmg = 1; vision = 300; }
      else if (currentLevel <= 9) { type = 1; img = imgMonster1; dmg = 2; vision = 200; }
      else if (currentLevel <= 14) { type = 2; img = imgMonsterMax; dmg = 3; vision = 130; }
      else { type = 3; img = imgMonsterSnake; dmg = 4; vision = 20; }
    }
    hunters.push(new HunterVehicle(x, y, type, img, dmg, vision));
  }
}

function draw() {
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

  // Toujours synchroniser world avec les tableaux actuels (évite bugs après resize / recréation)
  if (world) {
    world.obstacles = obstacles;
    world.checkpoints = checkpoints;
    world.player = player;
    world.hunters = hunters;
    world.allVehicles = player && hunters ? [player, ...hunters] : [];
    world.debugMode = debugMode;
    world.starsCollected = starsCollected;
    if (player && player.starFollowMode !== undefined) world.starFollowMode = player.starFollowMode;
  }

  // === ÉTAT: MENU ===
  if (gameState === "menu") {
    drawMenu();
    return;
  }

  // === ÉTAT: COUNTDOWN 3-2-1 ===
  if (gameState === "countdown") {
    countdownTimer++;
    if (countdownTimer >= BG_THEME_INTERVAL_MS) {
      countdownTimer = 0;
      countdownNumber--;
      if (countdownNumber <= 0) {
        gameState = "playing";
        countdownNumber = 3;
        if (audioCtx) startBgMusic();
      }
    }
    if (player) player.show();
    drawCountdownScreen();
    drawUI();
    return;
  }
  
  // Mettre à jour et afficher les obstacles (va-et-vient)
  for (let obs of obstacles) {
    obs.applyBehaviors(world);
    obs.update();
    obs.wrapAround();
    obs.show();
    if (debugMode) obs.showDebug();
  }
  
  // Afficher les checkpoints (étoiles)
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
  
  // === ÉTAT: VICTOIRE (20 niveaux atteints) ===
  if (gameState === "victory") {
    victoryTimer++;
    slowMotionFactor = max(0.05, 1 - victoryTimer / 120);
    
    // Faire exploser les hunters en slow motion
    for (let hunter of hunters) {
      hunter.vel.mult(slowMotionFactor);
      hunter.update();
      hunter.show();
      // Particules d'explosion continues
      if (frameCount % 3 === 0) {
        createImpactParticles(hunter.pos.x + random(-20, 20), hunter.pos.y + random(-20, 20));
      }
    }
    player.show();
    
    // Afficher le message de victoire
    drawVictoryScreen();
    drawUI();
    return;
  }
  
  // === ÉTAT: LEVEL UP (pause 2 secondes) ===
  if (gameState === "levelup") {
    levelUpTimer++;
    
    // Afficher tout figé
    player.show();
    for (let hunter of hunters) { hunter.show(); }
    for (let i = collectables.length - 1; i >= 0; i--) {
      collectables[i].display();
    }
    
    drawLevelUpScreen();
    drawUI();
    
    // Après 2 secondes, reprendre le jeu
    if (levelUpTimer >= levelUpDuration) {
      gameState = "playing";
      levelUpTimer = 0;
    }
    return;
  }
  
  if (gameState === "playing") {
    timeSurvived += 1/60;
    world.allVehicles = [player, ...hunters];
    
    // Mettre à jour le joueur (boundaries inclus dans applyBehaviors)
    player.applyBehaviors(world);
    player.update();
    player.edges();
    
    for (let cp of checkpoints) {
      if (cp.checkCollision(player)) {
        score += 50;
        starsCollected++;
        if (audioCtx) playSfx("collect");
        createStarParticles(cp.pos.x, cp.pos.y);
        
        // Chaque 5 étoiles = nouveau niveau (niveaux 0 à 19 = 20 niveaux)
        let newLevel = floor(starsCollected / 5);
        if (newLevel > currentLevel) {
          if (newLevel >= maxLevel) {
            gameState = "victory";
            victoryTimer = 0;
            if (audioCtx) playSfx("victory");
            return;
          }
          currentLevel = newLevel;
          player.lives = min(player.maxLives, player.lives + 4);
          while (hunters.length < currentLevel + 1) {
            let x = random(100, width - 100);
            let y = random(100, height - 100);
            let type, img, dmg, vision;
            if (difficultyMode === "facile") { type = 0; img = imgMonster0; dmg = 1; vision = 300; }
            else if (difficultyMode === "moyen") {
              if (currentLevel < 10) { type = 1; img = imgMonster1; dmg = 2; vision = 200; }
              else { type = 2; img = imgMonsterMax; dmg = 3; vision = 130; }
            } else if (difficultyMode === "difficile") {
              if (currentLevel < 10) { type = 2; img = imgMonsterMax; dmg = 3; vision = 130; }
              else { type = 3; img = imgMonsterSnake; dmg = 4; vision = 20; }
            } else {
              if (currentLevel <= 4) { type = 0; img = imgMonster0; dmg = 1; vision = 300; }
              else if (currentLevel <= 9) { type = 1; img = imgMonster1; dmg = 2; vision = 200; }
              else if (currentLevel <= 14) { type = 2; img = imgMonsterMax; dmg = 3; vision = 130; }
              else { type = 3; img = imgMonsterSnake; dmg = 4; vision = 20; }
            }
            hunters.push(new HunterVehicle(x, y, type, img, dmg, vision));
          }
          if (audioCtx) playSfx("levelup");
          gameState = "levelup";
          levelUpTimer = 0;
          return;
        }
      }
    }
    
    // Collisions avec les collectables
    for (let i = collectables.length - 1; i >= 0; i--) {
      let collectable = collectables[i];
      if (collectable.checkCollision(player)) {
        if (collectable.type === "heart") {
          if (player.lives < player.maxLives) {
            player.heal(1);
            createStarParticles(collectable.pos.x, collectable.pos.y);
            if (audioCtx) playSfx("collect");
            collectables.splice(i, 1);
          } else if (player.maxLives < 7) {
            player.addHeart();
            createStarParticles(collectable.pos.x, collectable.pos.y);
            if (audioCtx) playSfx("collect");
            collectables.splice(i, 1);
          }
        } else if (collectable.type === "shield") {
          player.activateShield(300);
          createStarParticles(collectable.pos.x, collectable.pos.y);
          if (audioCtx) playSfx("collect");
          collectables.splice(i, 1);
        }
      }
    }
    
    // Collisions avec les hunters — dégâts à la tête uniquement ; son dégâts seulement si pas invulnérable
    let headPos = player.getHeadPos();
    for (let hunter of hunters) {
      let distance = p5.Vector.dist(headPos, hunter.pos);
      if (distance < player.r * 0.8 + hunter.r) {
        let dmg = hunter.damage || 1;
        let wasVuln = !player.invulnerable;
        if (player.takeDamage(dmg)) {
          gameState = "gameover";
          if (audioCtx) playSfx("gameover");
        } else {
          if (wasVuln && audioCtx) playSfx("damage");
          createImpactParticles(headPos.x, headPos.y);
        }
      }
    }
    
    // Spawn de collectables
    if (frameCount - lastCollectableSpawn > collectableSpawnInterval && random() < 0.3) {
      let x = random(100, width - 100);
      let y = random(100, height - 100);
      let type = random() < 0.5 ? "heart" : "shield";
      collectables.push(new Collectable(x, y, type));
      lastCollectableSpawn = frameCount;
      collectableSpawnInterval = random(600, 1200);
    }
    
    // Mettre à jour et afficher les collectables
    for (let i = collectables.length - 1; i >= 0; i--) {
      collectables[i].update();
      collectables[i].display();
      if (collectables[i].isDead()) {
        collectables.splice(i, 1);
      }
    }
    
    // Mettre à jour les hunters (boundaries inclus dans applyBehaviors)
    for (let hunter of hunters) {
      hunter.applyBehaviors(world);
      hunter.update();
      hunter.edges();
    }
    
    // Afficher tous les véhicules
    player.show();
    for (let hunter of hunters) {
      hunter.show();
      if (debugMode) hunter.showDebug();
    }
    
    // Debug du joueur
    if (debugMode) player.showDebug();
  }
  
  // Interface utilisateur (toujours affichée)
  drawUI();
  
  // Debug : boundaries
  if (debugMode) {
    drawDebugOverlay();
  }
}

function drawUI() {
  push();
  fill(255);
  textSize(8);
  textAlign(LEFT, TOP);

  // Barre de cœurs : en haut, au centre, taille doublée (7 emplacements, full ou Dead Heart)
  if (player) {
    let heartSize = 36;
    let gap = 6;
    let totalW = player.maxLives * heartSize + (player.maxLives - 1) * gap;
    let barX = (width - totalW) / 2;
    let barY = 14;
    for (let i = 0; i < player.maxLives; i++) {
      let hx = barX + i * (heartSize + gap);
      if (i < player.lives) {
        image(imgFullHeart, hx, barY, heartSize, heartSize);
      } else {
        image(imgDeadHeart, hx, barY, heartSize, heartSize);
      }
    }
  }

  // Bloc haut-gauche: Score, Tps, Niv, Etoiles (sans barre de cœurs ici)
  let ux = 12;
  let uy = 12;
  text("Score: " + score, ux, uy);
  uy += 14;
  text("Tps: " + floor(timeSurvived) + "s", ux, uy);
  uy += 14;
  text("Niv: " + currentLevel + "/" + maxLevel, ux, uy);
  uy += 14;
  let starIconSize = 7;
  if (imgStarScore && imgStarScore.width) {
    imageMode(CENTER);
    image(imgStarScore, ux + starIconSize / 2, uy + starIconSize / 2, starIconSize, starIconSize);
    imageMode(CORNER);
  }
  text(str(starsCollected), ux + starIconSize + 6, uy);

  // Boutons Pause et Debug séparés (haut-droite, style pixel)
  let pauseW = 56;
  let pauseH = 22;
  let debugW = 56;
  let debugH = 22;
  let gap = 6;
  let btnY = 10;
  let pauseX = width - pauseW - debugW - gap - 14;
  let debugX = width - debugW - 12;
  fill(200, 60, 60);
  stroke(255);
  strokeWeight(1);
  rect(pauseX, btnY, pauseW, pauseH, 0);
  fill(255);
  noStroke();
  textSize(6);
  textAlign(CENTER, CENTER);
  text("Pause", pauseX + pauseW / 2, btnY + pauseH / 2);
  fill(debugMode ? color(60, 200, 100) : color(100, 100, 100));
  stroke(debugMode ? 255 : 150);
  strokeWeight(1);
  rect(debugX, btnY, debugW, debugH, 0);
  fill(255);
  noStroke();
  text(debugMode ? "Debug ON" : "Debug", debugX + debugW / 2, btnY + debugH / 2);
  textAlign(LEFT, TOP);

  if (gameState === "gameover") {
    fill(0, 0, 0, 180);
    noStroke();
    rect(0, 0, width, height);
    fill(255, 80, 80);
    textSize(48);
    textAlign(CENTER, CENTER);
    text("GAME OVER", width / 2, height / 2 - 50);
    fill(255);
    textSize(24);
    text("Score: " + score + "  |  Tps: " + floor(timeSurvived) + "s", width / 2, height / 2 + 20);
    textSize(18);
    fill(200);
    text("Cliquez pour recommencer", width / 2, height / 2 + 70);
  }

  textSize(6);
  fill(180);
  textAlign(LEFT, TOP);
  text("Souris: deplacer | Espace: snake/banc | D: Debug | P: Pause", 12, height - 14);
  pop();
}

function drawMenu() {
  push();
  textAlign(LEFT, TOP);

  // Rectangle central : marges partout (haut, bas, gauche, droite), tout le contenu dedans
  let margin = max(50, min(width, height) * 0.06);
  let maxRectW = 960;
  let rectW = min(width - margin * 2, maxRectW);
  let rectH = height - margin * 2;
  let rectX = (width - rectW) / 2;
  let rectY = margin;
  fill(15, 25, 55, 160);
  stroke(80, 140, 220);
  strokeWeight(2);
  rect(rectX, rectY, rectW, rectH, 0);
  noStroke();

  let innerPad = 24;
  let leftPanelW = rectW * 0.52;
  let divX = rectX + leftPanelW;
  let xLeft = rectX + innerPad;
  let xRight = divX + innerPad;
  let rightPanelW = rectW - leftPanelW - innerPad * 2;

  // Titre COSMIC SURVIVOR
  fill(255, 200, 80);
  textSize(26);
  textAlign(CENTER, TOP);
  text("COSMIC SURVIVOR", rectX + rectW / 2, rectY + 14);
  textAlign(LEFT, TOP);
  stroke(80, 140, 220);
  strokeWeight(1);
  line(rectX + 20, rectY + 46, rectX + rectW - 20, rectY + 46);
  noStroke();

  let y = rectY + 56;

  // --- Panneau gauche (tailles de texte encore augmentées) ---
  fill(80, 160, 255);
  textSize(12);
  text("Concept", xLeft, y);
  y += 24;
  fill(255);
  textSize(10);
  text("Collectez 5 etoiles/niveau. Evitez monstres et asteroides.", xLeft, y, leftPanelW - innerPad * 2, 48);
  y += 40;
  fill(80, 160, 255);
  textSize(12);
  text("Controles", xLeft, y);
  y += 24;
  fill(255);
  textSize(10);
  text("Souris: deplacer | Espace: snake/banc etoiles | D: Debug | P/Echap: Pause", xLeft, y, leftPanelW - innerPad * 2, 36);
  y += 32;
  fill(80, 160, 255);
  textSize(12);
  text("Mode", xLeft, y);
  y += 26;

  let modeLabels = ["Normal", "Facile", "Moyen", "Difficile"];
  let modeColors = [color(120, 240, 140), color(255, 200, 80), color(255, 140, 60), color(255, 80, 80)];
  let btnH = 32;
  let gap = 12;
  let availableW = leftPanelW - innerPad * 2;
  let btnW = (availableW - gap * 3) / 4;
  menuModeButtonBounds = [];
  for (let i = 0; i < 4; i++) {
    let bx = xLeft + i * (btnW + gap);
    menuModeButtonBounds.push({ x: bx, y: y, w: btnW, h: btnH });
    let sel = difficultyMode === modeLabels[i].toLowerCase();
    fill(modeColors[i]);
    if (sel) stroke(255); else stroke(100);
    strokeWeight(1);
    rect(bx, y, btnW, btnH, 0);
    fill(0);
    noStroke();
    textSize(10);
    textAlign(CENTER, CENTER);
    text(modeLabels[i], bx + btnW / 2, y + btnH / 2);
    textAlign(LEFT, TOP);
  }
  y += btnH + 20;

  let monsterInfos = getModeMonsterDescription(difficultyMode);
  let iconSize = 28;
  let heartSize = 16;
  for (let i = 0; i < monsterInfos.length; i++) {
    let m = monsterInfos[i];
    fill(255, 100, 100);
    textSize(10);
    text(m.name + " (Niv. " + m.nivRange + ")", xLeft, y + 2);
    let img = m.img;
    if (img && img.width) {
      imageMode(CORNER);
      image(img, xLeft, y + 18, iconSize, iconSize);
    }
    let heartX = xLeft + iconSize + 10;
    imageMode(CORNER);
    for (let h = 0; h < m.hearts; h++) {
      if (imgFullHeart && imgFullHeart.width) {
        image(imgFullHeart, heartX + h * (heartSize + 2), y + 16, heartSize, heartSize);
      } else {
        fill(255, 80, 80);
        noStroke();
        rect(heartX + h * (heartSize + 2), y + 16, heartSize, heartSize);
      }
    }
    fill(255);
    textSize(9);
    text(m.desc, xLeft + iconSize + 10 + m.hearts * (heartSize + 2) + 8, y + 18, leftPanelW - iconSize - 80, 32);
    y += 46;
  }
  y += 12;
  fill(80, 160, 255);
  textSize(12);
  text("Progression", xLeft, y);
  y += 24;
  fill(255);
  textSize(10);
  text("20 niveaux | 5 etoiles/niveau | +1 ennemi | Vie + Boucliers", xLeft, y, leftPanelW - innerPad * 2, 40);

  stroke(80, 140, 220);
  strokeWeight(1);
  let botPad = 70;
  line(divX, rectY + 44, divX, rectY + rectH - botPad);
  noStroke();

  // --- Panneau droit: Meilleurs Scores (médailles 1-2-3, puis nombres 4-10, trait sous en-têtes) ---
  y = rectY + 56;
  fill(255, 180, 80);
  textSize(12);
  textAlign(CENTER, TOP);
  text("Meilleurs Scores", xRight + rightPanelW / 2, y);
  textAlign(LEFT, TOP);
  y += 30;
  let numCols = 6;
  let colW = rightPanelW / numCols;
  let colX = [0, 1, 2, 3, 4, 5].map(function (i) { return xRight + i * colW + 6; });
  fill(255, 180, 80);
  textSize(10);
  text("#", colX[0], y);
  text("Score", colX[1], y);
  text("Niv.", colX[2], y);
  text("Tps", colX[3], y);
  text("Eto.", colX[4], y);
  text("Mode", colX[5], y);
  y += 20;
  stroke(80, 140, 220);
  strokeWeight(1);
  line(xRight, y + 4, xRight + rightPanelW, y + 4);
  noStroke();
  y += 14;
  let scores = getBestScores();
  let medalColors = [color(255, 215, 0), color(192, 192, 192), color(205, 127, 50)];
  let medalRadius = 11;
  let rankCenterX = colX[0] + colW / 2 - 6;
  for (let i = 0; i < min(10, scores.length); i++) {
    let r = scores[i];
    let rowMidY = y + 14;
    if (i < 3) {
      fill(medalColors[i]);
      noStroke();
      circle(rankCenterX, rowMidY, medalRadius * 2);
      fill(0);
      textSize(9);
      textAlign(CENTER, CENTER);
      text(str(i + 1), rankCenterX, rowMidY);
      textAlign(LEFT, TOP);
    } else {
      fill(255);
      textSize(10);
      textAlign(CENTER, TOP);
      text(str(i + 1), rankCenterX, y + 5);
      textAlign(LEFT, TOP);
    }
    fill(255);
    textSize(10);
    text(str(r.score != null ? r.score : 0), colX[1], y + 5);
    text(str(r.niv != null ? r.niv : 0) + "/20", colX[2], y + 5);
    text(str(r.time != null ? r.time : 0) + "s", colX[3], y + 5);
    text(str(r.etoiles != null ? r.etoiles : 0), colX[4], y + 5);
    text((r.mode || "Normal").substring(0, 8), colX[5], y + 5);
    y += 28;
  }

  let playLabel = (score > 0 || timeSurvived > 0 || currentLevel > 1) ? "REPRENDRE" : "JOUER";
  let playW = 200;
  let playH = 48;
  let playX = rectX + (rectW - playW) / 2;
  let playY = rectY + rectH - playH - 20;
  menuPlayButtonBounds = { x: playX, y: playY, w: playW, h: playH };
  fill(60, 200, 100);
  stroke(180, 255, 180);
  strokeWeight(1);
  rect(playX, playY, playW, playH, 0);
  fill(255);
  noStroke();
  textSize(14);
  textAlign(CENTER, CENTER);
  text(playLabel, playX + playW / 2, playY + playH / 2);
  textAlign(LEFT, TOP);

  pop();
}

function getModeMonsterDescription(mode) {
  let list = [];
  if (mode === "normal") {
    list = [
      { name: "Monstre 0", nivRange: "0-4", img: imgMonster0, hearts: 1, desc: "Lent mais vigilant. Vision: 300px." },
      { name: "Monstre 1", nivRange: "5-9", img: imgMonster1, hearts: 2, desc: "Rapide et dangereux. Vision: 200px." },
      { name: "Monstre Max", nivRange: "10-14", img: imgMonsterMax, hearts: 3, desc: "Mortel mais myope. Vision: 130px." },
      { name: "Serpent", nivRange: "15-19", img: imgMonsterSnake, hearts: 4, desc: "Boss mortel au contact. Vision: 20px." }
    ];
  } else if (mode === "facile") {
    list = [
      { name: "Monstre 0", nivRange: "0-19", img: imgMonster0, hearts: 1, desc: "Lent mais vigilant. Vision: 300px." }
    ];
  } else if (mode === "moyen") {
    list = [
      { name: "Monstre 1", nivRange: "0-9", img: imgMonster1, hearts: 2, desc: "Rapide et dangereux. Vision: 200px." },
      { name: "Monstre Max", nivRange: "10-19", img: imgMonsterMax, hearts: 3, desc: "Mortel mais myope. Vision: 130px." }
    ];
  } else {
    list = [
      { name: "Monstre Max", nivRange: "0-9", img: imgMonsterMax, hearts: 3, desc: "Mortel mais myope. Vision: 130px." },
      { name: "Serpent", nivRange: "10-19", img: imgMonsterSnake, hearts: 4, desc: "Boss mortel au contact. Vision: 20px." }
    ];
  }
  return list;
}

function drawLevelUpScreen() {
  push();
  fill(0, 0, 0, 140);
  noStroke();
  rect(0, 0, width, height);
  let blink = sin(levelUpTimer * 0.2) > 0;
  if (blink) {
    fill(255, 255, 0);
    textSize(36);
    textAlign(CENTER, CENTER);
    text("NIVEAU " + currentLevel, width / 2, height / 2 - 40);
  }
  if (levelUpTimer > 60) {
    fill(255);
    textSize(24);
    textAlign(CENTER, CENTER);
    text("C'est parti, on continue !", width / 2, height / 2 + 50);
  }
  pop();
}

function drawCountdownScreen() {
  push();
  fill(0, 0, 0, 120);
  noStroke();
  rect(0, 0, width, height);
  fill(255, 255, 0);
  textSize(14);
  textAlign(CENTER, CENTER);
  text(countdownNumber > 0 ? str(countdownNumber) : "GO!", width / 2, height / 2);
  pop();
}

function drawVictoryScreen() {
  push();
  fill(0, 0, 0, min(victoryTimer * 2, 200));
  noStroke();
  rect(0, 0, width, height);
  if (victoryTimer > 60) {
    fill(255, 215, 0);
    textSize(42);
    textAlign(CENTER, CENTER);
    text("BRAVO !", width / 2, height / 2 - 50);
    fill(255);
    textSize(24);
    text("Vous avez conquis les 20 niveaux !", width / 2, height / 2 + 20);
    text("Score: " + score + "  |  Temps: " + floor(timeSurvived) + "s", width / 2, height / 2 + 60);
    textSize(18);
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
  textSize(6);
  textAlign(LEFT);
  text("B. Radius (50px)", 55, 44);
  let debugX = width - 68;
  let debugY = 38;
  fill(0, 255, 120, 200);
  textSize(6);
  text("FPS: " + floor(frameRate()), debugX, debugY);
  text("Obstacles: " + obstacles.length, debugX, debugY + 12);
  text("Hunters: " + hunters.length, debugX, debugY + 24);
  text("Checkpoints: " + checkpoints.length, debugX, debugY + 36);
  pop();
}

function getBestScores() {
  try {
    let raw = localStorage.getItem("cosmicSurvivorBestScores");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) { return []; }
}

function saveScore() {
  let list = getBestScores();
  list.push({
    mode: difficultyMode,
    score: score,
    time: floor(timeSurvived),
    niv: currentLevel,
    etoiles: starsCollected
  });
  list.sort((a, b) => (b.score - a.score));
  list = list.slice(0, 10);
  try {
    localStorage.setItem("cosmicSurvivorBestScores", JSON.stringify(list));
  } catch (e) {}
}

function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    bgGain = audioCtx.createGain();
    bgGain.gain.value = 0.25;
    bgGain.connect(audioCtx.destination);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.4;
    sfxGain.connect(audioCtx.destination);
  } catch (e) {}
}

function startBgMusic() {
  if (!audioCtx || !bgGain) return;
  try {
    let osc1 = audioCtx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime);
    osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.5);
    osc1.frequency.setValueAtTime(783.99, audioCtx.currentTime + 1);
    osc1.connect(bgGain);
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 1.5);
  } catch (e) {}
}

function playSfx(name) {
  if (!audioCtx || !sfxGain) return;
  try {
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(sfxGain);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    if (name === "collect") { osc.frequency.setValueAtTime(880, audioCtx.currentTime); osc.type = "sine"; }
    else if (name === "damage") { osc.frequency.setValueAtTime(150, audioCtx.currentTime); osc.type = "sawtooth"; }
    else if (name === "levelup") { osc.frequency.setValueAtTime(600, audioCtx.currentTime); osc.type = "sine"; }
    else if (name === "victory") { osc.frequency.setValueAtTime(800, audioCtx.currentTime); osc.type = "sine"; }
    else if (name === "gameover") { osc.frequency.setValueAtTime(120, audioCtx.currentTime); osc.type = "sawtooth"; }
    else return;
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {}
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Régénérer les étoiles pour la nouvelle taille
  generateStars();
  // Recréer les éléments pour s'adapter à la nouvelle taille
  createCheckpoints();
  createObstacles();
}

function keyPressed() {
  if (key === " ") {
    if (player && player.starFollowMode !== undefined) {
      player.starFollowMode = player.starFollowMode === "snake" ? "flock" : "snake";
    }
    return false;
  }
  if (key === "p" || key === "P" || keyCode === ESCAPE) {
    if (gameState === "playing") {
      gameState = "menu";
      if (audioCtx) try { bgGain && bgGain.gain.setValueAtTime(0, audioCtx.currentTime); } catch (e) {}
    }
    return false;
  }
  if (key === "e" || key === "E") {
    for (let hunter of hunters) hunter.activateEvade(300);
  }
  if (key === "d" || key === "D") debugMode = !debugMode;
  return false;
}

function mousePressed() {
  let pauseW = 56, pauseH = 22, debugW = 56, debugH = 22, gap = 6, btnY = 10;
  let pauseX = width - pauseW - debugW - gap - 14;
  let debugX = width - debugW - 12;
  if (mouseX >= pauseX && mouseX <= pauseX + pauseW && mouseY >= btnY && mouseY <= btnY + pauseH) {
    if (gameState === "playing") {
      gameState = "menu";
      if (audioCtx && bgGain) try { bgGain.gain.setValueAtTime(0, audioCtx.currentTime); } catch (e) {}
    }
    return;
  }
  if (mouseX >= debugX && mouseX <= debugX + debugW && mouseY >= btnY && mouseY <= btnY + debugH) {
    debugMode = !debugMode;
    return;
  }

  if (gameState === "menu") {
    for (let i = 0; i < menuModeButtonBounds.length; i++) {
      let b = menuModeButtonBounds[i];
      if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
        difficultyMode = ["normal", "facile", "moyen", "difficile"][i];
        return;
      }
    }
    if (menuPlayButtonBounds && mouseX >= menuPlayButtonBounds.x && mouseX <= menuPlayButtonBounds.x + menuPlayButtonBounds.w && mouseY >= menuPlayButtonBounds.y && mouseY <= menuPlayButtonBounds.y + menuPlayButtonBounds.h) {
      initAudio();
      let isResume = score > 0 || timeSurvived > 0 || currentLevel > 0;
      if (!isResume) {
        score = 0;
        timeSurvived = 0;
        starsCollected = 0;
        currentLevel = 0;
        nbHunters = 1;
        collectables = [];
        particles = [];
        setup();
      }
      gameState = "countdown";
      countdownNumber = 3;
      countdownTimer = 0;
      return;
    }
    return;
  }

  if (gameState === "gameover" || gameState === "victory") {
    saveScore();
    score = 0;
    timeSurvived = 0;
    starsCollected = 0;
    currentLevel = 0;
    nbHunters = 1;
    collectables = [];
    particles = [];
    setup();
    gameState = "menu";
  }
}


// Système de particules pour effets visuels
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
    this.vel.mult(0.95); // Friction
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

// Classe pour les collectables (bouclier et cœur) - utilise les images Assets
class Collectable {
  constructor(x, y, type) {
    this.pos = createVector(x, y);
    this.r = 25;
    this.type = type; // "heart" ou "shield"
    this.pulse = 0;
    this.lifetime = 600; // Disparaît après 10 secondes
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
