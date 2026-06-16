// ==================================================
// MULTI-COMPONENT STOPWATCH - DUNIA SEAN
// ==================================================

// State Variables
let components = [];
let activeComponentId = null; // null means stopwatch is paused/stopped
let isRunning = false;
let precisionMs = true;
let lastUpdateTime = 0;
let animationFrameId = null;
let activeRunDuration = 0; // Duration of the current run of the active component

// Audio Beep Helpers (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep(frequency = 600, duration = 0.08) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.warn("Audio Context blocked or not supported:", e);
    }
}

// Accent Colors Mapping (consistent with style.css variables)
const componentColors = [
    { name: 'Purple', value: 'var(--color-1)', bg: 'rgba(165, 94, 234, 0.1)', keyBg: '#a55eea' },
    { name: 'Blue', value: 'var(--color-2)', bg: 'rgba(69, 170, 242, 0.1)', keyBg: '#45aaf2' },
    { name: 'Teal', value: 'var(--color-3)', bg: 'rgba(43, 203, 186, 0.1)', keyBg: '#2bcbba' },
    { name: 'Sky Blue', value: 'var(--color-4)', bg: 'rgba(45, 152, 218, 0.1)', keyBg: '#2d98da' },
    { name: 'Orange', value: 'var(--color-5)', bg: 'rgba(253, 150, 68, 0.1)', keyBg: '#fd9644' },
    { name: 'Coral', value: 'var(--color-6)', bg: 'rgba(252, 92, 101, 0.1)', keyBg: '#fc5c65' },
    { name: 'Green', value: 'var(--color-7)', bg: 'rgba(38, 222, 129, 0.1)', keyBg: '#26de81' },
    { name: 'Yellow', value: 'var(--color-8)', bg: 'rgba(254, 211, 48, 0.1)', keyBg: '#fed330' },
    { name: 'Coral Red', value: 'var(--color-9)', bg: 'rgba(235, 59, 90, 0.1)', keyBg: '#eb3b5a' }
];

// Default Names based on amount
const defaultNames = ["Berfikir", "Menulis", "Membalik kertas"];

// DOM Elements
const compCountInput = document.getElementById('comp-count');
const inputsContainer = document.getElementById('components-inputs-container');
const precisionCheckbox = document.getElementById('precision-ms');
const applySettingsBtn = document.getElementById('apply-settings-btn');

const activeBadge = document.getElementById('active-component-badge');
const totalTimeDisplay = document.getElementById('total-time-display');
const stopTimerBtn = document.getElementById('stop-timer-btn');
const resetTimerBtn = document.getElementById('reset-timer-btn');
const stackedLabelsRow = document.getElementById('stacked-labels-row');
const stackedProgressTrack = document.getElementById('stacked-progress-track');
const stackedBarPlaceholder = document.getElementById('stacked-bar-placeholder');
const stackedTimesRow = document.getElementById('stacked-times-row');
const legendGrid = document.getElementById('legend-grid');

// Initialize the Settings Form dynamically
function renderSettingsForm() {
    const count = parseInt(compCountInput.value) || 3;
    
    // Save current user edits in the inputs if they exist
    const existingInputs = Array.from(inputsContainer.querySelectorAll('.component-input-row input'));
    const savedValues = existingInputs.map(inp => inp.value);
    
    inputsContainer.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        const row = document.createElement('div');
        row.className = 'component-input-row';
        row.style.setProperty('--kbd-bg', componentColors[i].keyBg);
        
        // Key binding badge
        const badge = document.createElement('span');
        badge.className = 'key-badge';
        badge.textContent = i + 1;
        
        // Input text field
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Komponen ${i + 1}`;
        
        // Assign value: saved value, then default value, then generic value
        if (savedValues[i] !== undefined) {
            input.value = savedValues[i];
        } else if (defaultNames[i] !== undefined) {
            input.value = defaultNames[i];
        } else {
            input.value = `Komponen ${i + 1}`;
        }
        
        row.appendChild(badge);
        row.appendChild(input);
        inputsContainer.appendChild(row);
    }
}

// Generate components configurations from inputs
function applySettings() {
    // Stop the active timer loop first
    stopTimerLogic();
    
    precisionMs = precisionCheckbox.checked;
    
    const count = parseInt(compCountInput.value) || 3;
    const inputs = inputsContainer.querySelectorAll('.component-input-row input');
    
    components = [];
    for (let i = 0; i < count; i++) {
        components.push({
            id: i + 1,
            name: inputs[i].value.trim() || `Komponen ${i + 1}`,
            elapsedTime: 0, // in milliseconds
            history: [], // Stores individual run times in milliseconds
            color: componentColors[i].value,
            bg: componentColors[i].bg,
            keyBg: componentColors[i].keyBg
        });
    }
    
    activeComponentId = null;
    isRunning = false;
    activeRunDuration = 0;
    
    // Render Stats list in right panel
    renderStatsList();
    updateClockDisplay(0);
    
    // Update badge status
    activeBadge.textContent = "Siap! Tekan keyboard angka (1-" + count + ") untuk mulai.";
    activeBadge.className = "active-badge";
    activeBadge.style.removeProperty('--active-color');
    activeBadge.style.removeProperty('--active-shadow');
    
    stopTimerBtn.disabled = true;
    
    // Play a confirmation sound
    playBeep(880, 0.15);
    
    updateLegendClickability();
}

// Render Stats segmented elements
function renderStatsList() {
    // Clear dynamic segments and labels, but keep the placeholder in track
    stackedLabelsRow.innerHTML = '';
    stackedTimesRow.innerHTML = '';
    legendGrid.innerHTML = '';
    
    // Clear segments (remove divs with class stacked-progress-segment)
    const segments = stackedProgressTrack.querySelectorAll('.stacked-progress-segment');
    segments.forEach(seg => seg.remove());
    
    components.forEach((comp) => {
        // 1. Progress Segment
        const segment = document.createElement('div');
        segment.className = 'stacked-progress-segment';
        segment.id = `stacked-segment-${comp.id}`;
        segment.style.backgroundColor = comp.color;
        segment.style.width = '0%';
        stackedProgressTrack.appendChild(segment);

        // 2. Label Item above
        const labelItem = document.createElement('div');
        labelItem.className = 'stacked-label-item zero';
        labelItem.id = `stacked-label-${comp.id}`;
        labelItem.innerHTML = `${comp.name} (<span id="stacked-percent-label-${comp.id}">0%</span>)`;
        stackedLabelsRow.appendChild(labelItem);

        // 3. Time Item below
        const timeItem = document.createElement('div');
        timeItem.className = 'stacked-time-item zero';
        timeItem.id = `stacked-time-${comp.id}`;
        timeItem.textContent = formatTime(0, precisionMs);
        stackedTimesRow.appendChild(timeItem);

        // 4. Legend Detail Card
        const card = document.createElement('div');
        card.className = 'legend-card clickable';
        card.id = `legend-card-${comp.id}`;
        card.style.setProperty('--active-color', comp.color);
        card.style.setProperty('--active-bg', comp.bg);
        card.innerHTML = `
            <div class="legend-left">
                <span class="key-badge" style="background-color: ${comp.keyBg}">${comp.id}</span>
                <span class="legend-name">${comp.name}</span>
            </div>
            <div class="legend-right-wrapper" style="display: flex; align-items: center;">
                <div class="legend-right" style="display: flex; flex-direction: column; align-items: flex-end;">
                    <span class="legend-time" id="legend-time-${comp.id}">00:00:00${precisionMs ? '.000' : ''}</span>
                    <span class="legend-percent" id="legend-percent-${comp.id}">0%</span>
                </div>
                <button class="chart-detail-btn" id="chart-detail-btn-${comp.id}" title="Analisis Statistik">📊</button>
            </div>
        `;
        
        // Card click triggers activation/switching (works for mobile/desktop)
        card.onclick = () => {
            activateComponent(comp.id);
        };

        // Detail button triggers modal popup
        const detailBtn = card.querySelector('.chart-detail-btn');
        detailBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent triggering card activation click
            showComponentDetails(comp.id);
        };

        legendGrid.appendChild(card);
    });
}

// Format milliseconds into HH:MM:SS.mmm or HH:MM:SS
function formatTime(ms, includeMs) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    const pad = (num, size = 2) => String(num).padStart(size, '0');
    
    let str = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    if (includeMs) {
        const milliseconds = Math.floor(ms % 1000);
        str += `.${pad(milliseconds, 3)}`;
    }
    return str;
}

// Update clock display
function updateClockDisplay(totalMs) {
    totalTimeDisplay.textContent = formatTime(totalMs, precisionMs);
}

// Active Timer Logic
function timerLoop(now) {
    if (!isRunning) return;
    
    const delta = now - lastUpdateTime;
    lastUpdateTime = now;
    
    // Accumulate time for the active component
    if (activeComponentId !== null) {
        const activeComp = components.find(c => c.id === activeComponentId);
        if (activeComp) {
            activeComp.elapsedTime += delta;
            activeRunDuration += delta;
        }
    }
    
    // Render update
    updateVisuals();
    
    animationFrameId = requestAnimationFrame(timerLoop);
}

// Update visuals during running
function updateVisuals() {
    let totalMs = 0;
    components.forEach(c => totalMs += c.elapsedTime);
    
    updateClockDisplay(totalMs);
    
    if (totalMs > 0) {
        stackedBarPlaceholder.style.display = 'none';
        
        components.forEach((comp) => {
            const percent = (comp.elapsedTime / totalMs) * 100;
            const percentStr = percent.toFixed(1) + '%';
            const formattedTimeStr = formatTime(comp.elapsedTime, precisionMs);

            // Update Progress segment width
            const segment = document.getElementById(`stacked-segment-${comp.id}`);
            if (segment) {
                segment.style.width = percent + '%';
            }

            // Update Label above bar (and show/hide if zero width)
            const labelItem = document.getElementById(`stacked-label-${comp.id}`);
            const percentLabel = document.getElementById(`stacked-percent-label-${comp.id}`);
            if (labelItem) {
                if (comp.elapsedTime === 0) {
                    labelItem.classList.add('zero');
                    labelItem.style.width = '0%';
                } else {
                    labelItem.classList.remove('zero');
                    labelItem.style.width = percent + '%';
                    if (percentLabel) percentLabel.textContent = percentStr;
                }
            }

            // Update Time below bar (and show/hide if zero width)
            const timeItem = document.getElementById(`stacked-time-${comp.id}`);
            if (timeItem) {
                if (comp.elapsedTime === 0) {
                    timeItem.classList.add('zero');
                    timeItem.style.width = '0%';
                } else {
                    timeItem.classList.remove('zero');
                    timeItem.style.width = percent + '%';
                    timeItem.textContent = formattedTimeStr;
                }
            }

            // Update Legend Cards details
            const legendTime = document.getElementById(`legend-time-${comp.id}`);
            const legendPercent = document.getElementById(`legend-percent-${comp.id}`);
            if (legendTime) legendTime.textContent = formattedTimeStr;
            if (legendPercent) legendPercent.textContent = percentStr;
        });
    } else {
        // Reset state, display placeholder
        stackedBarPlaceholder.style.display = 'flex';
        
        components.forEach((comp) => {
            const segment = document.getElementById(`stacked-segment-${comp.id}`);
            if (segment) segment.style.width = '0%';

            const labelItem = document.getElementById(`stacked-label-${comp.id}`);
            if (labelItem) {
                labelItem.classList.add('zero');
                labelItem.style.width = '0%';
            }

            const timeItem = document.getElementById(`stacked-time-${comp.id}`);
            if (timeItem) {
                timeItem.classList.add('zero');
                timeItem.style.width = '0%';
            }

            // Reset Legend Details
            const legendTime = document.getElementById(`legend-time-${comp.id}`);
            const legendPercent = document.getElementById(`legend-percent-${comp.id}`);
            if (legendTime) legendTime.textContent = formatTime(0, precisionMs);
            if (legendPercent) legendPercent.textContent = '0%';
        });
    }
}

// Activate / Switch Component
function activateComponent(id) {
    // If not running, start
    const comp = components.find(c => c.id === id);
    if (!comp) return;
    
    // If switching from another active component, finalize its current run
    if (activeComponentId !== null && activeComponentId !== id) {
        finalizeActiveRun();
    }
    
    // Sound beep pitch matches component ID (higher ID = higher pitch)
    const pitch = 450 + (id * 50);
    playBeep(pitch, 0.08);
    
    // Setup state
    activeComponentId = id;
    lastUpdateTime = performance.now();
    
    if (!isRunning) {
        isRunning = true;
        animationFrameId = requestAnimationFrame(timerLoop);
    }
    
    updateLegendClickability();
    
    // UI states highlight
    components.forEach((c) => {
        const segment = document.getElementById(`stacked-segment-${c.id}`);
        const card = document.getElementById(`legend-card-${c.id}`);
        if (segment) {
            if (c.id === id) segment.classList.add('active');
            else segment.classList.remove('active');
        }
        if (card) {
            if (c.id === id) card.classList.add('active');
            else card.classList.remove('active');
        }
    });
    
    // Update Badge display
    activeBadge.textContent = `Sedang Berjalan: ${comp.name} (${id})`;
    activeBadge.className = "active-badge active";
    activeBadge.style.setProperty('--active-color', comp.color);
    activeBadge.style.setProperty('--active-shadow', comp.bg.replace('0.1', '0.35'));
    
    stopTimerBtn.disabled = false;
}

// Stop Timer
function stopTimerLogic() {
    finalizeActiveRun();
    isRunning = false;
    activeComponentId = null;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function stopTimer() {
    if (!isRunning) return;
    
    stopTimerLogic();
    playBeep(380, 0.12);
    
    updateLegendClickability();
    
    // Remove active styles from UI components
    components.forEach((c) => {
        const segment = document.getElementById(`stacked-segment-${c.id}`);
        const card = document.getElementById(`legend-card-${c.id}`);
        if (segment) segment.classList.remove('active');
        if (card) card.classList.remove('active');
    });
    
    activeBadge.textContent = "Stopwatch Dihentikan (Pause)";
    activeBadge.className = "active-badge";
    activeBadge.style.removeProperty('--active-color');
    activeBadge.style.removeProperty('--active-shadow');
    
    stopTimerBtn.disabled = true;
}

// Reset Stopwatch
function resetTimer() {
    stopTimerLogic();
    
    // Double beep on reset
    playBeep(700, 0.07);
    setTimeout(() => playBeep(850, 0.07), 80);
    
    components.forEach((c) => {
        c.elapsedTime = 0;
        c.history = []; // Clear history
        
        const segment = document.getElementById(`stacked-segment-${c.id}`);
        const card = document.getElementById(`legend-card-${c.id}`);
        if (segment) segment.classList.remove('active');
        if (card) card.classList.remove('active');
    });
    
    activeRunDuration = 0;
    updateVisuals();
    updateLegendClickability();
    
    activeBadge.textContent = "Siap! Tekan keyboard angka (1-" + components.length + ") untuk mulai.";
    activeBadge.className = "active-badge";
    activeBadge.style.removeProperty('--active-color');
    activeBadge.style.removeProperty('--active-shadow');
    
    stopTimerBtn.disabled = true;
}

// Event Listeners
compCountInput.addEventListener('input', () => {
    // Validate value ranges
    let val = parseInt(compCountInput.value);
    if (val < 1) compCountInput.value = 1;
    if (val > 9) compCountInput.value = 9;
    
    renderSettingsForm();
});

applySettingsBtn.addEventListener('click', applySettings);
stopTimerBtn.addEventListener('click', stopTimer);
resetTimerBtn.addEventListener('click', resetTimer);

// Keyboard Listeners
window.addEventListener('keydown', (e) => {
    // Ignore shortcut keys when typing inside input boxes
    if (document.activeElement.tagName === 'INPUT') {
        return;
    }
    
    if (e.key >= '1' && e.key <= '9') {
        const id = parseInt(e.key);
        if (id <= components.length) {
            e.preventDefault();
            activateComponent(id);
        }
    } else if (e.code === 'Space') {
        e.preventDefault();
        stopTimer();
    }
});

// Initial Setup
renderSettingsForm();
applySettings(); // Instantly apply default 3 components so it works out of the box!

// Finalize active run and push to history
function finalizeActiveRun() {
    if (activeComponentId !== null && activeRunDuration > 0) {
        const activeComp = components.find(c => c.id === activeComponentId);
        if (activeComp) {
            if (!activeComp.history) {
                activeComp.history = [];
            }
            activeComp.history.push(activeRunDuration);
        }
    }
    activeRunDuration = 0; // reset
}

// Manage clickable states of legend cards and detail buttons
function updateLegendClickability() {
    components.forEach((comp) => {
        const card = document.getElementById(`legend-card-${comp.id}`);
        const btn = document.getElementById(`chart-detail-btn-${comp.id}`);
        if (card) {
            // Cards are always clickable to switch/start now!
            card.classList.add('clickable');
        }
        if (btn) {
            if (isRunning) {
                btn.disabled = true;
            } else {
                btn.disabled = false;
            }
        }
    });
}

// Modal elements
const detailsModal = document.getElementById('details-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalTitle = document.getElementById('modal-title');
const modalKeyBadge = document.getElementById('modal-key-badge');

const statMin = document.getElementById('stat-min');
const statMax = document.getElementById('stat-max');
const statAvg = document.getElementById('stat-avg');
const statStdev = document.getElementById('stat-stdev');

const customBarChart = document.getElementById('custom-bar-chart');
const chartYAxis = document.getElementById('chart-y-axis');

// Close modal events
closeModalBtn.addEventListener('click', () => {
    detailsModal.classList.remove('open');
});
detailsModal.addEventListener('click', (e) => {
    if (e.target === detailsModal) {
        detailsModal.classList.remove('open');
    }
});

// Show Component Details Popup
function showComponentDetails(id) {
    const comp = components.find(c => c.id === id);
    if (!comp) return;

    // Title & badge
    modalTitle.textContent = `Analisis: ${comp.name}`;
    modalKeyBadge.textContent = comp.id;
    modalKeyBadge.style.backgroundColor = comp.keyBg;

    const history = comp.history || [];

    if (history.length === 0) {
        // No data state
        statMin.textContent = '-';
        statMax.textContent = '-';
        statAvg.textContent = '-';
        statStdev.textContent = '-';

        chartYAxis.innerHTML = '<div>0s</div><div>0s</div><div>0s</div><div>0s</div>';
        customBarChart.innerHTML = '<div style="width: 100%; text-align: center; color: var(--text-secondary); font-size: 0.9rem; padding: 40px 0;">Belum ada data percobaan untuk komponen ini. Mulailah stopwatch untuk merekam.</div>';
    } else {
        // Convert history from ms to seconds
        const runsInSec = history.map(ms => ms / 1000);

        // Calculations
        const minVal = Math.min(...runsInSec);
        const maxVal = Math.max(...runsInSec);
        const sumVal = runsInSec.reduce((a, b) => a + b, 0);
        const avgVal = sumVal / runsInSec.length;

        // Standard Deviation
        const variance = runsInSec.reduce((acc, val) => acc + Math.pow(val - avgVal, 2), 0) / runsInSec.length;
        const stdevVal = Math.sqrt(variance);

        // Populate Text
        statMin.textContent = minVal.toFixed(2) + 's';
        statMax.textContent = maxVal.toFixed(2) + 's';
        statAvg.textContent = avgVal.toFixed(2) + 's';
        statStdev.textContent = stdevVal.toFixed(2) + 's';

        // Clear chart
        customBarChart.innerHTML = '';

        // Y Axis Scale
        const scaleMax = maxVal === 0 ? 1 : maxVal;
        chartYAxis.innerHTML = `
            <div>${scaleMax.toFixed(1)}s</div>
            <div>${(scaleMax * 0.66).toFixed(1)}s</div>
            <div>${(scaleMax * 0.33).toFixed(1)}s</div>
            <div>0.0s</div>
        `;

        // Generate bars
        runsInSec.forEach((val, idx) => {
            const heightPercent = (val / scaleMax) * 100;

            const col = document.createElement('div');
            col.className = 'chart-bar-col';
            col.style.setProperty('--active-color', comp.color);
            col.setAttribute('data-tooltip', `Percobaan ${idx + 1}: ${val.toFixed(2)}s`);

            const fill = document.createElement('div');
            fill.className = 'chart-bar-fill';
            // Keep a tiny visible height if it's almost 0
            fill.style.height = `${Math.max(heightPercent, 3)}%`;

            const label = document.createElement('div');
            label.className = 'chart-bar-label';
            label.textContent = idx + 1;

            col.appendChild(fill);
            col.appendChild(label);
            customBarChart.appendChild(col);
        });
    }

    detailsModal.classList.add('open');
}
