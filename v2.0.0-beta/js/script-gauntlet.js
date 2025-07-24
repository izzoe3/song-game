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
let isGracePeriod = false;
let hasTurnEnded = false;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
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
            ripple.style.top = `${e.clientY - rect.top - radius}px`;
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
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
        currentTeamIndex,
        hasTurnEnded
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
            hasTurnEnded = parsed.hasTurnEnded || false;
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
                            if (currentWord) {
                                document.getElementById('wordDisplay').classList.add('fade-in');
                                startGracePeriod();
                            }
                        }
                    });
                } else {
                    showFeedback('Session restored! Start or resume the game.', 'green');
                    document.getElementById('currentTeam').textContent = `Team: ${Object.keys(teams)[currentTeamIndex]}`;
                    document.getElementById('wordDisplay').textContent = currentWord || 'Press Start Round to begin!';
                    if (currentWord) {
                        document.getElementById('wordDisplay').classList.add('fade-in');
                        startGracePeriod();
                    }
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
        text: 'Sing one song per turn for a shared word in timed rounds! Play offline with teams in Gauntlet Mode.',
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
    });
}

function showSetupModal() {
    document.getElementById('welcomeModal').style.display = 'none';
    document.getElementById('setupModal').style.display = 'flex';
}

function changeGameMode() {
    document.getElementById('changeModeModal').style.display = 'flex';
}

function confirmChangeMode(confirmed) {
    document.getElementById('changeModeModal').style.display = 'none';
    if (!confirmed) {
        showFeedback('Mode change canceled.', 'green');
        return;
    }
    localStorage.removeItem('songGameState');
    localStorage.removeItem('gauntletGameState');
    localStorage.removeItem('songGameWords');
    localStorage.removeItem('gauntletGameWords');
    localStorage.removeItem('customSheetUrl');
    localStorage.removeItem('gauntletCustomSheetUrl');
    teams = {};
    usedWords = { english: [], malay: [] };
    currentWord = '';
    currentTeamIndex = 0;
    gameActive = false;
    hasTurnEnded = false;
    clearInterval(timerInterval);
    document.getElementById('wordDisplay').textContent = '';
    document.getElementById('wordDisplay').classList.remove('fade-in');
    document.getElementById('currentTeam').textContent = 'Team: None';
    document.getElementById('timerDisplay').textContent = '';
    document.getElementById('leaderboardList').innerHTML = '';
    document.getElementById('gameTab').style.display = 'none';
    document.getElementById('settingsTab').style.display = 'none';
    document.getElementById('welcomeModal').style.display = 'none';
    document.getElementById('endGameModal').style.display = 'none';
    showFeedback('Switching to mode selection...', 'green');
    window.location.href = 'index.html#modeModal';
}

function startGame() {
    const playerInput = document.getElementById('playerInput').value.trim();
    languageMode = document.getElementById('languageSelect').value;
    timerDuration = parseInt(document.getElementById('timerSelect').value);
    if (!playerInput) {
        showFeedback('Please enter at least one team name for Gauntlet Mode.', 'red');
        return;
    }
    teams = {};
    playerInput.split(',').map(name => name.trim()).filter(name => name).forEach(name => {
        teams[name] = 0;
    });
    document.getElementById('setupModal').style.display = 'none';
    document.getElementById('gameTab').style.display = 'block';
    document.getElementById('settingsTab').style.display = 'none';
    document.querySelector('.tab-button[onclick="showTab(\'game\')"]').classList.add('active');
    document.querySelector('.tab-button[onclick="showTab(\'settings\')"]').classList.remove('active');
    currentTeamIndex = 0;
    hasTurnEnded = false;
    document.getElementById('currentTeam').textContent = `Team: ${Object.keys(teams)[currentTeamIndex]}`;
    document.getElementById('startRoundBtn').classList.add('hidden');
    document.getElementById('gameControls').classList.add('hidden');
    fetchWords().then(success => {
        if (success) {
            showFeedback('Game started! New word will be displayed.', 'green');
            generateWord(true);
            updateLeaderboard();
            updateWordCount();
        } else {
            showFeedback('Failed to load words. Check your internet or custom sheet URL in Settings.', 'red');
        }
    });
    saveSessionState();
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
        console.log('Fetched words:', { english: wordLists.english.length, malay: wordLists.malay.length });
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

function saveTimerDuration() {
    timerDuration = parseInt(document.getElementById('timerSelectSettings').value);
    showFeedback(`Timer set to ${timerDuration} seconds.`, 'green');
    saveSessionState();
}

function updateLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    Object.entries(teams).sort((a, b) => b[1] - a[1]).forEach(([name, score]) => {
        const li = document.createElement('li');
        li.innerHTML = `${name}: ${score} point${score === 1 ? '' : 's'}`;
        leaderboardList.appendChild(li);
    });
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

function startGracePeriod() {
    isGracePeriod = true;
    document.getElementById('startRoundBtn').classList.add('hidden');
    document.getElementById('gameControls').classList.add('hidden');
    let graceTime = 5;
    document.getElementById('timerDisplay').textContent = `Grace Period: ${graceTime}s`;
    document.getElementById('timerDisplay').classList.add('timer-running');
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        graceTime--;
        document.getElementById('timerDisplay').textContent = `Grace Period: ${graceTime}s`;
        if (graceTime <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timerDisplay').classList.remove('timer-running');
            document.getElementById('timerDisplay').textContent = '';
            isGracePeriod = false;
            document.getElementById('startRoundBtn').classList.remove('hidden');
            showFeedback('Grace period ended. Start the round!', 'green');
        }
    }, 1000);
}

function generateWord(initial = false) {
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
        showFeedback(`No more ${usedWordsKey === 'english' ? 'English' : 'Malay'} words available. Refresh the word list in Settings.`, 'red');
        document.getElementById('startRoundBtn').classList.add('hidden');
        document.getElementById('gameControls').classList.remove('hidden');
        document.getElementById('doneBtn').classList.add('hidden');
        document.getElementById('forfeitBtn').classList.add('hidden');
        document.getElementById('nextTeamBtn').classList.add('hidden');
        document.getElementById('nextWordBtn').classList.remove('hidden');
        updateWordCount();
        return;
    }
    currentWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    usedWords[usedWordsKey].push(currentWord);
    document.getElementById('wordDisplay').textContent = currentWord;
    document.getElementById('wordDisplay').classList.add('fade-in');
    document.getElementById('currentTeam').textContent = `Team: ${Object.keys(teams)[currentTeamIndex]}`;
    document.getElementById('startRoundBtn').classList.add('hidden');
    document.getElementById('gameControls').classList.add('hidden');
    document.getElementById('doneBtn').classList.add('hidden');
    document.getElementById('forfeitBtn').classList.add('hidden');
    document.getElementById('nextTeamBtn').classList.add('hidden');
    document.getElementById('nextWordBtn').classList.remove('hidden');
    hasTurnEnded = false;
    startGracePeriod();
    saveSessionState();
    updateWordCount();
}

function startRound() {
    if (!currentWord || isGracePeriod) {
        return;
    }
    gameActive = true;
    hasTurnEnded = false;
    document.getElementById('startRoundBtn').classList.add('hidden');
    document.getElementById('gameControls').classList.remove('hidden');
    document.getElementById('doneBtn').classList.remove('hidden');
    document.getElementById('forfeitBtn').classList.remove('hidden');
    document.getElementById('nextTeamBtn').classList.add('hidden');
    document.getElementById('nextWordBtn').classList.remove('hidden');
    let timeLeft = timerDuration;
    document.getElementById('timerDisplay').textContent = `Time: ${timeLeft}s`;
    document.getElementById('timerDisplay').classList.add('timer-running');
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timerDisplay').textContent = `Time: ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timerDisplay').classList.remove('timer-running');
            showFeedback(`Time's up for ${Object.keys(teams)[currentTeamIndex]}! Please press Done or Forfeit.`, 'red');
            document.getElementById('doneBtn').classList.remove('hidden');
            document.getElementById('forfeitBtn').classList.remove('hidden');
            document.getElementById('nextTeamBtn').classList.add('hidden');
            document.getElementById('nextWordBtn').classList.remove('hidden');
        }
    }, 1000);
}

function doneTurn() {
    clearInterval(timerInterval);
    document.getElementById('timerDisplay').classList.remove('timer-running');
    document.getElementById('timerDisplay').textContent = '';
    const currentTeam = Object.keys(teams)[currentTeamIndex];
    teams[currentTeam] = (teams[currentTeam] || 0) + 1;
    showFeedback(`Nice singing, ${currentTeam}! You earn 1 point!`, 'green');
    document.getElementById('doneBtn').classList.add('hidden');
    document.getElementById('forfeitBtn').classList.add('hidden');
    document.getElementById('nextTeamBtn').classList.remove('hidden');
    document.getElementById('nextWordBtn').classList.remove('hidden');
    hasTurnEnded = true;
    updateLeaderboard();
    saveSessionState();
}

function forfeitTurn() {
    clearInterval(timerInterval);
    document.getElementById('timerDisplay').classList.remove('timer-running');
    document.getElementById('timerDisplay').textContent = '';
    showFeedback(`${Object.keys(teams)[currentTeamIndex]} forfeited their turn.`, 'red');
    document.getElementById('doneBtn').classList.add('hidden');
    document.getElementById('forfeitBtn').classList.add('hidden');
    document.getElementById('nextTeamBtn').classList.remove('hidden');
    document.getElementById('nextWordBtn').classList.remove('hidden');
    hasTurnEnded = true;
}

function nextTeam() {
    clearInterval(timerInterval);
    document.getElementById('timerDisplay').classList.remove('timer-running');
    document.getElementById('timerDisplay').textContent = '';
    currentTeamIndex = (currentTeamIndex + 1) % Object.keys(teams).length;
    document.getElementById('currentTeam').textContent = `Team: ${Object.keys(teams)[currentTeamIndex]}`;
    showFeedback(`Next up: ${Object.keys(teams)[currentTeamIndex]}.`, 'green');
    document.getElementById('startRoundBtn').classList.add('hidden');
    document.getElementById('gameControls').classList.add('hidden');
    document.getElementById('doneBtn').classList.add('hidden');
    document.getElementById('forfeitBtn').classList.add('hidden');
    document.getElementById('nextTeamBtn').classList.add('hidden');
    document.getElementById('nextWordBtn').classList.remove('hidden');
    hasTurnEnded = false;
    startRound();
    saveSessionState();
}

function proposeNextWord() {
    document.getElementById('nextWordModal').style.display = 'flex';
    document.getElementById('startRoundBtn').classList.add('hidden');
    document.getElementById('gameControls').classList.add('hidden');
    document.getElementById('doneBtn').classList.add('hidden');
    document.getElementById('forfeitBtn').classList.add('hidden');
    document.getElementById('nextTeamBtn').classList.add('hidden');
    document.getElementById('nextWordBtn').classList.remove('hidden');
}

function confirmNextWord(confirmed) {
    document.getElementById('nextWordModal').style.display = 'none';
    if (!confirmed) {
        showFeedback('Continuing with the current word.', 'green');
        document.getElementById('startRoundBtn').classList.add('hidden');
        document.getElementById('gameControls').classList.remove('hidden');
        document.getElementById('doneBtn').classList.remove('hidden');
        document.getElementById('forfeitBtn').classList.remove('hidden');
        document.getElementById('nextTeamBtn').classList.add('hidden');
        document.getElementById('nextWordBtn').classList.remove('hidden');
        if (!hasTurnEnded) {
            startRound();
        }
        return;
    }
    if (hasTurnEnded) {
        currentTeamIndex = (currentTeamIndex + 1) % Object.keys(teams).length;
    }
    generateWord(true);
    showFeedback('New word generated!', 'green');
}

function endGame() {
    clearInterval(timerInterval);
    gameActive = false;
    hasTurnEnded = false;
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
    document.getElementById('timerDisplay').classList.remove('timer-running');
    document.getElementById('startRoundBtn').classList.add('hidden');
    document.getElementById('gameControls').classList.add('hidden');
    document.getElementById('doneBtn').classList.add('hidden');
    document.getElementById('forfeitBtn').classList.add('hidden');
    document.getElementById('nextTeamBtn').classList.add('hidden');
    document.getElementById('nextWordBtn').classList.add('hidden');
    showFeedback('Game ended! Check the final scores.', 'green');
    saveSessionState();
}

function closeEndGameModal() {
    document.getElementById('endGameModal').style.display = 'none';
    teams = {};
    usedWords = { english: [], malay: [] };
    currentWord = '';
    currentTeamIndex = 0;
    gameActive = false;
    hasTurnEnded = false;
    clearInterval(timerInterval);
    document.getElementById('wordDisplay').textContent = '';
    document.getElementById('wordDisplay').classList.remove('fade-in');
    document.getElementById('currentTeam').textContent = 'Team: None';
    document.getElementById('timerDisplay').textContent = '';
    document.getElementById('leaderboardList').innerHTML = '';
    document.getElementById('gameTab').style.display = 'none';
    document.getElementById('settingsTab').style.display = 'none';
    document.getElementById('welcomeModal').style.display = 'none';
    document.getElementById('modeModal').style.display = 'flex';
    showFeedback('Session ended. Choose a new game mode.', 'green');
    saveSessionState();
    updateWordCount();
    window.location.href = 'index.html#modeModal';
}

function continueGame() {
    if (Object.keys(teams).length === 0) {
        document.getElementById('endGameModal').style.display = 'none';
        document.getElementById('setupModal').style.display = 'flex';
        return;
    }
    document.getElementById('endGameModal').style.display = 'none';
    document.getElementById('gameTab').style.display = 'block';
    document.getElementById('settingsTab').style.display = 'none';
    document.querySelector('.tab-button[onclick="showTab(\'game\')"]').classList.add('active');
    document.querySelector('.tab-button[onclick="showTab(\'settings\')"]').classList.remove('active');
    document.getElementById('currentTeam').textContent = `Team: ${Object.keys(teams)[currentTeamIndex]}`;
    document.getElementById('startRoundBtn').classList.add('hidden');
    document.getElementById('gameControls').classList.add('hidden');
    document.getElementById('doneBtn').classList.add('hidden');
    document.getElementById('forfeitBtn').classList.add('hidden');
    document.getElementById('nextTeamBtn').classList.add('hidden');
    document.getElementById('nextWordBtn').classList.remove('hidden');
    showFeedback('Game resumed! Start the next round.', 'green');
    hasTurnEnded = false;
    startGracePeriod();
    saveSessionState();
}

function startNewGauntletGame() {
    teams = {};
    usedWords = { english: [], malay: [] };
    currentWord = '';
    currentTeamIndex = 0;
    gameActive = false;
    hasTurnEnded = false;
    clearInterval(timerInterval);
    document.getElementById('wordDisplay').textContent = '';
    document.getElementById('wordDisplay').classList.remove('fade-in');
    document.getElementById('currentTeam').textContent = 'Team: None';
    document.getElementById('timerDisplay').textContent = '';
    document.getElementById('leaderboardList').innerHTML = '';
    document.getElementById('endGameModal').style.display = 'none';
    document.getElementById('setupModal').style.display = 'flex';
    document.getElementById('playerInput').value = '';
    document.getElementById('playerInput').placeholder = 'Enter team names (e.g., Team A, Team B)';
    document.getElementById('languageSelect').value = languageMode;
    document.getElementById('timerSelect').value = timerDuration;
    showFeedback('Setup a new Gauntlet Mode game.', 'green');
    saveSessionState();
    updateWordCount();
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
    currentTeamIndex = 0;
    gameActive = false;
    hasTurnEnded = false;
    clearInterval(timerInterval);
    currentSheetUrl = defaultSheetUrl;
    localStorage.removeItem('gauntletCustomSheetUrl');
    document.getElementById('customSheetUrl').value = '';
    document.getElementById('wordDisplay').textContent = '';
    document.getElementById('wordDisplay').classList.remove('fade-in');
    document.getElementById('currentTeam').textContent = 'Team: None';
    document.getElementById('timerDisplay').textContent = '';
    document.getElementById('leaderboardList').innerHTML = '';
    document.getElementById('gameTab').style.display = 'none';
    document.getElementById('settingsTab').style.display = 'none';
    document.getElementById('welcomeModal').style.display = 'flex';
    showFeedback('Game reset successfully!', 'green');
    localStorage.removeItem('gauntletGameState');
    updateWordCount();
}