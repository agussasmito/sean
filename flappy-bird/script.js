const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const restartBtn = document.getElementById('restart-btn');

// ===== Sound System (Web Audio API) =====
let audioCtx = null;

function ensureAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playFlapSound() {
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.12);
}

function playScoreSound() {
    ensureAudio();
    // Two quick ascending tones
    [0, 0.08].forEach((delay, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(i === 0 ? 520 : 780, audioCtx.currentTime + delay);

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.1);

        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.1);
    });
}

function playHitSound() {
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.25);
}

function playDieSound() {
    ensureAudio();
    // Descending tone after a short delay
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    const t = audioCtx.currentTime + 0.15;
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.4);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

    osc.start(t);
    osc.stop(t + 0.45);
}

// Power-up sounds
function playGhostSound() {
    ensureAudio();
    [0, 0.06, 0.12].forEach((d, i) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(600 + i * 200, audioCtx.currentTime + d);
        g.gain.setValueAtTime(0.15, audioCtx.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + d + 0.12);
        o.start(audioCtx.currentTime + d); o.stop(audioCtx.currentTime + d + 0.12);
    });
}

function playBombSound() {
    ensureAudio();
    const bufSize = audioCtx.sampleRate * 0.3;
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const src = audioCtx.createBufferSource(), g = audioCtx.createGain();
    src.buffer = buf; src.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.4, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    src.start(); src.stop(audioCtx.currentTime + 0.3);
    // Low boom
    const o = audioCtx.createOscillator(), g2 = audioCtx.createGain();
    o.connect(g2); g2.connect(audioCtx.destination); o.type = 'sine';
    o.frequency.setValueAtTime(80, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.3);
    g2.gain.setValueAtTime(0.3, audioCtx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
    o.start(); o.stop(audioCtx.currentTime + 0.35);
}

function playPointsSound() {
    ensureAudio();
    [0, 0.07, 0.14].forEach((d, i) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination); o.type = 'square';
        o.frequency.setValueAtTime([523, 659, 784][i], audioCtx.currentTime + d);
        g.gain.setValueAtTime(0.12, audioCtx.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + d + 0.1);
        o.start(audioCtx.currentTime + d); o.stop(audioCtx.currentTime + d + 0.1);
    });
}

// Game constants (Baseline reference = 1.0)
const ORIGINAL_GRAVITY = 0.125;
const ORIGINAL_FLAP_SPEED = -3.9;
const ORIGINAL_PIPE_SPEED = 1.2;
const ORIGINAL_SPAWN_RATE = 166;

// Scaled constants (set to 1.0 for original standard gameplay)
const SPEED_SCALE = 1.0;

const GRAVITY = ORIGINAL_GRAVITY * SPEED_SCALE;
const FLAP_SPEED = ORIGINAL_FLAP_SPEED * SPEED_SCALE;
const PIPE_SPEED = ORIGINAL_PIPE_SPEED * SPEED_SCALE;
const SPAWN_RATE = Math.round(ORIGINAL_SPAWN_RATE / SPEED_SCALE);

const PIPE_WIDTH = 50;
const PIPE_GAP = 140;
const BIRD_RADIUS = 12;
const POWERUP_CHANCE = 0.25;
const POWERUP_RADIUS = 14;
const POWERUP_TYPES = ['ghost', 'bomb', 'points'];

// Game state
let frames = 0;
let score = 0;
let bestScore = localStorage.getItem('flappyBestScore') || 0;
let currentState = 'START';

// Power-up state
let powerups = [];
let ghostPipesLeft = 0;
let particles = [];

// Bird object
const bird = {
    x: 50,
    y: 200,
    velocity: 0,
    radius: BIRD_RADIUS,
    
    draw() {
        ctx.save();
        if (ghostPipesLeft > 0) ctx.globalAlpha = 0.35 + Math.sin(Date.now() / 100) * 0.15;
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x + 4, this.y - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x + 5, this.y - 4, 2, 0, Math.PI * 2);
        ctx.fill();
        // Beak
        ctx.fillStyle = '#e67e22';
        ctx.beginPath();
        ctx.moveTo(this.x + 8, this.y);
        ctx.lineTo(this.x + 16, this.y + 4);
        ctx.lineTo(this.x + 8, this.y + 8);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    },
    
    update() {
        this.velocity += GRAVITY;
        this.y += this.velocity;
        
        // Floor collision
        if (this.y + this.radius >= canvas.height - 112) {
            this.y = canvas.height - 112 - this.radius;
            playHitSound();
            gameOver();
        }
        
        // Ceiling collision
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.velocity = 0;
        }
    },
    
    flap() {
        this.velocity = FLAP_SPEED;
        playFlapSound();
    },
    
    reset() {
        this.y = 200;
        this.velocity = 0;
    }
};

// Pipes array
const pipes = [];

function drawGround() {
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, canvas.height - 112, canvas.width, 112);
    
    // Top border of ground
    ctx.fillStyle = '#73bf2e';
    ctx.fillRect(0, canvas.height - 112, canvas.width, 12);
    ctx.strokeStyle = '#558c22';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, canvas.height - 112, canvas.width, 12);
}

function drawBackground() {
    ctx.fillStyle = '#70c5ce';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw some simple clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(100, 100, 20, 0, Math.PI * 2);
    ctx.arc(120, 100, 25, 0, Math.PI * 2);
    ctx.arc(140, 100, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(300, 150, 25, 0, Math.PI * 2);
    ctx.arc(330, 150, 30, 0, Math.PI * 2);
    ctx.arc(360, 150, 25, 0, Math.PI * 2);
    ctx.fill();
}

// ===== Power-up drawing =====
function drawPowerup(pu) {
    const cx = pu.x, cy = pu.y, r = POWERUP_RADIUS;
    ctx.save();
    // Floating bob
    const bob = Math.sin(Date.now() / 200 + pu.x) * 3;
    const dy = cy + bob;
    // Glow
    ctx.shadowColor = pu.type === 'ghost' ? '#00e5ff' : pu.type === 'bomb' ? '#ff5722' : '#ffd600';
    ctx.shadowBlur = 12;
    // Circle background
    ctx.beginPath();
    ctx.arc(cx, dy, r, 0, Math.PI * 2);
    ctx.fillStyle = pu.type === 'ghost' ? '#00bcd4' : pu.type === 'bomb' ? '#d32f2f' : '#ffc107';
    ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.shadowBlur = 0;
    // Icon
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px sans-serif';
    if (pu.type === 'ghost') {
        // Ghost icon: simple ghost shape
        ctx.font = '16px sans-serif';
        ctx.fillText('👻', cx, dy);
    } else if (pu.type === 'bomb') {
        ctx.font = '16px sans-serif';
        ctx.fillText('💣', cx, dy);
    } else {
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('+3', cx, dy + 1);
    }
    ctx.restore();
}

function spawnExplosion(px, py) {
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        particles.push({
            x: px, y: py,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: 40 + Math.random() * 20,
            color: ['#ff5722','#ff9800','#ffc107','#fff'][Math.floor(Math.random()*4)],
            r: 2 + Math.random() * 3
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx; pt.y += pt.vy; pt.life--; pt.r *= 0.97;
        if (pt.life <= 0) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = pt.life / 60;
        ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

function handlePipes() {
    if (frames % SPAWN_RATE === 0) {
        const topHeight = Math.random() * (canvas.height - 112 - PIPE_GAP - 60) + 30;
        const newPipe = {
            x: canvas.width,
            topHeight: topHeight,
            bottomY: topHeight + PIPE_GAP,
            passed: false,
            destroyed: false
        };
        pipes.push(newPipe);
        // 25% chance to spawn a power-up in the gap
        if (Math.random() < POWERUP_CHANCE) {
            const puType = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
            powerups.push({
                x: canvas.width + PIPE_WIDTH / 2,
                y: topHeight + PIPE_GAP / 2,
                type: puType,
                collected: false
            });
        }
    }
    
    for (let i = 0; i < pipes.length; i++) {
        let p = pipes[i];
        p.x -= PIPE_SPEED;
        
        if (p.destroyed) {
            // Skip drawing destroyed pipes, still count score
            if (p.x + PIPE_WIDTH < bird.x && !p.passed) {
                score++; scoreDisplay.innerText = score; p.passed = true; playScoreSound();
            }
            if (p.x + PIPE_WIDTH < -10) { pipes.splice(i, 1); i--; }
            continue;
        }
        
        // Draw pipes
        ctx.fillStyle = '#73bf2e';
        ctx.strokeStyle = '#558c22'; ctx.lineWidth = 2;
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
        ctx.strokeRect(p.x, 0, PIPE_WIDTH, p.topHeight);
        ctx.fillRect(p.x - 2, p.topHeight - 20, PIPE_WIDTH + 4, 20);
        ctx.strokeRect(p.x - 2, p.topHeight - 20, PIPE_WIDTH + 4, 20);
        let bottomHeight = canvas.height - 112 - p.bottomY;
        ctx.fillRect(p.x, p.bottomY, PIPE_WIDTH, bottomHeight);
        ctx.strokeRect(p.x, p.bottomY, PIPE_WIDTH, bottomHeight);
        ctx.fillRect(p.x - 2, p.bottomY, PIPE_WIDTH + 4, 20);
        ctx.strokeRect(p.x - 2, p.bottomY, PIPE_WIDTH + 4, 20);
        
        // Collision (skip if ghost)
        if (ghostPipesLeft <= 0) {
            let hitTop = bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + PIPE_WIDTH && bird.y - bird.radius < p.topHeight;
            let hitBottom = bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + PIPE_WIDTH && bird.y + bird.radius > p.bottomY;
            if (hitTop || hitBottom) { playHitSound(); gameOver(); }
        }
        
        // Score & ghost counter
        if (p.x + PIPE_WIDTH < bird.x && !p.passed) {
            score++; scoreDisplay.innerText = score; p.passed = true; playScoreSound();
            if (ghostPipesLeft > 0) ghostPipesLeft--;
        }
        
        if (p.x + PIPE_WIDTH < -10) { pipes.splice(i, 1); i--; }
    }
    
    // Handle power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
        const pu = powerups[i];
        pu.x -= PIPE_SPEED;
        if (pu.collected || pu.x + POWERUP_RADIUS < -10) { powerups.splice(i, 1); continue; }
        drawPowerup(pu);
        // Collision with bird
        const dx = bird.x - pu.x, dy = bird.y - pu.y;
        if (Math.sqrt(dx*dx + dy*dy) < bird.radius + POWERUP_RADIUS) {
            pu.collected = true;
            activatePowerup(pu.type, pu.x, pu.y);
            powerups.splice(i, 1);
        }
    }
    
    updateParticles();
}

function activatePowerup(type, px, py) {
    if (type === 'ghost') {
        if (ghostPipesLeft <= 0) {
            playGhostSound();
        } else {
            // Play a short refresh tone to indicate state renewal without compounding audio overhead
            ensureAudio();
            const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
            osc.connect(g); g.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            g.gain.setValueAtTime(0.1, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
            osc.start(); osc.stop(audioCtx.currentTime + 0.08);
        }
        ghostPipesLeft = 3;
    } else if (type === 'bomb') {
        playBombSound();
        // Destroy up to 2 pipes ahead of bird
        let destroyed = 0;
        for (let p of pipes) {
            if (p.x > bird.x && !p.destroyed && destroyed < 2) {
                p.destroyed = true;
                spawnExplosion(p.x + PIPE_WIDTH / 2, p.topHeight);
                spawnExplosion(p.x + PIPE_WIDTH / 2, p.bottomY);
                destroyed++;
            }
        }
    } else if (type === 'points') {
        playPointsSound();
        score += 3;
        scoreDisplay.innerText = score;
    }
}

function resetGame() {
    bird.reset();
    pipes.length = 0;
    powerups.length = 0;
    particles.length = 0;
    ghostPipesLeft = 0;
    score = 0;
    frames = 0;
    scoreDisplay.innerText = score;
    currentState = 'START';
    
    startScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    scoreDisplay.classList.add('hidden');
}

function gameOver() {
    if (currentState === 'GAMEOVER') return; // prevent double-trigger
    currentState = 'GAMEOVER';
    playDieSound();
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('flappyBestScore', bestScore);
    }
    
    finalScoreEl.innerText = score;
    bestScoreEl.innerText = bestScore;
    
    gameOverScreen.classList.remove('hidden');
    scoreDisplay.classList.add('hidden');
}

function drawAllPipes() {
    for (let p of pipes) {
        if (p.destroyed) continue;
        ctx.fillStyle = '#73bf2e';
        ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
        ctx.strokeRect(p.x, 0, PIPE_WIDTH, p.topHeight);
        ctx.fillRect(p.x - 2, p.topHeight - 20, PIPE_WIDTH + 4, 20);
        ctx.strokeRect(p.x - 2, p.topHeight - 20, PIPE_WIDTH + 4, 20);
        let bottomHeight = canvas.height - 112 - p.bottomY;
        ctx.fillRect(p.x, p.bottomY, PIPE_WIDTH, bottomHeight);
        ctx.strokeRect(p.x, p.bottomY, PIPE_WIDTH, bottomHeight);
        ctx.fillRect(p.x - 2, p.bottomY, PIPE_WIDTH + 4, 20);
        ctx.strokeRect(p.x - 2, p.bottomY, PIPE_WIDTH + 4, 20);
    }
}

function loop() {
    drawBackground();
    
    if (currentState === 'PLAYING') {
        handlePipes();
        drawGround();
        // Ghost indicator
        if (ghostPipesLeft > 0) {
            ctx.save(); ctx.fillStyle = 'rgba(0,229,255,0.15)';
            ctx.fillRect(0, 0, canvas.width, canvas.height - 112); ctx.restore();
            ctx.save(); ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'left'; ctx.fillText('👻 Ghost: ' + ghostPipesLeft + ' pipes', 10, 30); ctx.restore();
        }
        bird.update();
        bird.draw();
        frames++;
    } else if (currentState === 'START') {
        drawGround();
        // Hover animation
        bird.y = 200 + Math.sin(Date.now() / 200) * 5;
        bird.draw();
    } else if (currentState === 'GAMEOVER') {
        drawAllPipes();
        drawGround();
        bird.draw();
    }
    
    requestAnimationFrame(loop);
}

// Input handling
function handleInput(e) {
    if (e.type === 'keydown' && e.code !== 'Space') return;
    
    if (currentState === 'START') {
        currentState = 'PLAYING';
        startScreen.classList.add('hidden');
        scoreDisplay.classList.remove('hidden');
        bird.flap();
    } else if (currentState === 'PLAYING') {
        bird.flap();
    }
}

window.addEventListener('keydown', handleInput);
window.addEventListener('mousedown', handleInput);
window.addEventListener('touchstart', handleInput, {passive: false});

restartBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent triggering the game start immediately
    resetGame();
});

// Prevent default touch behavior to avoid scrolling
document.addEventListener('touchmove', function(e) {
    if (currentState === 'PLAYING') {
        e.preventDefault();
    }
}, { passive: false });

// Start loop
loop();
