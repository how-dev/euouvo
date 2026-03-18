// Audio Engine
const AudioEngine = {
    ctx: null,
    
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    playNote(frequency, duration = 1) {
        this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
};

const DIFFICULTIES = {
    easy: {
        range: [4, 5],
        options: 2,
        sharps: false,
        reference: true,
        color: '#22c55e',
        hover: '#16a34a',
        points: 1
    },
    medium: {
        range: [3, 5],
        options: 3,
        sharps: true,
        reference: false,
        color: '#f59e0b',
        hover: '#d97706',
        points: 2
    },
    hard: {
        range: [2, 6],
        options: 4,
        sharps: true,
        reference: false,
        color: '#ef4444',
        hover: '#dc2626',
        points: 3
    }
};

function getNoteFrequency(noteName, octave) {
    const baseNotes = {
        'C': 16.35, 'C#': 17.32, 'D': 18.35, 'D#': 19.45,
        'E': 20.60, 'F': 21.83, 'F#': 23.12, 'G': 24.50, 'G#': 25.96,
        'A': 27.50, 'A#': 29.14, 'B': 30.87
    };
    return baseNotes[noteName] * Math.pow(2, octave);
}

// Game State
let currentDifficulty = null;
let currentNote = null;
let score = 0;

// DOM Elements
const menuEl = document.getElementById('menu');
const gameEl = document.getElementById('game');
const feedbackEl = document.getElementById('feedback');
const optionsContainer = document.getElementById('options-container');
const refSection = document.getElementById('reference-section');
const themeToggleBtn = document.getElementById('theme-toggle');
const scoreValueEl = document.getElementById('score-value');

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggleBtn.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-theme');
        themeToggleBtn.textContent = '🌙';
    }
}

themeToggleBtn.onclick = () => {
    const isDark = document.body.classList.toggle('dark-theme');
    themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};

initTheme();

// Init listeners
document.getElementById('btn-easy').onclick = () => { AudioEngine.init(); startGame('easy'); };
document.getElementById('btn-medium').onclick = () => { AudioEngine.init(); startGame('medium'); };
document.getElementById('btn-hard').onclick = () => { AudioEngine.init(); startGame('hard'); };
document.getElementById('btn-back').onclick = backToMenu;
document.getElementById('play-ref').onclick = () => AudioEngine.playNote(getNoteFrequency('A', 4));
document.getElementById('play-question').onclick = () => AudioEngine.playNote(currentNote.freq);

function startGame(diff) {
    currentDifficulty = DIFFICULTIES[diff];
    
    // Set theme colors
    document.documentElement.style.setProperty('--theme-color', currentDifficulty.color);
    document.documentElement.style.setProperty('--theme-hover', currentDifficulty.hover);
    
    menuEl.classList.add('hidden');
    gameEl.classList.remove('hidden');
    nextQuestion();
}

function backToMenu() {
    // Reset theme colors to default
    document.documentElement.style.setProperty('--theme-color', '#6366f1');
    document.documentElement.style.setProperty('--theme-hover', '#4f46e5');
    
    menuEl.classList.remove('hidden');
    gameEl.classList.add('hidden');
    hideFeedback();
}

function nextQuestion() {
    hideFeedback();
    const config = currentDifficulty;
    
    // Toggle reference
    if (config.reference) {
        refSection.classList.remove('hidden');
    } else {
        refSection.classList.add('hidden');
    }

    // Generate note
    const noteNames = config.sharps ? 
        ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] : 
        ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    
    const randomName = noteNames[Math.floor(Math.random() * noteNames.length)];
    const randomOctave = Math.floor(Math.random() * (config.range[1] - config.range[0] + 1)) + config.range[0];
    
    currentNote = {
        name: randomName,
        octave: randomOctave,
        freq: getNoteFrequency(randomName, randomOctave),
        label: randomName
    };

    // Generate options
    let options = [currentNote.name];
    while (options.length < config.options) {
        const oName = noteNames[Math.floor(Math.random() * noteNames.length)];
        
        // Evita duplicatas de nome de nota nas opções
        if (!options.includes(oName)) {
            options.push(oName);
        }
    }
    options.sort(() => Math.random() - 0.5);

    // Render options
    optionsContainer.innerHTML = '';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = opt;
        btn.onclick = () => checkAnswer(opt);
        optionsContainer.appendChild(btn);
    });

    // Play note automatically after a short delay
    setTimeout(() => AudioEngine.playNote(currentNote.freq), 500);
}

function checkAnswer(selected) {
    const isCorrect = selected === currentNote.label;
    
    // Update Score
    if (isCorrect) {
        score += currentDifficulty.points;
    } else {
        score = Math.max(0, score - 1);
    }
    updateScoreDisplay();

    showFeedback(isCorrect);
    
    // Desabilitar botões para evitar cliques múltiplos
    const buttons = optionsContainer.querySelectorAll('button');
    buttons.forEach(b => b.disabled = true);

    setTimeout(() => {
        nextQuestion();
    }, isCorrect ? 1500 : 2500);
}

function showFeedback(correct) {
    feedbackEl.textContent = correct ? 'Acertou! 🎉' : `Errou! Era ${currentNote.label} 😕`;
    feedbackEl.className = `show-feedback ${correct ? 'success' : 'error'}`;
}

function hideFeedback() {
    feedbackEl.className = 'hidden';
    feedbackEl.textContent = '';
}

function updateScoreDisplay() {
    scoreValueEl.textContent = score;
}
