// DOM Elements
const langSelect = document.getElementById('lang-select');
const countSelect = document.getElementById('count-select');
const categorySelect = document.getElementById('category-select');
const wordDisplay = document.getElementById('word-display');
const readingArea = document.querySelector('.reading-area');

// Color classes for syllables
const colorClasses = ['syl-c1', 'syl-c2', 'syl-c3', 'syl-c4', 'syl-c5'];

// History to prevent repeats
let wordHistory = [];

function getRandomItem(arr) {
    if (arr.length <= 1) return arr[0];
    
    // Ensure we don't try to look back further than available alternatives
    let maxHistory = Math.min(5, arr.length - 1);
    let candidate = arr[Math.floor(Math.random() * arr.length)];
    
    // Keep picking until we find one not in recent history
    while (wordHistory.slice(-maxHistory).includes(candidate)) {
        candidate = arr[Math.floor(Math.random() * arr.length)];
    }
    
    wordHistory.push(candidate);
    if (wordHistory.length > 10) {
        wordHistory.shift();
    }
    
    return candidate;
}

let availableVoices = [];

function populateVoices() {
    availableVoices = window.speechSynthesis.getVoices();
}

if ('speechSynthesis' in window) {
    populateVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoices;
    }
}

function speakText(text, lang) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        // Sometimes TTS reads single letters as English acronyms if we don't force the voice
        const utterance = new SpeechSynthesisUtterance(text.toLowerCase());
        
        let targetLang = lang === 'indonesia' ? 'id-ID' : 'en-US';
        utterance.lang = targetLang;
        
        if (availableVoices.length > 0) {
            // Find explicit exact voice match
            let voice = availableVoices.find(v => v.lang === targetLang || v.lang.replace('_', '-') === targetLang);
            
            // Fallback to prefix match (e.g., 'id' instead of 'id-ID')
            if (!voice) {
                const prefix = targetLang.split('-')[0];
                voice = availableVoices.find(v => v.lang.startsWith(prefix));
            }
            
            if (voice) {
                utterance.voice = voice;
            }
        }
        
        utterance.rate = 0.8; // Slightly slower for learning
        window.speechSynthesis.speak(utterance);
    }
}

function generateWords() {
    const lang = langSelect.value;
    const category = categorySelect.value;
    const count = parseInt(countSelect.value, 10);

    const wordList = dictionary[lang][category][count];
    
    // Clear display
    wordDisplay.innerHTML = '';

    // Pick 1 random object that matches the count length
    const wordData = getRandomItem(wordList);
    
    // Create container for the object
    const wordDiv = document.createElement('div');
    wordDiv.className = 'word-container animate-pop';
    
    // Split by words first (spaces)
    const words = wordData.split(' ');
    let colorIdx = 0;
    
    for (let w = 0; w < words.length; w++) {
        // Split by dashes for syllables
        const syllables = words[w].split('-');
        
        for (let i = 0; i < syllables.length; i++) {
            const span = document.createElement('span');
            span.innerText = syllables[i];
            span.className = colorClasses[colorIdx % colorClasses.length] + ' clickable-syl';
            
            span.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent generating new word
                speakText(syllables[i], langSelect.value);
            });
            
            colorIdx++;
            wordDiv.appendChild(span);
        }
        
        // Add a non-breaking space after each word (except the last)
        if (w < words.length - 1) {
            const spaceSpan = document.createElement('span');
            spaceSpan.innerHTML = '&nbsp;';
            wordDiv.appendChild(spaceSpan);
        }
    }
    
    wordDisplay.appendChild(wordDiv);
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll
        generateWords();
    }
});

// For touch devices
readingArea.addEventListener('click', () => {
    generateWords();
});

// Generate when options change
langSelect.addEventListener('change', generateWords);
countSelect.addEventListener('change', generateWords);
categorySelect.addEventListener('change', generateWords);

// Speak button - reads the full displayed word
const speakBtn = document.getElementById('speak-btn');

speakBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Don't trigger new word generation

    // Gather displayed text from all syllable spans
    const syllables = wordDisplay.querySelectorAll('.clickable-syl');
    if (syllables.length === 0) return;

    const fullText = Array.from(wordDisplay.querySelectorAll('.word-container > span'))
        .map(span => span.textContent.trim())
        .join('')
        .replace(/\s+/g, ' ')
        .trim();

    // Add speaking animation
    speakBtn.classList.add('speaking');

    // Speak the full word
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(fullText.toLowerCase());
        let targetLang = langSelect.value === 'indonesia' ? 'id-ID' : 'en-US';
        utterance.lang = targetLang;

        if (availableVoices.length > 0) {
            let voice = availableVoices.find(v => v.lang === targetLang || v.lang.replace('_', '-') === targetLang);
            if (!voice) {
                const prefix = targetLang.split('-')[0];
                voice = availableVoices.find(v => v.lang.startsWith(prefix));
            }
            if (voice) utterance.voice = voice;
        }

        utterance.rate = 0.75; // Slightly slower for full word
        utterance.onend = () => speakBtn.classList.remove('speaking');
        utterance.onerror = () => speakBtn.classList.remove('speaking');

        window.speechSynthesis.speak(utterance);
    }
});

// Generate initial word
generateWords();
