// ==========================================
//  PERSENTASE GELAS - MAIN SCRIPT
// ==========================================

// --- Constants & Config ---
const LIQUID_COLORS = [
    '#FF6B9D', // pink
    '#FFA726', // orange
    '#FFEE58', // yellow
    '#66BB6A', // green
    '#42A5F5', // blue
    '#AB47BC', // purple
    '#26C6DA', // cyan
    '#EF5350', // red
    '#7E57C2', // deep purple
    '#FF7043', // deep orange
    '#29B6F6', // light blue
    '#9CCC65', // light green
    '#EC407A', // rose
    '#5C6BC0', // indigo
    '#FFCA28', // amber
];

const EMOJI_STICKERS = ['⭐', '🌈', '💖', '🎈', '🦄', '🌸', '🍭', '🎀', '✨', '🫧'];

// --- State ---
let animTime = 0;
let animFrameId = null;
let currentGlasses = [];
let canvas, ctx;
let canvasWidth = 0, canvasHeight = 0;

// --- DOM References ---
const percentInput = document.getElementById('percentInput');
const percentSlider = document.getElementById('percentSlider');
const showBtn = document.getElementById('showBtn');
const infoDisplay = document.getElementById('infoDisplay');
const canvasSection = document.getElementById('canvas-section');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('glassCanvas');
    ctx = canvas.getContext('2d');

    setupCanvas();
    setupEventListeners();
    createBackgroundDecorations();
    visualize();

    window.addEventListener('resize', () => {
        setupCanvas();
        drawFrame();
    });
});

function setupCanvas() {
    const rect = canvasSection.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvasWidth = rect.width;
    canvasHeight = rect.height;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function setupEventListeners() {
    // Sync input and slider
    percentInput.addEventListener('input', () => {
        let val = parseInt(percentInput.value) || 0;
        val = Math.max(0, Math.min(10000, val));
        percentSlider.value = val;
    });

    percentSlider.addEventListener('input', () => {
        percentInput.value = percentSlider.value;
    });

    // Enter key triggers visualization
    percentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            visualize();
        }
    });

    // Slider change triggers visualization
    percentSlider.addEventListener('change', () => {
        percentInput.value = percentSlider.value;
        visualize();
    });
}

// --- Background Decorations ---
function createBackgroundDecorations() {
    const container = document.getElementById('decorations');
    const count = 20;

    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.classList.add('deco-bubble');

        const isStar = Math.random() > 0.5;
        if (isStar) {
            el.classList.add('star');
            el.textContent = EMOJI_STICKERS[Math.floor(Math.random() * EMOJI_STICKERS.length)];
        } else {
            el.classList.add('circle');
        }

        const size = 16 + Math.random() * 32;
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.fontSize = size * 0.7 + 'px';
        el.style.left = Math.random() * 100 + '%';
        el.style.animationDuration = (12 + Math.random() * 20) + 's';
        el.style.animationDelay = (Math.random() * 15) + 's';

        container.appendChild(el);
    }
}

// --- Core Visualization ---
function visualize() {
    let value = parseInt(percentInput.value);

    // Validate
    if (isNaN(value) || value < 0) value = 0;
    if (value > 10000) value = 10000;

    percentInput.value = value;
    percentSlider.value = value;

    // Calculate glasses
    const fullGlasses = Math.floor(value / 100);
    const remainder = value % 100;
    const totalGlasses = fullGlasses + (remainder > 0 ? 1 : 0);
    const displayTotal = Math.max(totalGlasses, value === 0 ? 1 : 0);

    // Build glass data
    const oldGlasses = [...currentGlasses];
    currentGlasses = [];
    for (let i = 0; i < fullGlasses; i++) {
        currentGlasses.push({
            fillPercent: 100,
            color: LIQUID_COLORS[i % LIQUID_COLORS.length],
            index: i,
        });
    }
    if (remainder > 0) {
        currentGlasses.push({
            fillPercent: remainder,
            color: LIQUID_COLORS[fullGlasses % LIQUID_COLORS.length],
            index: fullGlasses,
        });
    }
    if (value === 0) {
        currentGlasses.push({
            fillPercent: 0,
            color: LIQUID_COLORS[0],
            index: 0,
        });
    }

    // Preserve animation state for smooth transitions
    for (let i = 0; i < currentGlasses.length; i++) {
        const glass = currentGlasses[i];
        const old = oldGlasses.find(g => g.index === glass.index);
        if (old) {
            glass.currentFill = old.currentFill !== undefined ? old.currentFill : 0;
            glass.scale = old.scale !== undefined ? old.scale : 1;
            glass.animDelay = 0;
        } else {
            glass.currentFill = 0;
            glass.scale = 0; // for pop-in effect
            // Stagger animation for new glasses
            glass.animDelay = Math.max(0, i - oldGlasses.length) * 2;
        }
    }

    // Update info display
    updateInfoDisplay(value, fullGlasses, remainder, currentGlasses.length);

    // Animate button
    showBtn.style.transform = 'scale(0.9)';
    setTimeout(() => { showBtn.style.transform = ''; }, 150);

    // Start animation loop if not running
    if (!animFrameId) {
        animLoop();
    }
}

function updateInfoDisplay(value, fullGlasses, remainder, totalGlasses) {
    let html = '';

    if (value === 0) {
        html = `<span class="highlight pink">0%</span> — Gelas kosong! 😢`;
    } else if (remainder === 0) {
        html = `<span class="highlight pink">${value}%</span> = `;
        html += `<span class="highlight purple">${fullGlasses} gelas</span> penuh! 🎉`;
    } else if (fullGlasses === 0) {
        html = `<span class="highlight pink">${value}%</span> = `;
        html += `<span class="highlight orange">1 gelas</span> terisi `;
        html += `<span class="highlight blue">${remainder}%</span> 🥤`;
    } else {
        html = `<span class="highlight pink">${value}%</span> = `;
        html += `<span class="highlight purple">${fullGlasses} gelas</span> penuh + `;
        html += `<span class="highlight orange">1 gelas</span> terisi `;
        html += `<span class="highlight blue">${remainder}%</span> 🥤`;
    }

    html += `<br><span style="font-size:0.85em; color:#6b5b8a;">Total: <span class="highlight green">${totalGlasses} gelas</span> ditampilkan</span>`;

    infoDisplay.innerHTML = html;
    infoDisplay.classList.add('visible');
}

// --- Animation Loop ---
function animLoop() {
    animTime += 0.03;
    drawFrame();
    animFrameId = requestAnimationFrame(animLoop);
}

function drawFrame() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (currentGlasses.length === 0) return;

    const total = currentGlasses.length;
    const GLASS_ASPECT = 0.55; // width / height ratio (consistent tall glass shape)
    const layout = calcLayout(total, canvasWidth, canvasHeight, GLASS_ASPECT);

    for (let i = 0; i < total; i++) {
        const col = i % layout.cols;
        const row = Math.floor(i / layout.cols);
        const x = layout.offsetX + col * layout.cellW;
        const y = layout.offsetY + row * layout.cellH;
        const cx = x + layout.cellW / 2;
        const cy = y + layout.cellH / 2;
        const glass = currentGlasses[i];

        // Animate scale and fill
        if (glass.animDelay > 0) {
            glass.animDelay--;
        } else {
            // Elastic pop-in effect for scale
            glass.scale += (1 - glass.scale) * 0.2;
            
            // Smooth liquid fill
            glass.currentFill += (glass.fillPercent - glass.currentFill) * 0.15;
            
            if (Math.abs(glass.fillPercent - glass.currentFill) < 0.5) glass.currentFill = glass.fillPercent;
            if (Math.abs(1 - glass.scale) < 0.01) glass.scale = 1;
        }

        if (glass.scale > 0.01) {
            ctx.save();
            // Transform for pop-in scaling from center
            ctx.translate(cx, cy);
            ctx.scale(glass.scale, glass.scale);
            ctx.translate(-cx, -cy);
            
            drawGlass(ctx, x, y, layout.cellW, layout.cellH, layout.glassW, layout.glassH, glass.currentFill, glass.color, glass.index, total);
            
            ctx.restore();
        }
    }
}

// --- Layout Calculation (fixed aspect ratio) ---
function calcLayout(count, canvasW, canvasH, glassAspect) {
    if (count <= 0) count = 1;

    let bestCols = 1;
    let bestSize = 0; // maximize glass height

    // Try every possible column count to find the one that yields the largest glass
    for (let c = 1; c <= count; c++) {
        const r = Math.ceil(count / c);

        // Available space per cell
        const cellW = canvasW / c;
        const cellH = canvasH / r;

        // Glass must fit within cell with padding (80% of cell used)
        const usableW = cellW * 0.82;
        const usableH = cellH * 0.80;

        // Glass size constrained by both dimensions, maintaining aspect ratio
        let gh = usableH;
        let gw = gh * glassAspect;

        if (gw > usableW) {
            gw = usableW;
            gh = gw / glassAspect;
        }

        if (gh > bestSize) {
            bestSize = gh;
            bestCols = c;
        }
    }

    const rows = Math.ceil(count / bestCols);
    const cellW = canvasW / bestCols;
    const cellH = canvasH / rows;

    // Recalculate glass size for the best layout
    const usableW = cellW * 0.82;
    const usableH = cellH * 0.80;
    let glassH = usableH;
    let glassW = glassH * glassAspect;
    if (glassW > usableW) {
        glassW = usableW;
        glassH = glassW / glassAspect;
    }

    // Cap maximum glass size so a single glass doesn't look absurdly large
    const maxGlassH = Math.min(canvasH * 0.75, 400);
    if (glassH > maxGlassH) {
        glassH = maxGlassH;
        glassW = glassH * glassAspect;
    }

    // Center the grid within the canvas
    const gridW = bestCols * cellW;
    const gridH = rows * cellH;
    const offsetX = (canvasW - gridW) / 2;
    const offsetY = (canvasH - gridH) / 2;

    return {
        cols: bestCols,
        rows,
        cellW,
        cellH,
        glassW,
        glassH,
        offsetX,
        offsetY,
    };
}

// --- Glass Drawing ---
function drawGlass(ctx, x, y, cellW, cellH, glassW, glassH, fillPercent, color, index, totalCount) {
    // Center the glass within its cell
    const cx = x + cellW / 2;
    const cy = y + cellH / 2;

    const labelSpace = Math.min(20, cellH * 0.1); // space below glass for label
    const topY = cy - glassH / 2;
    const botY = cy + glassH / 2 - labelSpace;
    const gh = botY - topY;
    const gw = glassW;

    // Glass shape proportions (consistent)
    const topHW = gw * 0.46;  // half-width at top (wider)
    const botHW = gw * 0.36;  // half-width at bottom (narrower)
    const cornerR = Math.min(gw * 0.1, 12);

    // === Glass path function ===
    function glassPath() {
        ctx.beginPath();
        ctx.moveTo(cx - topHW, topY);
        ctx.lineTo(cx - botHW, botY - cornerR);
        ctx.quadraticCurveTo(cx - botHW, botY, cx - botHW + cornerR, botY);
        ctx.lineTo(cx + botHW - cornerR, botY);
        ctx.quadraticCurveTo(cx + botHW, botY, cx + botHW, botY - cornerR);
        ctx.lineTo(cx + topHW, topY);
        ctx.closePath();
    }

    // === Draw glass body (subtle dark fill) ===
    glassPath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fill();

    // === Draw liquid ===
    if (fillPercent > 0) {
        ctx.save();
        glassPath();
        ctx.clip();

        const innerH = gh;
        const liquidH = innerH * (fillPercent / 100);
        const liquidTop = botY - liquidH;

        // Wavy surface
        const shouldAnimate = totalCount <= 30;
        const waveAmp = shouldAnimate ? Math.min(4, innerH * 0.02) : 0;
        const waveFreq = 0.06;

        // Liquid gradient
        const grad = ctx.createLinearGradient(cx, liquidTop - waveAmp, cx, botY);
        grad.addColorStop(0, lightenColor(color, 30));
        grad.addColorStop(0.4, color);
        grad.addColorStop(1, darkenColor(color, 20));

        ctx.beginPath();
        const waveStartX = cx - topHW - 5;
        const waveEndX = cx + topHW + 5;
        ctx.moveTo(waveStartX, liquidTop);
        for (let wx = waveStartX; wx <= waveEndX; wx += 3) {
            const wy = liquidTop + Math.sin(wx * waveFreq + animTime * 2 + index) * waveAmp;
            ctx.lineTo(wx, wy);
        }
        ctx.lineTo(waveEndX, botY + 5);
        ctx.lineTo(waveStartX, botY + 5);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Bubbles inside liquid
        if (shouldAnimate && fillPercent > 10) {
            drawBubbles(ctx, cx, liquidTop, botY, botHW * 1.5, index);
        }

        ctx.restore();
    }

    // === Glass outline ===
    glassPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1.5, Math.min(2.5, gw * 0.03));
    ctx.stroke();

    // === Glass rim (top edge) ===
    ctx.beginPath();
    ctx.moveTo(cx - topHW - 2, topY);
    ctx.lineTo(cx + topHW + 2, topY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = Math.max(2, Math.min(4, gw * 0.05));
    ctx.lineCap = 'round';
    ctx.stroke();

    // === Glass reflection (left side highlight) ===
    const reflectX = cx - topHW * 0.65;
    const reflectBotX = cx - botHW * 0.65;
    ctx.beginPath();
    ctx.moveTo(reflectX, topY + gh * 0.08);
    ctx.lineTo(reflectBotX, botY - gh * 0.12);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = Math.max(2, gw * 0.07);
    ctx.lineCap = 'round';
    ctx.stroke();

    // === Label under glass ===
    // Angka selalu ditampilkan, ukuran font disesuaikan dengan lebar gelas
    const fontSize = Math.max(7, Math.min(18, gw * 0.35));
    ctx.font = `600 ${fontSize}px Fredoka, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillText(`${index + 1}`, cx, botY + Math.max(2, fontSize * 0.25));

    // === Fill percentage text inside glass ===
    const displayPercent = Math.round(fillPercent);
    if (totalCount <= 20 && displayPercent > 0 && displayPercent < 100) {
        const labelSize = Math.max(10, Math.min(20, gw * 0.28));
        ctx.font = `700 ${labelSize}px Fredoka, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        const liquidH = gh * (fillPercent / 100);
        const textY = botY - liquidH / 2;
        ctx.strokeText(`${displayPercent}%`, cx, textY);
        ctx.fillText(`${displayPercent}%`, cx, textY);
    }
}

// --- Bubbles ---
function drawBubbles(ctx, cx, liquidTop, liquidBot, halfW, glassIndex) {
    // Generate deterministic bubble positions using glass index as seed
    const bubbleCount = 4;
    for (let i = 0; i < bubbleCount; i++) {
        const seed = glassIndex * 100 + i * 37;
        const bx = cx + (pseudoRandom(seed) - 0.5) * halfW * 1.2;
        const range = liquidBot - liquidTop;
        if (range < 10) continue;

        const speed = 0.3 + pseudoRandom(seed + 1) * 0.5;
        const phase = pseudoRandom(seed + 2) * Math.PI * 2;
        const yProgress = ((animTime * speed + phase) % 1);
        const by = liquidBot - yProgress * range;

        if (by < liquidTop || by > liquidBot) continue;

        const radius = 1.5 + pseudoRandom(seed + 3) * 2.5;
        const wobble = Math.sin(animTime * 3 + phase) * 3;

        ctx.beginPath();
        ctx.arc(bx + wobble, by, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + yProgress * 0.3})`;
        ctx.fill();
    }
}

// --- Utility: Pseudo-random (deterministic) ---
function pseudoRandom(seed) {
    let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

// --- Utility: Color manipulation ---
function lightenColor(hex, percent) {
    const rgb = hexToRgb(hex);
    const r = Math.min(255, rgb.r + (255 - rgb.r) * (percent / 100));
    const g = Math.min(255, rgb.g + (255 - rgb.g) * (percent / 100));
    const b = Math.min(255, rgb.b + (255 - rgb.b) * (percent / 100));
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function darkenColor(hex, percent) {
    const rgb = hexToRgb(hex);
    const r = Math.max(0, rgb.r * (1 - percent / 100));
    const g = Math.max(0, rgb.g * (1 - percent / 100));
    const b = Math.max(0, rgb.b * (1 - percent / 100));
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
    };
}
