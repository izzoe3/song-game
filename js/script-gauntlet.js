const DEFAULT_WORDLIST_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5MX7qFT32Er41i6EPORV5GH9xsIlh6nwNxsV9_qGTL6PHvDBvNb9I5PhlTycbQyb5-f9ffg4BE5FB/pub?output=csv';
const players = {};
let usedWords = { english: [], malay: [] };
let currentPlayerIndex = 0;
let currentLanguage = 'both';
let words = { english: [], malay: [] };
let gameActive = false;

document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
    loadSession();
    showModal('gauntletSetupModal');
    document.getElementById('gauntletSetupForm').addEventListener('submit', startGauntletGame);
    document.getElementById('scoreForm').addEventListener('submit', submitScore);
    document.getElementById('skipWordBtn').addEventListener('click', skipWord);
    document.getElementById('endGameBtn').addEventListener('click', endGame);
});

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/song-game/sw.js')
            .then(() => console.log('Service Worker registered'))
            .catch(err => console.error('Service Worker registration failed:', err));
    }
}

function loadSession() {
    const savedPlayers = localStorage.getItem('gauntletPlayers');
    const savedUsedWords = localStorage.getItem('gauntletUsedWords');
    const savedLanguage = localStorage.getItem('gauntletLanguage');
    if (savedPlayers) Object.assign(players, JSON.parse(savedPlayers));
    if (savedUsedWords) Object.assign(usedWords, JSON.parse(savedUsedWords));
    if (savedLanguage) currentLanguage = savedLanguage;
}

function saveSession() {
    localStorage.setItem('gauntletPlayers', JSON.stringify(players));
    localStorage.setItem('gauntletUsedWords', JSON.stringify(usedWords));
    localStorage.setItem('gauntletLanguage', currentLanguage);
}

function showModal(modalId) {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.getElementById(modalId).classList.remove('hidden');
}

function showFeedback(message, type) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = message;
    feedback.className = `feedback ${type}`;
    feedback.style.opacity = '1';
    setTimeout(() => feedback.style.opacity = '0', 3000);
}

async function fetchWords(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch word list');
        const csv = await response.text();
        const rows = csv.split('\n').slice(1).filter(row => row.trim());
        words.english = [];
        words.malay = [];
        rows.forEach(row => {
            const [english, malay] = row.split(',').map(item => item.trim());
            if (english) words.english.push(english);
            if (malay) words.malay.push(malay);
        });
        localStorage.setItem('gauntletCachedWords', JSON.stringify(words));
        return true;
    } catch (error) {
        showFeedback('Error fetching word list. Using cached words.', 'error');
        const cachedWords = localStorage.getItem('gauntletCachedWords');
        if (cachedWords) {
            Object.assign(words, JSON.parse(cachedWords));
            return true;
        }
        return false;
    }
}

function startGauntletGame(event) {
    event.preventDefault();
    const playersInput = document.getElementById('playersInput').value.trim();
    currentLanguage = document.getElementById('languageSelect').value;
    if (!playersInput) {
        showFeedback('Please enter at least one player/team name.', 'error');
        return;
    }
    Object.keys(players).forEach(key => delete players[key]);
    playersInput.split(',').forEach(name => {
        const trimmedName = name.trim();
        if (trimmedName) players[trimmedName] = { score: 0, team: trimmedName };
    });
    currentPlayerIndex = Math.floor(Math.random() * Object.keys(players).length);
    usedWords = { english: [], malay: [] };
    gameActive = true;
    saveSession();
    fetchWords(DEFAULT_WORDLIST_URL).then(success => {
        if (success) {
            showModal('gameScreen');
            updateGameScreen();
        } else {
            showFeedback('No words available. Please check the word list.', 'error');
        }
    });
}

function getRandomWord() {
    let availableWords = [];
    if (currentLanguage === 'english') availableWords = words.english.filter(w => !usedWords.english.includes(w));
    else if (currentLanguage === 'malay') availableWords = words.malay.filter(w => !usedWords.malay.includes(w));
    else availableWords = [...words.english.filter(w => !usedWords.english.includes(w)), ...words.malay.filter(w => !usedWords.malay.includes(w))];
    if (availableWords.length === 0) return null;
    const word = availableWords[Math.floor(Math.random() * availableWords.length)];
    if (words.english.includes(word)) usedWords.english.push(word);
    else usedWords.malay.push(word);
    saveSession();
    return word;
}

function updateGameScreen() {
    if (!gameActive) return;
    const word = getRandomWord();
    if (!word) {
        endGame();
        return;
    }
    const currentPlayer = Object.keys(players)[currentPlayerIndex];
    document.getElementById('currentPlayer').textContent = `Player/Team: ${currentPlayer}`;
    document.getElementById('wordDisplay').textContent = word;
    document.getElementById('thinkingTimer').classList.remove('hidden');
    document.getElementById('singingTimer').classList.add('hidden');
    document.getElementById('scoreForm').classList.add('hidden');
    startThinkingCountdown();
}

function startThinkingCountdown() {
    let timeLeft = 5;
    document.getElementById('thinkingTimer').textContent = `Thinking: ${timeLeft}s`;
    const interval = setInterval(() => {
        timeLeft--;
        document.getElementById('thinkingTimer').textContent = `Thinking: ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(interval);
            startSingingCountdown();
        }
    }, 1000);
}

function startSingingCountdown() {
    document.getElementById('thinkingTimer').classList.add('hidden');
    document.getElementById('singingTimer').classList.remove('hidden');
    let timeLeft = 60;
    document.getElementById('singingTimer').textContent = `Singing: ${timeLeft}s`;
    const interval = setInterval(() => {
        timeLeft--;
        document.getElementById('singingTimer').textContent = `Singing: ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(interval);
            document.getElementById('scoreForm').classList.remove('hidden');
            document.getElementById('scoreInput').focus();
        }
    }, 1000);
}

function submitScore(event) {
    event.preventDefault();
    const scoreInput = document.getElementById('scoreInput');
    const score = parseInt(scoreInput.value);
    if (isNaN(score) || score < 0) {
        showFeedback('Please enter a valid non-negative number.', 'error');
        return;
    }
    const currentPlayer = Object.keys(players)[currentPlayerIndex];
    players[currentPlayer].score += score;
    scoreInput.value = '';
    currentPlayerIndex = (currentPlayerIndex + 1) % Object.keys(players).length;
    saveSession();
    updateGameScreen();
}

function skipWord() {
    if (!gameActive) return;
    updateGameScreen();
}

function endGame() {
    gameActive = false;
    const message = Object.keys(players).length === 0 ? 'No players in the game.' : usedWords.english.length + usedWords.malay.length === words.english.length + words.malay.length ? 'All words used!' : 'Game ended manually.';
    document.getElementById('endGameMessage').textContent = message;
    const leaderboard = document.getElementById('leaderboard');
    leaderboard.innerHTML = '<h3>Leaderboard</h3>';
    const sortedPlayers = Object.entries(players).sort((a, b) => b[1].score - a[1].score);
    sortedPlayers.forEach(([name, data]) => {
        leaderboard.innerHTML += `<p>${name}: ${data.score} songs</p>`;
    });
    showModal('endGameModal');
    saveSession();
}

function resumeGame() {
    if (Object.keys(players).length === 0) {
        showModal('gauntletSetupModal');
        return;
    }
    gameActive = true;
    showModal('gameScreen');
    updateGameScreen();
}

function newGauntletGame() {
    Object.keys(players).forEach(key => delete players[key]);
    usedWords = { english: [], malay: [] };
    saveSession();
    showModal('gauntletSetupModal');
}