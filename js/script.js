let players = {};
let currentWord = '';
let languageMode = 'en';
let useEnglish = true;
let gameMode = '';
let usedWords = { english: [], malay: [] };
const defaultSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5MX7qFT32Er41i6EPORV5GH9xsIlh6nwNxsV9_qGTL6PHvDBvNb9I5PhlTycbQyb5-f9ffg4BE5FB/pub?output=csv';
let currentSheetUrl = defaultSheetUrl;
let wordLists = { english: [], malay: [] };
const APP_VERSION = '2.0.0-beta';
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installButton').classList.remove('hidden');
    console.log('Install prompt captured');
});

window.addEventListener('load', () => {
    loadSessionState();
    checkForUpdates();
    setInterval(checkForUpdates, 300000);
    loadCustomSheetUrl();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered:', reg))
            .catch(err => console.error('Service Worker registration failed:', err));
    }
    document.querySelectorAll('button, select, input').forEach(element => {
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && element.tagName === 'BUTTON') {
                element.click();
            }
        });
    });
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (navigator.vibrate) navigator.vibrate(50);
            const rect = btn.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            const diameter = Math.max(btn.clientWidth, btn.clientHeight);
            const radius = diameter / 2;
            ripple.style.width = ripple.style.height = `${diameter}px`;
            ripple.style.left = `${e.clientX - rect.left - radius}px`;
            ripple.style.top = `${e.clientY - rect.top - radius}px`;
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
    if (window.location.hash === '#modeModal') {
        document.getElementById('welcomeModal').style.display = 'none';
        document.getElementById('modeModal').style.display = 'flex';
    }
});

function saveSessionState() {
    const state = {
        players: JSON.parse(JSON.stringify(players)),
        usedWords: JSON.parse(JSON.stringify(usedWords)),
        gameMode,
        languageMode,
        useEnglish,
        currentWord,
        currentSheetUrl,
        appVersion: APP_VERSION
    };
    try {
        localStorage.setItem('songGameState', JSON.stringify(state));
        console.log('Session state saved:', state);
    } catch (e) {
        console.error('Failed to save session state:', e.message);
        showFeedback('Error saving game state. Scores may not persist.', 'red');
    }
}

function loadSessionState() {
    try {
        const state = localStorage.getItem('songGameState');
        if (state) {
            const parsed = JSON.parse(state);
            players = parsed.players && typeof parsed.players === 'object' ? parsed.players : {};
            usedWords = parsed.usedWords || { english: [], malay: [] };
            gameMode = parsed.gameMode || '';
            languageMode = parsed.languageMode || 'en';
            useEnglish = parsed.useEnglish !== undefined ? parsed.useEnglish : true;
            currentWord = parsed.currentWord || '';
            currentSheetUrl = parsed.currentSheetUrl || defaultSheetUrl;
            console.log('Session state loaded:', parsed);
            document.getElementById('playerInput').value = Object.keys(players).join(', ');
            document.getElementById('languageSelect').value = languageMode;
            document.getElementById('customSheetUrl').value = currentSheetUrl;
            document.getElementById('languageChangeSelect').value = languageMode;
            if (gameMode) {
                document.getElementById('welcomeModal').style.display = 'none';
                document.getElementById('modeModal').style.display = 'none';
                document.getElementById('setupModal').style.display = 'none';
                document.getElementById('gameTab').style.display = 'block';
                document.getElementById('settingsTab').style.display = 'none';
                document.querySelector('.tab-button[onclick="showTab(\'game\')"]').classList.add('active');
                document.querySelector('.tab-button[onclick="showTab(\'settings\')"]').classList.remove('active');
                if (gameMode === 'casual') {
                    document.getElementById('settingsTabButton').classList.add('hidden');
                    document.getElementById('playerSelect').classList.add('hidden');
                    document.getElementById('skipWordBtn').classList.add('hidden');
                    document.getElementById('endGameBtn').classList.add('hidden');
                    document.getElementById('resetModeBtn').classList.remove('hidden');
                    document.getElementById('generateWordBtn').disabled = false;
                } else if (gameMode === 'regular') {
                    document.getElementById('settingsTabButton').classList.remove('hidden');
                    document.getElementById('playerSelect').classList.remove('hidden');
                    document.getElementById('skipWordBtn').classList.remove('hidden');
                    document.getElementById('endGameBtn').classList.remove('hidden');
                    document.getElementById('resetModeBtn').classList.add('hidden');
                }
                updatePlayerSelect();
                updateRemovePlayerSelect();
                updateLeaderboard();
                updateWordCount();
                if (!wordLists.english.length && !wordLists.malay.length) {
                    fetchWords().then(success => {
                        if (success) {
                            showFeedback('Session restored! Continue playing.', 'green');
                        }
                    });
                } else {
                    showFeedback('Session restored! Continue playing.', 'green');
                }
            } else {
                document.getElementById('welcomeModal').style.display = 'flex';
                document.getElementById('leaderboard').style.display = 'none';
                document.getElementById('toggleLeaderboard').innerHTML = '<i class="fas fa-trophy"></i> Show Leaderboard';
            }
        } else {
            document.getElementById('welcomeModal').style.display = 'flex';
            document.getElementById('leaderboard').style.display = 'none';
            document.getElementById('toggleLeaderboard').innerHTML = '<i class="fas fa-trophy"></i> Show Leaderboard';
        }
    } catch (e) {
        console.error('Failed to load session state:', e.message);
        showFeedback('Error loading game state. Starting fresh.', 'red');
        document.getElementById('welcomeModal').style.display = 'flex';
    }
}

function showFeedback(message, className) {
    const feedback = document.getElementById('feedback') || document.getElementById('feedbackSettings');
    feedback.textContent = message;
    feedback.className = className + ' fade-in';
}

async function checkForUpdates() {
    const updateNotice = document.getElementById('updateNotice');
    try {
        const response = await fetch('./version.txt', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } });
        if (!response.ok) {
            console.warn(`Version check failed: HTTP ${response.status}`);
            updateNotice.style.display = 'none';
            return;
        }
        const serverVersion = await response.text();
        if (serverVersion.trim() !== APP_VERSION) {
            updateNotice.style.display = 'block';
            updateNotice.onclick = async () => {
                try {
                    if ('serviceWorker' in navigator) {
                        const reg = await navigator.serviceWorker.getRegistration();
                        if (reg) await reg.unregister();
                        console.log('Service worker unregistered for version update');
                        await navigator.serviceWorker.register('./sw.js');
                        console.log('Service worker re-registered');
                    }
                    location.reload();
                    updateNotice.style.display = 'none';
                } catch (e) {
                    console.error('Failed to update service worker:', e.message);
                    showFeedback('Update failed. Clear browser cache and try again.', 'red');
                }
            };
        } else {
            updateNotice.style.display = 'none';
        }
    } catch (e) {
        console.warn('Version check failed:', e.message);
        updateNotice.style.display = 'none';
    }
}

async function shareApp() {
    const shareData = {
        title: 'Song Association Game',
        text: gameMode === 'casual' ? 'Generate random words to sing songs in English or Malay! Play offline.' : 'Sing songs matching random words in English or Malay! Play offline with friends.',
        url: 'https://izzoe3.github.io/song-game/'
    };
    try {
        if (navigator.share) {
            await navigator.share(shareData);
            showFeedback('Game shared successfully!', 'green');
        } else {
            navigator.clipboard.writeText(shareData.url);
            showFeedback('Link copied to clipboard!', 'green');
        }
    } catch (err) {
        showFeedback('Failed to share. Copy this link: ' + shareData.url, 'red');
    }
}

function installApp() {
    if (!deferredPrompt) {
        showFeedback('App installation not available. Add to home screen manually.', 'red');
        console.warn('Install prompt unavailable');
        return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            showFeedback('App installed successfully!', 'green');
        } else {
            showFeedback('App installation canceled.', 'red');
        }
        deferredPrompt = null;
        document.getElementById('installButton').classList.add('hidden');
    });
}

function showModeModal() {
    document.getElementById('welcomeModal').style.display = 'none';
    document.getElementById('modeModal').style.display = 'flex';
}

function changeMode() {
    document.getElementById('changeModeModal').style.display = 'flex';
}

function confirmChangeMode(confirmed) {
    document.getElementById('changeModeModal').style.display = 'none';
    if (!confirmed) {
        showFeedback('Mode change canceled.', 'green');
        document.getElementById('endGameModal').style.display = 'none';
        return;
    }
    const targetMode = document.getElementById('changeModeModal').dataset.targetMode || '';
    localStorage.removeItem('songGameState');
    localStorage.removeItem('gauntletGameState');
    localStorage.removeItem('songGameWords');
    localStorage.removeItem('gauntletGameWords');
    localStorage.removeItem('customSheetUrl');
    localStorage.removeItem('gauntletCustomSheetUrl');
    players = {};
    usedWords = { english: [], malay: [] };
    currentWord = '';
    gameMode = '';
    document.getElementById('wordDisplay').textContent = '';
    document.getElementById('wordDisplay').classList.remove('fade-in');
    document.getElementById('playerSelect').innerHTML = '<option value="">Select Player</option>';
    document.getElementById('removePlayerSelect').innerHTML = '<option value="">Select player to remove</option>';
    document.getElementById('leaderboardList').innerHTML = '';
    document.getElementById('gameTab').style.display = 'none';
    document.getElementById('settingsTab').style.display = 'none';
    document.getElementById('welcomeModal').style.display = 'none';
    document.getElementById('endGameModal').style.display = 'none';
    document.getElementById('modeModal').style.display = 'flex';
    showFeedback('Game data cleared. Choose a new game mode.', 'green');
    if (targetMode) {
        proceedToMode(targetMode);
    }
}

function selectMode(mode) {
    if (gameMode && gameMode !== mode) {
        document.getElementById('changeModeModal').style.display = 'flex';
        document.getElementById('changeModeModal').dataset.targetMode = mode;
        return;
    }
    proceedToMode(mode);
}

function proceedToMode(mode) {
    gameMode = mode;
    if (mode === 'gauntlet') {
        document.getElementById('feedback').textContent = 'Switching to Gauntlet Mode...';
        document.getElementById('feedback').className = 'green fade-in';
        window.location.href = 'index-gauntlet.html';
        return;
    }
    document.getElementById('modeModal').style.display = 'none';
    document.getElementById('setupModal').style.display = 'flex';
    const playerInput = document.getElementById('playerInput');
    const setupTitle = document.getElementById('setupTitle');
    if (mode === 'casual') {
        playerInput.classList.add('hidden');
        setupTitle.textContent = 'Setup Word Generator';
    } else {
        playerInput.classList.remove('hidden');
        playerInput.placeholder = 'Enter player names (e.g., Alice, Bob)';
        setupTitle.textContent = 'Setup Game';
    }
    saveSessionState();
}

function startGame() {
    const playerInput = document.getElementById('playerInput').value.trim();
    languageMode = document.getElementById('languageSelect').value;
    if (gameMode === 'regular' && !playerInput) {
        showFeedback('Please enter at least one player name for Regular Mode.', 'red');
        return;
    }
    if (gameMode === 'regular') {
        players = {};
        playerInput.split(',').map(name => name.trim()).filter(name => name).forEach(name => {
            players[name] = 0;
        });
    }
    document.getElementById('setupModal').style.display = 'none';
    document.getElementById('gameTab').style.display = 'block';
    document.getElementById('settingsTab').style.display = 'none';
    document.querySelector('.tab-button[onclick="showTab(\'game\')"]').classList.add('active');
    document.querySelector('.tab-button[onclick="showTab(\'settings\')"]').classList.remove('active');
    if (gameMode === 'casual') {
        document.getElementById('settingsTabButton').classList.add('hidden');
        document.getElementById('playerSelect').classList.add('hidden');
        document.getElementById('skipWordBtn').classList.add('hidden');
        document.getElementById('endGameBtn').classList.add('hidden');
        document.getElementById('resetModeBtn').classList.remove('hidden');
        document.getElementById('generateWordBtn').disabled = false;
    } else if (gameMode === 'regular') {
        document.getElementById('settingsTabButton').classList.remove('hidden');
        document.getElementById('playerSelect').classList.remove('hidden');
        document.getElementById('skipWordBtn').classList.remove('hidden');
        document.getElementById('endGameBtn').classList.remove('hidden');
        document.getElementById('resetModeBtn').classList.add('hidden');
    }
    fetchWords().then(success => {
        if (success) {
            showFeedback('Game started! Generate a word to begin.', 'green');
            if (gameMode === 'regular') {
                updatePlayerSelect();
                updateRemovePlayerSelect();
                updateLeaderboard();
            }
            generateWord(true);
            updateWordCount();
        } else {
            showFeedback('Failed to load words. Check your internet or custom sheet URL in Settings.', 'red');
        }
    });
    saveSessionState();
}

function loadCustomSheetUrl() {
    const savedUrl = localStorage.getItem('customSheetUrl');
    if (savedUrl) {
        currentSheetUrl = savedUrl;
        document.getElementById('customSheetUrl').value = savedUrl;
    }
}

function saveCustomSheetUrl() {
    const newUrl = document.getElementById('customSheetUrl').value.trim();
    if (!newUrl) {
        showFeedback('Please enter a valid Google Sheet CSV URL or use the default word list.', 'red');
        return;
    }
    if (!newUrl.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/.*\/pub\?output=csv$/)) {
        showFeedback('Invalid Google Sheet URL. Use a public CSV link (File > Share > Publish to web > Comma-separated values). See the help guide.', 'red');
        return;
    }
    currentSheetUrl = newUrl;
    localStorage.setItem('customSheetUrl', newUrl);
    showFeedback('Custom sheet URL saved! Refreshing word list...', 'green');
    refreshWordList();
}

function useDefaultSheet() {
    currentSheetUrl = defaultSheetUrl;
    localStorage.removeItem('customSheetUrl');
    document.getElementById('customSheetUrl').value = '';
    showFeedback('Reverted to default word list. Refreshing...', 'green');
    refreshWordList();
}

async function fetchWords() {
    const feedback = document.getElementById('feedbackSettings') || document.getElementById('feedback');
    if (!navigator.onLine) {
        const cachedWords = localStorage.getItem('songGameWords');
        if (cachedWords) {
            const { english, malay } = JSON.parse(cachedWords);
            wordLists.english = english || [];
            wordLists.malay = malay || [];
            if (wordLists.english.length || wordLists.malay.length) {
                showFeedback(`Offline: Using cached word list with ${wordLists.english.length} English and ${wordLists.malay.length} Malay words.`, 'green');
                updateWordCount();
                return true;
            }
        }
        showFeedback('Offline: No cached words available. Connect to the internet to load words.', 'red');
        return false;
    }
    try {
        const response = await fetch(currentSheetUrl, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: Failed to fetch word list. Ensure the Google Sheet is public and published as CSV.`);
        }
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => row.split(',').map(cell => cell.trim()));
        const headers = rows[0].map(header => header.toLowerCase());
        const malayCol = headers.indexOf('malay');
        const englishCol = headers.indexOf('english');
        if (malayCol === -1 || englishCol === -1) {
            throw new Error('Headers "Malay" or "English" not found in word list. Check the Google Sheet format in the help guide.');
        }
        wordLists.malay = rows.slice(1).map(row => row[malayCol]).filter(word => word && word !== '');
        wordLists.english = rows.slice(1).map(row => row[englishCol]).filter(word => word && word !== '');
        console.log('Fetched words:', { english: wordLists.english.length, malay: wordLists.malay.length });
        if (wordLists.malay.length === 0 && wordLists.english.length === 0) {
            throw new Error('No valid words found in the word list. Add words to the Google Sheet.');
        }
        localStorage.setItem('songGameWords', JSON.stringify({ english: wordLists.english, malay: wordLists.malay }));
        usedWords = { english: [], malay: [] };
        saveSessionState();
        showFeedback(`Word list loaded successfully! ${wordLists.english.length} English and ${wordLists.malay.length} Malay words available.`, 'green');
        updateWordCount();
        return true;
    } catch (error) {
        console.error('Error fetching words:', error.message);
        const cachedWords = localStorage.getItem('songGameWords');
        if (cachedWords) {
            const { english, malay } = JSON.parse(cachedWords);
            wordLists.english = english || [];
            wordLists.malay = malay || [];
            if (wordLists.english.length || wordLists.malay.length) {
                showFeedback(`Error fetching words: ${error.message}. Using cached word list with ${wordLists.english.length} English and ${wordLists.malay.length} Malay words.`, 'green');
                updateWordCount();
                return true;
            }
        }
        showFeedback(`Error: Could not load word list: ${error.message}. Ensure the Google Sheet is public (CSV, “Anyone with the link”). Retry in Settings or see the help guide.`, 'red');
        return false;
    }
}

async function refreshWordList() {
    showFeedback(`Refreshing word list from ${currentSheetUrl === defaultSheetUrl ? 'default' : 'custom'} sheet...`, 'fade-in');
    usedWords = { english: [], malay: [] };
    const success = await fetchWords();
    if (success) {
        showFeedback(`Word list refreshed! ${wordLists.english.length} English and ${wordLists.malay.length} Malay words available.`, 'green');
        generateWord(true);
        updateWordCount();
    }
}

function endGame() {
    if (gameMode === 'casual') return;
    const finalLeaderboardList = document.getElementById('finalLeaderboardList');
    finalLeaderboardList.innerHTML = '';
    const sortedPlayers = Object.entries(players).sort((a, b) => b[1] - a[1]);
    const maxScore = sortedPlayers[0]?.[1] || 0;
    const isTie = sortedPlayers.filter(([_, score]) => score === maxScore).length > 1;
    const endGameMessage = document.getElementById('endGameMessage');
    const availableWords = getAvailableWords();
    if (sortedPlayers.length === 0) {
        endGameMessage.textContent = 'No players added. Start a new game!';
        finalLeaderboardList.innerHTML = '<li>No players added. Start a new game!</li>';
    } else if (availableWords.length === 0) {
        endGameMessage.textContent = isTie ? 'All words used! It’s a tie!' : 'All words used! Final scores:';
        sortedPlayers.forEach(([name, score]) => {
            finalLeaderboardList.innerHTML += `<li>${name}: ${score} point${score === 1 ? '' : 's'}</li>`;
        });
    } else {
        endGameMessage.textContent = isTie ? 'It’s a tie! Resume or start a new game.' : 'Final scores:';
        sortedPlayers.forEach(([name, score]) => {
            finalLeaderboardList.innerHTML += `<li>${name}: ${score} point${score === 1 ? '' : 's'}</li>`;
        });
    }
    document.getElementById('endGameModal').style.display = 'flex';
    showFeedback('Game ended! Check the final scores.', 'green');
    saveSessionState();
}

function closeEndGameModal() {
    document.getElementById('endGameModal').style.display = 'none';
    players = {};
    usedWords = { english: [], malay: [] };
    currentWord = '';
    document.getElementById('wordDisplay').textContent = '';
    document.getElementById('wordDisplay').classList.remove('fade-in');
    document.getElementById('playerSelect').innerHTML = '<option value="">Select Player</option>';
    document.getElementById('removePlayerSelect').innerHTML = '<option value="">Select player to remove</option>';
    document.getElementById('leaderboardList').innerHTML = '';
    document.getElementById('gameTab').style.display = 'none';
    document.getElementById('settingsTab').style.display = 'none';
    document.getElementById('modeModal').style.display = 'flex';
    showFeedback('Session ended. Choose a new game mode.', 'green');
    saveSessionState();
    updateWordCount();
}

function continueGame() {
    if (Object.keys(players).length === 0 && gameMode === 'regular') {
        document.getElementById('endGameModal').style.display = 'none';
        document.getElementById('setupModal').style.display = 'flex';
        document.getElementById('setupTitle').textContent = 'Setup Game';
        document.getElementById('playerInput').classList.remove('hidden');
        return;
    }
    document.getElementById('endGameModal').style.display = 'none';
    document.getElementById('gameTab').style.display = 'block';
    document.getElementById('settingsTab').style.display = 'none';
    document.querySelector('.tab-button[onclick="showTab(\'game\')"]').classList.add('active');
    document.querySelector('.tab-button[onclick="showTab(\'settings\')"]').classList.remove('active');
    showFeedback('Game resumed! Continue playing.', 'green');
    document.getElementById('generateWordBtn').disabled = gameMode === 'regular' && !document.getElementById('playerSelect').value;
    saveSessionState();
}

function startNewRegularGame() {
    players = {};
    usedWords = { english: [], malay: [] };
    currentWord = '';
    document.getElementById('wordDisplay').textContent = '';
    document.getElementById('wordDisplay').classList.remove('fade-in');
    document.getElementById('playerSelect').innerHTML = '<option value="">Select Player</option>';
    document.getElementById('removePlayerSelect').innerHTML = '<option value="">Select player to remove</option>';
    document.getElementById('leaderboardList').innerHTML = '';
    document.getElementById('endGameModal').style.display = 'none';
    document.getElementById('setupModal').style.display = 'flex';
    document.getElementById('setupTitle').textContent = 'Setup Game';
    document.getElementById('playerInput').classList.remove('hidden');
    document.getElementById('playerInput').value = '';
    document.getElementById('playerInput').placeholder = 'Enter player names (e.g., Alice, Bob)';
    document.getElementById('languageSelect').value = languageMode;
    document.getElementById('generateWordBtn').disabled = true;
    showFeedback('Setup a new Regular Mode game.', 'green');
    saveSessionState();
    updateWordCount();
}

function showTab(tabName) {
    if (gameMode === 'casual' && tabName === 'settings') {
        return;
    }
    document.getElementById('gameTab').style.display = tabName === 'game' ? 'block' : 'none';
    document.getElementById('settingsTab').style.display = tabName === 'settings' ? 'block' : 'none';
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-button[onclick="showTab('${tabName}')"]`).classList.add('active');
    document.getElementById('feedback').textContent = '';
    document.getElementById('feedback').classList.remove('fade-in');
    document.getElementById('feedbackSettings').textContent = '';
    document.getElementById('feedbackSettings').classList.remove('fade-in');
    if (tabName === 'settings') {
        document.getElementById('leaderboard').style.display = 'none';
        document.getElementById('toggleLeaderboard').innerHTML = '<i class="fas fa-trophy"></i> Show Leaderboard';
    }
    enableGenerateButton();
}

function updatePlayerSelect() {
    if (gameMode !== 'regular') return;
    const playerSelect = document.getElementById('playerSelect');
    const previousValue = playerSelect.value;
    playerSelect.innerHTML = '<option value="">Select Player</option>';
    Object.keys(players).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        playerSelect.appendChild(option);
    });
    playerSelect.value = previousValue && players[previousValue] ? previousValue : '';
    enableGenerateButton();
    saveSessionState();
}

function updateRemovePlayerSelect() {
    if (gameMode === 'casual') return;
    const removePlayerSelect = document.getElementById('removePlayerSelect');
    removePlayerSelect.innerHTML = '<option value="">Select player to remove</option>';
    Object.keys(players).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        removePlayerSelect.appendChild(option);
    });
}

function updateLeaderboard() {
    if (gameMode === 'casual') return;
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    Object.entries(players).sort((a, b) => b[1] - a[1]).forEach(([name, score]) => {
        const li = document.createElement('li');
        li.innerHTML = `${name}: ${score} point${score === 1 ? '' : 's'} <button class="score-btn" onclick="incrementScore('${name}')" aria-label="Add point to ${name}"><i class="fas fa-plus"></i></button><button class="score-btn" onclick="decrementScore('${name}')" aria-label="Remove point from ${name}"><i class="fas fa-minus"></i></button>`;
        leaderboardList.appendChild(li);
    });
    saveSessionState();
}

function incrementScore(player) {
    if (gameMode !== 'regular') return;
    players[player] = (players[player] || 0) + 1;
    showFeedback(`Added 1 point to ${player}.`, 'green');
    updateLeaderboard();
    updatePlayerSelect();
    saveSessionState();
}

function decrementScore(player) {
    if (gameMode !== 'regular') return;
    if (players[player] > 0) {
        players[player] -= 1;
        showFeedback(`Removed 1 point from ${player}.`, 'green');
    } else {
        showFeedback(`${player} already has 0 points.`, 'red');
    }
    updateLeaderboard();
    updatePlayerSelect();
    saveSessionState();
}

function toggleLeaderboard() {
    if (gameMode === 'casual') return;
    const leaderboard = document.getElementById('leaderboard');
    const button = document.getElementById('toggleLeaderboard');
    if (leaderboard.style.display === 'none') {
        leaderboard.style.display = 'block';
        button.innerHTML = '<i class="fas fa-trophy"></i> Hide Leaderboard';
    } else {
        leaderboard.style.display = 'none';
        button.innerHTML = '<i class="fas fa-trophy"></i> Show Leaderboard';
    }
}

function enableGenerateButton() {
    if (gameMode !== 'regular') return;
    const player = document.getElementById('playerSelect').value;
    const generateBtn = document.getElementById('generateWordBtn');
    generateBtn.disabled = !player;
}

function updateWordCount() {
    let availableWords = getAvailableWords();
    document.getElementById('wordCountDisplay').textContent = `Words remaining: ${availableWords.length}`;
}

function getAvailableWords() {
    let availableWords = [];
    if (languageMode === 'both') {
        availableWords = [...wordLists.english.filter(word => !usedWords.english.includes(word)), ...wordLists.malay.filter(word => !usedWords.malay.includes(word))];
    } else {
        const usedWordsKey = languageMode === 'en' ? 'english' : 'malay';
        availableWords = wordLists[usedWordsKey].filter(word => !usedWords[usedWordsKey].includes(word));
    }
    return availableWords;
}

function generateWord(initial = false) {
    const player = document.getElementById('playerSelect').value;
    const generateBtn = document.getElementById('generateWordBtn');
    const resetUsedWordsBtn = document.getElementById('resetUsedWordsBtn');

    if (gameMode === 'regular' && !initial && !player) {
        showFeedback('Please select a player to generate a new word.', 'red');
        generateBtn.disabled = true;
        return;
    }

    if (gameMode === 'regular' && !initial && player) {
        players[player] = (players[player] || 0) + 1;
        showFeedback(`Nice singing, ${player}! You earn 1 point!`, 'green');
    } else if (gameMode === 'casual') {
        showFeedback('New word generated!', 'green');
    }

    let lang = languageMode;
    let wordList = [];
    let usedWordsKey = '';
    if (languageMode === 'both') {
        lang = useEnglish ? 'en' : 'ms';
        usedWordsKey = useEnglish ? 'english' : 'malay';
        wordList = useEnglish ? wordLists.english : wordLists.malay;
        useEnglish = !useEnglish;
    } else {
        lang = languageMode;
        usedWordsKey = languageMode === 'en' ? 'english' : 'malay';
        wordList = languageMode === 'en' ? wordLists.english : wordLists.malay;
    }

    const availableWords = wordList.filter(word => !usedWords[usedWordsKey].includes(word));
    if (availableWords.length === 0) {
        document.getElementById('wordDisplay').textContent = 'No more words available.';
        document.getElementById('wordDisplay').classList.add('fade-in');
        showFeedback(`No more ${usedWordsKey === 'english' ? 'English' : 'Malay'} words available. Reset used words or refresh the word list in Settings (Regular Mode only).`, 'red');
        resetUsedWordsBtn.classList.remove('hidden');
        if (gameMode === 'regular') generateBtn.disabled = true;
        updateWordCount();
        return;
    }

    currentWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    usedWords[usedWordsKey].push(currentWord);
    document.getElementById('wordDisplay').textContent = currentWord;
    document.getElementById('wordDisplay').classList.add('fade-in');
    if (gameMode === 'regular' && !initial) {
        document.getElementById('playerSelect').value = '';
        generateBtn.disabled = true;
    }
    if (gameMode === 'casual') {
        generateBtn.disabled = false;
    }
    updateLeaderboard();
    saveSessionState();
    updateWordCount();
}

function skipWord() {
    if (gameMode !== 'regular') return;
    let wordList;
    let lang;
    let usedWordsKey;
    if (languageMode === 'both') {
        lang = Math.random() < 0.5 ? 'en' : 'ms';
        usedWordsKey = lang === 'en' ? 'english' : 'malay';
        wordList = lang === 'en' ? wordLists.english : wordLists.malay;
    } else {
        lang = languageMode;
        usedWordsKey = languageMode === 'en' ? 'english' : 'malay';
        wordList = languageMode === 'en' ? wordLists.english : wordLists.malay;
    }
    const availableWords = wordList.filter(word => !usedWords[usedWordsKey].includes(word));
    if (availableWords.length === 0) {
        document.getElementById('wordDisplay').textContent = 'No more words available.';
        document.getElementById('wordDisplay').classList.add('fade-in');
        showFeedback(`No more ${usedWordsKey === 'english' ? 'English' : 'Malay'} words available. Reset used words or refresh the word list in Settings.`, 'red');
        document.getElementById('generateWordBtn').disabled = true;
        document.getElementById('resetUsedWordsBtn').classList.remove('hidden');
        updateWordCount();
        return;
    }
    currentWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    usedWords[usedWordsKey].push(currentWord);
    document.getElementById('wordDisplay').textContent = currentWord;
    document.getElementById('wordDisplay').classList.add('fade-in');
    document.getElementById('playerSelect').value = '';
    document.getElementById('generateWordBtn').disabled = true;
    showFeedback('Word skipped! New word generated.', 'green');
    saveSessionState();
    updateWordCount();
}

function addPlayer() {
    if (gameMode === 'casual') return;
    const newPlayer = document.getElementById('addPlayerInput').value.trim();
    if (!newPlayer) {
        showFeedback('Please enter a player name to add.', 'red');
        return;
    }
    if (players[newPlayer]) {
        showFeedback(`Player "${newPlayer}" already exists.`, 'red');
        return;
    }
    players[newPlayer] = 0;
    updatePlayerSelect();
    updateRemovePlayerSelect();
    updateLeaderboard();
    document.getElementById('addPlayerInput').value = '';
    showFeedback(`Player "${newPlayer}" added!`, 'green');
    saveSessionState();
}

function removePlayer() {
    if (gameMode === 'casual') return;
    const playerToRemove = document.getElementById('removePlayerSelect').value;
    if (!playerToRemove) {
        showFeedback('Please select a player to remove.', 'red');
        return;
    }
    delete players[playerToRemove];
    updatePlayerSelect();
    updateRemovePlayerSelect();
    updateLeaderboard();
    showFeedback(`Player "${playerToRemove}" removed!`, 'green');
    saveSessionState();
}

function changeLanguage() {
    languageMode = document.getElementById('languageChangeSelect').value;
    useEnglish = true;
    showFeedback(`Language changed to ${languageMode === 'en' ? 'English' : languageMode === 'ms' ? 'Malay' : 'Both'}.`, 'green');
    document.getElementById('resetUsedWordsBtn').classList.add('hidden');
    generateWord(true);
    updateWordCount();
    saveSessionState();
}

function resetGame() {
    document.getElementById('resetModal').style.display = 'flex';
}

function confirmReset(confirmed) {
    document.getElementById('resetModal').style.display = 'none';
    if (!confirmed) {
        showFeedback('Game reset canceled.', 'green');
        return;
    }
    players = {};
    wordLists = { english: [], malay: [] };
    usedWords = { english: [], malay: [] };
    currentWord = '';
    languageMode = 'en';
    useEnglish = true;
    currentSheetUrl = defaultSheetUrl;
    localStorage.removeItem('customSheetUrl');
    document.getElementById('customSheetUrl').value = '';
    document.getElementById('wordDisplay').textContent = '';
    document.getElementById('wordDisplay').classList.remove('fade-in');
    document.getElementById('playerSelect').innerHTML = '<option value="">Select Player</option>';
    document.getElementById('removePlayerSelect').innerHTML = '<option value="">Select player to remove</option>';
    document.getElementById('leaderboardList').innerHTML = '';
    document.getElementById('gameTab').style.display = 'none';
    document.getElementById('settingsTab').style.display = 'none';
    document.getElementById('welcomeModal').style.display = 'flex';
    document.getElementById('settingsTabButton').classList.remove('hidden');
    document.getElementById('playerSelect').classList.remove('hidden');
    document.getElementById('skipWordBtn').classList.remove('hidden');
    document.getElementById('endGameBtn').classList.remove('hidden');
    document.getElementById('resetModeBtn').classList.add('hidden');
    document.getElementById('resetUsedWordsBtn').classList.add('hidden');
    document.getElementById('generateWordBtn').disabled = true;
    document.getElementById('leaderboard').style.display = 'none';
    document.getElementById('toggleLeaderboard').innerHTML = '<i class="fas fa-trophy"></i> Show Leaderboard';
    showFeedback('Game reset successfully!', 'green');
    localStorage.removeItem('songGameState');
    updateWordCount();
}

function resetUsedWords() {
    usedWords = { english: [], malay: [] };
    document.getElementById('resetUsedWordsBtn').classList.add('hidden');
    showFeedback('Used words reset! New words available.', 'green');
    document.getElementById('generateWordBtn').disabled = gameMode === 'regular' && !document.getElementById('playerSelect').value;
    generateWord(true);
    updateWordCount();
    saveSessionState();
}