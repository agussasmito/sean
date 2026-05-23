// DOM Elements
const num1El = document.getElementById('num1');
const num2El = document.getElementById('num2');
const operatorEl = document.getElementById('operator');
const answerInput = document.getElementById('answer-input');
const feedbackMsg = document.getElementById('feedback-msg');
const scoreEl = document.getElementById('score');

// Settings Elements
const minInput = document.getElementById('min-num');
const maxInput = document.getElementById('max-num');
const opAdd = document.getElementById('op-add');
const opSub = document.getElementById('op-sub');
const opMul = document.getElementById('op-mul');
const opDiv = document.getElementById('op-div');
const opError = document.getElementById('op-error');
const applyBtn = document.getElementById('apply-settings-btn');

// Timer Elements
const useTimerCheckbox = document.getElementById('use-timer');
const timerInputGroup = document.getElementById('timer-input-group');
const timerSecInput = document.getElementById('timer-sec');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const timerDisplayWrapper = document.getElementById('timer-display');
const timeLeftEl = document.getElementById('time-left');

// State
let currentAnswer = 0;
let score = 0;
let isWaiting = false;
let isGameRunning = false;

// Timer State
let timerInterval = null;
let timeLeft = 0;
let isTimerMode = true;

// Config
let config = {
    min: 1,
    max: 10,
    ops: ['add', 'sub', 'mul', 'div'],
    timerDuration: 60
};

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateProblem() {
    isWaiting = false;
    answerInput.value = '';
    answerInput.classList.remove('correct-state', 'wrong-state');
    feedbackMsg.classList.remove('show', 'feedback-correct', 'feedback-wrong');
    answerInput.disabled = false;
    answerInput.focus();

    // Pick random operation
    const op = config.ops[Math.floor(Math.random() * config.ops.length)];
    
    let a, b;
    
    switch (op) {
        case 'add':
            a = getRandomInt(config.min, config.max);
            b = getRandomInt(config.min, config.max);
            currentAnswer = a + b;
            operatorEl.innerText = '+';
            break;
        case 'sub':
            a = getRandomInt(config.min, config.max);
            b = getRandomInt(config.min, config.max);
            // Ensure positive result for simplicity
            if (a < b) [a, b] = [b, a]; 
            currentAnswer = a - b;
            operatorEl.innerText = '-';
            break;
        case 'mul':
            a = getRandomInt(config.min, config.max);
            b = getRandomInt(config.min, config.max);
            currentAnswer = a * b;
            operatorEl.innerText = '×';
            break;
        case 'div':
            // To ensure integer division, generate answer and divisor first.
            let ans = getRandomInt(config.min, config.max);
            b = getRandomInt(config.min, config.max);
            if (b === 0) b = 1; // prevent division by zero
            a = ans * b;
            currentAnswer = ans;
            operatorEl.innerText = '÷';
            break;
    }

    num1El.innerText = a;
    num2El.innerText = b;
}

function startGame() {
    startOverlay.classList.add('hidden');
    gameOverModal.classList.add('hidden');
    isGameRunning = true;
    score = 0;
    scoreEl.innerText = score;
    
    if (isTimerMode) {
        timeLeft = config.timerDuration;
        timeLeftEl.innerText = timeLeft;
        timerDisplayWrapper.classList.remove('hidden');
        
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeLeft--;
            timeLeftEl.innerText = timeLeft;
            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);
    } else {
        timerDisplayWrapper.classList.add('hidden');
    }
    
    generateProblem();
}

function endGame() {
    clearInterval(timerInterval);
    isGameRunning = false;
    answerInput.disabled = true;
    finalScoreEl.innerText = score;
    gameOverModal.classList.remove('hidden');
}

function handleAnswer() {
    if (isWaiting || !isGameRunning) return;
    
    const val = answerInput.value.trim();
    if (val === '') return;
    
    const parsedVal = parseInt(val, 10);
    
    isWaiting = true;
    answerInput.disabled = true;

    if (parsedVal === currentAnswer) {
        // Correct
        score += 10;
        scoreEl.innerText = score;
        
        answerInput.classList.add('correct-state');
        feedbackMsg.innerText = "Benar!";
        feedbackMsg.className = "feedback-msg feedback-correct show";
        
        setTimeout(() => {
            if (isGameRunning) generateProblem();
        }, 1000);
    } else {
        // Wrong
        answerInput.classList.add('wrong-state');
        feedbackMsg.innerText = "Salah!";
        feedbackMsg.className = "feedback-msg feedback-wrong show";
        
        setTimeout(() => {
            if (isGameRunning) {
                answerInput.value = '';
                answerInput.classList.remove('wrong-state');
                feedbackMsg.classList.remove('show');
                isWaiting = false;
                answerInput.disabled = false;
                answerInput.focus();
            }
        }, 1000);
    }
}

// Event Listeners
answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleAnswer();
    }
});

useTimerCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
        timerInputGroup.classList.remove('hidden');
    } else {
        timerInputGroup.classList.add('hidden');
    }
});

applyBtn.addEventListener('click', () => {
    let min = parseInt(minInput.value, 10);
    let max = parseInt(maxInput.value, 10);
    let timerVal = parseInt(timerSecInput.value, 10);
    
    if (isNaN(min)) min = 1;
    if (isNaN(max)) max = 10;
    if (isNaN(timerVal) || timerVal <= 0) timerVal = 60;
    
    if (min > max) {
        let temp = min;
        min = max;
        max = temp;
        minInput.value = min;
        maxInput.value = max;
    }
    
    let selectedOps = [];
    if (opAdd.checked) selectedOps.push('add');
    if (opSub.checked) selectedOps.push('sub');
    if (opMul.checked) selectedOps.push('mul');
    if (opDiv.checked) selectedOps.push('div');
    
    if (selectedOps.length === 0) {
        opError.classList.remove('hidden');
        return;
    } else {
        opError.classList.add('hidden');
    }
    
    config.min = min;
    config.max = max;
    config.ops = selectedOps;
    
    isTimerMode = useTimerCheckbox.checked;
    if (isTimerMode) {
        config.timerDuration = timerVal;
    }
    
    // Stop game and show start overlay
    clearInterval(timerInterval);
    isGameRunning = false;
    startOverlay.classList.remove('hidden');
    gameOverModal.classList.add('hidden');
    
    // Animate button to show success
    applyBtn.innerText = "Diterapkan ✓";
    setTimeout(() => {
        applyBtn.innerText = "Terapkan Pengaturan";
    }, 1500);
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Initialize UI state
if (!useTimerCheckbox.checked) {
    timerInputGroup.classList.add('hidden');
}
