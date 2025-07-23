let teams = {};
let currentWord = '';
let languageMode = 'both';
let useEnglish = true;
let usedWords = { english: [], malay: [] };
const defaultSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5MX7qFT32Er41i6EPORV5GH9xsIlh6nwNxsV9_qGTL6PHvDBvNb9I5PhlTycbQyb5-f9ffg4BE5FB/pub?output=csv';
let currentSheetUrl = defaultSheetUrl;
let wordLists = { english: [], malay: [] };
let timerDuration = 15;
const APP_VERSION = '2.0.0-beta';
let deferredPrompt;
let gameActive = false;
let currentTeamIndex = 0;
let timerInterval;

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
        navigator.serviceWorker.register('sw.js')
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
            ripple.style.top = `${e.clientX - rect.top - radius}px`;
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
    document.getElementById('welcomeModal').style.display = 'flex';
});

function saveSessionState() {
    const state = {
        teams: JSON.parse(JSON.stringify(teams)),
        usedWords,
        languageMode,
        useEnglish,
        currentWord,
        currentSheetUrl,
        timerDuration,
        appVersion: APP_VERSION,
        currentTeamIndex
    };
    try {
        localStorage.setItem('gauntletGameState', JSON.stringify(state));
        console.log('Session state saved:', state);
    } catch (e) {
        console.error('Failed to save session state:', e.message);
        showFeedback('Error saving game state. Scores may not persist.', 'red');
    }
}

function loadSessionState() {
    try {
        const state = localStorage.getItem('gauntletGameState');
        if (state) {
            const parsed = JSON.parse(state);
            teams = parsed.teams && typeof parsed.teams === 'object' ? parsed.teams : {};
            usedWords = parsed.usedWords || { english: [], malay: [] };
            languageMode = parsed.languageMode || 'both';
            useEnglish = parsed.useEnglish !== undefined ? parsed.useEnglish : true;
            currentWord = parsed.currentWord || '';
            currentSheetUrl = parsed.currentSheetUrl || defaultSheetUrl;
            timerDuration = parsed.timerDuration || 15;
            currentTeamIndex = parsed.currentTeamIndex || 0;
            console.log('Session state loaded:', parsed);
            document.getElementById('playerInput').value = Object.keys(teams).join(', ');
            document.getElementById('languageSelect').value = languageMode;
            document.getElementById('timerSelect').value = timerDuration;
            document.getElementById('timerSelectSettings').value = timerDuration;
            document.getElementById('customSheetUrl').value = currentSheetUrl;
            if (Object.keys(teams).length > 0) {
                document.getElementById('welcomeModal').style.display = 'none';
                document.getElementById('setupModal').style.display = 'none';
                document.getElementById('gameTab').style.display = 'block';
                document.getElementById('settingsTab').style.display = 'none';
                document.querySelector('.tab-button[onclick="showTab(\'game\')"]').classList.add('active');
                updateLeaderboard();
                updateWordCount();
                if (!wordLists.english.length && !wordLists.malay.length) {
                    fetchWords().then(success => {
                        if (success) {
                            showFeedback('Session restored! Start or resume the game.', 'green');
                            document.getElementById('currentTeam').textContent = `Team: ${Object.keys(teams)[currentTeamIndex]}`;
                            document.getElementById('wordDisplay').textContent = currentWord || 'Press Start Round to begin!';
                            if (currentWord) document.getElementById('wordDisplay').classList.add('fade-in');
                        }
                    });
                } else {
                    showFeedback('Session restored! Start or resume the game.', 'green');
                    document.getElementById('currentTeam').textContent = `Team: ${Object.keys(teams)[currentTeamIndex]}`;
                    document.getElementById('wordDisplay').textContent = currentWord || 'Press Start Round to begin!';
                    if (currentWord) document.getElementById('wordDisplay').classList.add('fade-in');
                }
            } else {
                document.getElementById('welcomeModal').style.display = 'flex';
            }
        } else {
            document.getElementById('welcomeModal').style.display = 'flex';
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
        const response = await fetch('version.txt', { cache: 'no-store' });
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
                        await navigator.serviceWorker.register('sw.js');
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
        title: 'Song Association Game - Gauntlet Mode',
        text: 'Sing one song per turn for a shared word in timed rounds! Play offline with teams.',
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

function showSetupModal() {
    document.getElementById('welcomeModal').style.display = 'none';
    document.getElementById('setupModal').style.display = 'flex';
    document.getElementById('playerInput').focus();
}

function startGame() {
    const playerInput = document.getElementById('playerInput').value.trim();
    languageMode = document.getElementById('languageSelect').value;
    timerDuration = parseInt(document.getElementById('timerSelect').value);
    if (!playerInput) {
        showFeedback('Please enter at least one team name.', 'red');
        return;
    }
    teams = {};
    playerInput.split(',').map(name => name.trim()).filter(name => name).forEach(name => {
        teams[name] = 0;
    });
    currentTeamIndex = Math.floor(Math.random() * Object.keys(teams).length);
    usedWords = { english: [], malay: [] };
    gameActive = true;
    document.getElementById('setupModal').style.display = 'none';
    document.getElementById('gameTab').style.display = 'block';
    document.getElementById('settingsTab').style.display = 'none';
    document.querySelector('.tab-button[onclick="showTab(\'game\')"]').classList.add('active');
    document.querySelector('.tab-button[onclick="showTab(\'settings\')"]').classList.remove('active');
    fetchWords().then(success => {
        if (success) {
            showFeedback('Game started! Press Start Round to begin.', 'green');
            updateGameScreen();
        } else {
            showFeedback('Failed to load words. Check your internet or custom sheet URL in Settings.', 'red');
            gameActive = false;
        }
    });
    saveSessionState();
}

async function fetchWords() {
    const feedback = document.getElementById('feedbackSettings') || document.getElementById('feedback');
    if (!navigator.onLine) {
        const cachedWords = localStorage.getItem('gauntletGameWords');
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
        if (wordLists.malay.length === 0 && wordLists.english.length === 0) {
            throw new Error('No valid words found in the word list. Add words to the Google Sheet.');
        }
        localStorage.setItem('gauntletGameWords', JSON.stringify({ english: wordLists.english, malay: wordLists.malay }));
        usedWords = { english: [], malay: [] };
        saveSessionState();
        showFeedback(`Word list loaded successfully! ${wordLists.english.length} English and ${wordLists.malay.length} Malay words available.`, 'green');
        updateWordCount();
        return true;
    } catch (error) {
        console.error('Error fetching words:', error.message);
        const cachedWords = localStorage.getItem('gauntletGameWords');
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
        showFeedback(`Error: Could not load word list: ${error.message}. Ensure the Google Sheet is public (CSV, “Anyone with the link”).`, 'red');
        return false;
    }
}

function loadCustomSheetUrl() {
    const savedUrl = localStorage.getItem('gauntletCustomSheetUrl');
    if (savedUrl) {
        currentSheetUrl = savedUrl;
        document.getElementById('customSheetUrl').value = savedUrl;
    }
}

function saveCustomSheetUrl() {
    const newUrl = document.getElementById('customSheetUrl').value.trim();
    const feedback = document.getElementById('feedbackSettings');
    if (!newUrl) {
        showFeedback('Please enter a valid Google Sheet CSV URL or use the default word list.', 'red');
        return;
    }
    if (!newUrl.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/.*\/pub\?output=csv$/)) {
        showFeedback('Invalid Google Sheet URL. Use a public CSV link (File > Share > Publish to web > Comma-separated values). See the help guide.', 'red');
        return;
    }
    currentSheetUrl = newUrl;
    localStorage.setItem('gauntletCustomSheetUrl', newUrl);
    showFeedback('Custom sheet URL saved! Refreshing word list...', 'green');
    refreshWordList();
}

function useDefaultSheet() {
    currentSheetUrl = defaultSheetUrl;
    localStorage.removeItem('gauntletCustomSheetUrl');
    document.getElementById('customSheetUrl').value = '';
    showFeedback('Reverted to default word list. Refreshing...', 'green');
    refreshWordList();
}

async function refreshWordList() {
    const feedback = document.getElementById('feedbackSettings');
    showFeedback('Refreshing word list...', 'fade-in');
    usedWords = { english: [], malay: [] };
    const success = await fetchWords();
    if (success) {
        showFeedback(`Word list refreshed! ${wordLists.english.length} English and ${wordLists.malay.length} Malay words available.`, 'green');
        updateGameScreen();
        updateWordCount();
    }
}

function saveTimerDuration() {
    timerDuration = parseInt(document.getElementById('timerSelectSettings').value);
    document.getElementById('timerSelect').value = timerDuration;
    showFeedback(`Timer duration set to ${timerDuration} seconds.`, 'green');
    saveSessionState();
}

function showTab(tabName) {
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
}

function updateGameScreen() {
    if (!gameActive) return;
    const currentTeam = Object.keys(teams)[currentTeamIndex];
    document.getElementById('currentTeam').textContent = `Team: ${currentTeam}`;
    document.getElementById('wordDisplay').textContent = currentWord || 'Press Start Round to begin!';
    document.getElementById('timerDisplay').textContent = '';
    document.getElementById('startRoundBtn').classList.toggle('hidden', !!currentWord);
    document.getElementById('gameControls').classList.toggle('hidden', !currentWord);
    document.getElementById('nextTeamBtn').classList.add('hidden');
    updateWordCount();
    saveSessionState();
}

function getAvailableWords() {
    let availableWords = [];
    if (languageMode === 'both') {
        availableWords = [...wordLists.english.filter(word => !usedWords.english.includes(word)), ...wordLists.malay.filter(word => !usedWords.malay.includes(word))];
        useEnglish = !useEnglish;
    } else {
        const usedWordsKey = languageMode === 'en' ? 'english' : 'malay';
        availableWords = wordLists[usedWordsKey].filter(word => !usedWords[usedWordsKey].includes(word));
    }
    return availableWords;
}

function startRound() {
    const availableWords = getAvailableWords();
    if (availableWords.length === 0) {
        endGame();
        return;
    }
    currentWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    const usedWordsKey = wordLists.english.includes(currentWord) ? 'english' : 'malay';
    usedWords[usedWordsKey].push(currentWord);
    document.getElementById('wordDisplay').textContent = currentWord;
    document.getElementById('wordDisplay').classList.add('fade-in');
    document.getElementById('startRoundBtn').classList.add('hidden');
    document.getElementById('gameControls').classList.remove('hidden');
    startTimer();
    saveSessionState();
}

function startTimer() {
    clearInterval(timerInterval);
    let timeLeft = timerDuration;
    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.textContent = `${timeLeft}s`;
    timerDisplay.setAttribute('aria-label', `${timeLeft} seconds remaining`);
    document.getElementById('doneBtn').disabled = false;
    document.getElementById('forfeitBtn').disabled = false;
    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = `${timeLeft}s`;
        timerDisplay.setAttribute('aria-label', `${timeLeft} seconds remaining`);
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            forfeitTurn(true);
        }
    }, 1000);
}

function doneTurn() {
    clearInterval(timerInterval);
    const currentTeam = Object.keys(teams)[currentTeamIndex];
    teams[currentTeam] = (teams[currentTeam] || 0) + 1;
    showFeedback(`${currentTeam} scored 1 point!`, 'green');
    document.getElementById('doneBtn').disabled = true;
    document.getElementById('forfeitBtn').disabled = true;
    document.getElementById('nextTeamBtn').classList.remove('hidden');
    updateLeaderboard();
    saveSessionState();
}

function forfeitTurn(isTimeout = false) {
    clearInterval(timerInterval);
    const currentTeam = Object.keys(teams)[currentTeamIndex];
    showFeedback(isTimeout ? `${currentTeam}'s time is up!` : `${currentTeam} forfeited their turn.`, 'red');
    document.getElementById('doneBtn').disabled = true;
    document.getElementById('forfeitBtn').disabled = true;
    document.getElementById('nextTeamBtn').classList.remove('hidden');
    saveSessionState();
}

function nextTeam() {
    currentTeamIndex = (currentTeamIndex + 1) % Object.keys(teams).length;
    updateGameScreen();
    startTimer();
}

function proposeNextWord() {
    document.getElementById('nextWordModal').style.display = 'flex';
}

function confirmNextWord(confirmed) {
    document.getElementById('nextWordModal').style.display = 'none';
    if (!confirmed) {
        showFeedback('Next word canceled. Continue with current word.', 'green');
        return;
    }
    currentTeamIndex = (currentTeamIndex + 1) % Object.keys(teams).length;
    currentWord = '';
    document.getElementById('wordDisplay').classList.remove('fade-in');
    showFeedback('Moving to next word!', 'green');
    updateGameScreen();
}

function endGame() {
    gameActive = false;
    clearInterval(timerInterval);
    const finalLeaderboardList = document.getElementById('finalLeaderboardList');
    finalLeaderboardList.innerHTML = '';
    const sortedTeams = Object.entries(teams).sort((a, b) => b[1] - a[1]);
    const maxScore = sortedTeams[0]?.[1] || 0;
    const isTie = sortedTeams.filter(([_, score]) => score === maxScore).length > 1;
    const endGameMessage = document.getElementById('endGameMessage');
    const availableWords = getAvailableWords();
    if (sortedTeams.length === 0) {
        endGameMessage.textContent = 'No teams added. Start a new game!';
        finalLeaderboardList.innerHTML = '<li>No teams added. Start a new game!</li>';
    } else if (availableWords.length === 0) {
        endGameMessage.textContent = isTie ? 'All words used! It’s a tie!' : 'All words used! Final scores:';
        sortedTeams.forEach(([name, score]) => {
            finalLeaderboardList.innerHTML += `<li>${name}: ${score} point${score === 1 ? '' : 's'}</li>`;
        });
    } else {
        endGameMessage.textContent = isTie ? 'It’s a tie! Resume or start a new game.' : 'Final scores:';
        sortedTeams.forEach(([name, score]) => {
            finalLeaderboardList.innerHTML += `<li>${name}: ${score} point${score === 1 ? '' : 's'}</li>`;
        });
    }
    document.getElementById('endGameModal').style.display = 'flex';
    showFeedback('Game ended! Check the final scores.', 'green');
    saveSessionState();
}

function closeEndGameModal() {
    document.getElementById('endGameModal').style.display = 'none';
    teams = {};
    usedWords = { english: [], malay: [] };
    currentWord = '';
    currentTeamIndex = 0;
    document.getElementById('wordDisplay').textContent = '';
    document.getElementById('wordDisplay').classList.remove('fade-in');
    document.getElementById('leaderboardList').innerHTML = '';
    document.getElementById('gameTab').style.display = 'none';
    document.getElementById('settingsTab').style.display = 'none';
    document.getElementById('welcomeModal').style.display = 'flex';
    showFeedback('Session ended. Start a new game.', 'green');
    saveSessionState();
    updateWordCount();
}

function continueGame() {
    if (Object.keys(teams).length === 0) {
        document.getElementById('endGameModal').style.display = 'none';
        document.getElementById('setupModal').style.display = 'flex';
        return;
    }
    gameActive = true;
    document.getElementById('endGameModal').style.display = 'none';
    document.getElementById('gameTab').style.display = 'block';
    document.getElementById('settingsTab').style.display = 'none';
    document.querySelector('.tab-button[onclick="showTab(\'game\')"]').classList.add('active');
    document.querySelector('.tab-button[onclick="showTab(\'settings\')"]').classList.remove('active');
    showFeedback('Game resumed! Continue or start a new round.', 'green');
    updateGameScreen();
}

function startNewGauntletGame() {
    teams = {};
    usedWords = { english: [], malay: [] };
    currentWord = '';
    currentTeamIndex = 0;
    document.getElementById('wordDisplay').textContent = '';
    document.getElementById('wordDisplay').classList.remove('fade-in');
    document.getElementById('leaderboardList').innerHTML = '';
    document.getElementById('endGameModal').style.display = 'none';
    document.getElementById('setupModal').style.display = 'flex';
    document.getElementById('playerInput').value = '';
    document.getElementById('languageSelect').value = languageMode;
    document.getElementById('timerSelect').value = timerDuration;
    showFeedback('Setup a new Gauntlet Mode game.', 'green');
    saveSessionState();
    updateWordCount();
}

function updateLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    Object.entries(teams).sort((a, b) => b[1] - a[1]).forEach(([name, score]) => {
        const li = document.createElement('li');
        li.innerHTML = `${name}: ${score} point${score === 1 ? '' : 's'}`;
        leaderboardList.appendChild(li);
    });
    saveSessionState();
}

function toggleLeaderboard() {
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

function resetGame() {
    document.getElementById('resetModal').style.display = 'flex';
}

function confirmReset(confirmed) {
    document.getElementById('resetModal').style.display = 'none';
    if (!confirmed) {
        showFeedback('Game reset canceled.', 'green');
        return;
    }
    teams = {};
    wordLists = { english: [], malay: [] };
    usedWords = { english: [], malay: [] };
    currentWord = '';
    languageMode = 'both';
    useEnglish = true;
    timerDuration = 15;
    currentSheetUrl = defaultSheetUrl;
    localStorage.removeItem('gauntletCustomSheetUrl');
    document.getElementById('customSheetUrl').value = '';
    document.getElementById('timerSelect').value = timerDuration;
    document.getElementById('timerSelectSettings').value = timerDuration;
    document.getElementById('wordDisplay').textContent = '';
    document.getElementById('wordDisplay').classList.remove('fade-in');
    document.getElementById('leaderboardList').innerHTML = '';
    document.getElementById('gameTab').style.display = 'none';
    document.getElementById('settingsTab').style.display = 'none';
    document.getElementById('welcomeModal').style.display = 'flex';
    showFeedback('Game reset successfully!', 'green');
    localStorage.removeItem('gauntletGameState');
    updateWordCount();
}

function updateWordCount() {
    const availableWords = getAvailableWords();
    document.getElementById('wordCountDisplay').textContent = `Words remaining: ${availableWords.length}`;
}