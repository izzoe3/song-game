let players = {};
        let currentWord = '';
        let languageMode = 'en';
        let useEnglish = true;
        let gameMode = 'regular';
        let usedWords = { english: [], malay: [] };
        const defaultSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5MX7qFT32Er41i6EPORV5GH9xsIlh6nwNxsV9_qGTL6PHvDBvNb9I5PhlTycbQyb5-f9ffg4BE5FB/pub?output=csv';
        let currentSheetUrl = defaultSheetUrl;
        let wordLists = { english: [], malay: [] };
        const APP_VERSION = '1.4.2';
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            document.getElementById('installButton').classList.remove('hidden');
            console.log('Install prompt captured, waiting for user action');
        });

        function installApp() {
            if (!deferredPrompt) {
                document.getElementById('feedback').textContent = 'App installation not available on this browser. Add to home screen manually.';
                document.getElementById('feedback').className = 'red fade-in';
                console.warn('Install prompt unavailable');
                return;
            }
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    document.getElementById('feedback').textContent = 'App installed successfully!';
                    document.getElementById('feedback').className = 'green fade-in';
                } else {
                    document.getElementById('feedback').textContent = 'App installation canceled.';
                    document.getElementById('feedback').className = 'red fade-in';
                }
                deferredPrompt = null;
                document.getElementById('installButton').classList.add('hidden');
            });
        }

        window.addEventListener('load', () => {
            loadSessionState();
            checkForUpdates();
            setInterval(checkForUpdates, 300000); // Check every 5 minutes for PWA
            loadCustomSheetUrl();
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/song-game/sw.js')
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
        });

        function saveSessionState() {
            const state = {
                players: JSON.parse(JSON.stringify(players)), // Deep copy to avoid reference issues
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
                document.getElementById('feedback').textContent = 'Error saving game state. Scores may not persist.';
                document.getElementById('feedback').className = 'red fade-in';
            }
        }

        function loadSessionState() {
            try {
                const state = localStorage.getItem('songGameState');
                if (state) {
                    const parsed = JSON.parse(state);
                    // Validate players object
                    players = (parsed.players && typeof parsed.players === 'object' && Object.keys(parsed.players).length) ? parsed.players : {};
                    console.log('Loaded players from localStorage:', JSON.stringify(players)); // Debug log
                    usedWords = parsed.usedWords && parsed.usedWords.english && parsed.usedWords.malay ? parsed.usedWords : { english: [], malay: [] };
                    gameMode = parsed.gameMode || 'regular';
                    languageMode = parsed.languageMode || 'en';
                    useEnglish = parsed.useEnglish !== undefined ? parsed.useEnglish : true;
                    currentWord = parsed.currentWord || '';
                    currentSheetUrl = parsed.currentSheetUrl || defaultSheetUrl;
                    console.log('Session state loaded:', parsed);
                    document.getElementById('welcomeModal').style.display = 'none';
                    document.getElementById('modeModal').style.display = 'none';
                    document.getElementById('playerModal').style.display = 'none';
                    document.getElementById('resetModal').style.display = 'none';
                    document.getElementById('endGameModal').style.display = 'none';
                    document.getElementById('gameTab').style.display = 'block';
                    document.getElementById('settingsTab').style.display = 'none';
                    document.querySelector('.tab-button[onclick="showTab(\'game\')"]').classList.add('active');
                    document.getElementById('languageChangeSelect').value = languageMode;
                    document.getElementById('customSheetUrl').value = currentSheetUrl;
                    document.getElementById('wordDisplay').textContent = currentWord || 'Loading...';
                    if (currentWord) document.getElementById('wordDisplay').classList.add('fade-in');
                    if (gameMode === 'casual') {
                        document.getElementById('settingsTabButton').classList.add('hidden');
                        document.getElementById('playerSelect').classList.add('hidden');
                        document.getElementById('skipWordBtn').classList.add('hidden');
                        document.getElementById('endGameBtn').classList.add('hidden');
                        document.getElementById('resetModeBtn').classList.remove('hidden');
                        document.getElementById('generateWordBtn').disabled = false;
                    } else {
                        document.getElementById('settingsTabButton').classList.remove('hidden');
                        document.getElementById('playerSelect').classList.remove('hidden');
                        document.getElementById('skipWordBtn').classList.remove('hidden');
                        document.getElementById('endGameBtn').classList.remove('hidden');
                        document.getElementById('resetModeBtn').classList.add('hidden');
                    }
                    document.getElementById('leaderboard').style.display = 'none';
                    document.getElementById('toggleLeaderboard').innerHTML = '<i class="fas fa-trophy"></i> Show Leaderboard';
                    updatePlayerSelect();
                    updateRemovePlayerSelect();
                    updateLeaderboard();
                    updateWordCount();
                    if (!wordLists.english.length && !wordLists.malay.length) {
                        fetchWords().then(success => {
                            if (success && currentWord) {
                                document.getElementById('feedback').textContent = 'Session restored! Continue playing.';
                                document.getElementById('feedback').className = 'green fade-in';
                                updateWordCount();
                            }
                        });
                    } else {
                        document.getElementById('feedback').textContent = 'Session restored! Continue playing.';
                        document.getElementById('feedback').className = 'green fade-in';
                        updateWordCount();
                    }
                } else {
                    document.getElementById('welcomeModal').style.display = 'flex';
                    document.getElementById('leaderboard').style.display = 'none';
                    document.getElementById('toggleLeaderboard').innerHTML = '<i class="fas fa-trophy"></i> Show Leaderboard';
                }
            } catch (e) {
                console.error('Failed to load session state:', e.message);
                players = {}; // Fallback to empty players
                document.getElementById('feedback').textContent = 'Error loading game state. Starting fresh.';
                document.getElementById('feedback').className = 'red fade-in';
                document.getElementById('welcomeModal').style.display = 'flex';
            }
        }

        function startGame() {
            const feedback = document.getElementById('feedback');
            const playerInput = document.getElementById('playerInput').value.trim();
            languageMode = document.getElementById('languageSelect').value;
            if (gameMode === 'regular' && !playerInput) {
                feedback.textContent = 'Please enter at least one player name for Regular Mode.';
                feedback.className = 'red fade-in';
                return;
            }
            if (gameMode === 'regular') {
                players = {};
                playerInput.split(',').map(name => name.trim()).filter(name => name).forEach(name => {
                    players[name] = 0;
                });
                console.log('Players initialized:', players); // Debug log
                updatePlayerSelect();
                updateRemovePlayerSelect();
                updateLeaderboard();
            }
            document.getElementById('playerModal').style.display = 'none';
            document.getElementById('gameTab').style.display = 'block';
            document.getElementById('settingsTab').style.display = 'none';
            document.querySelector('.tab-button[onclick="showTab(\'game\')"]').classList.add('active');
            document.querySelector('.tab-button[onclick="showTab(\'settings\')"]').classList.remove('active');
            document.getElementById('languageChangeSelect').value = languageMode;
            if (gameMode === 'casual') {
                document.getElementById('settingsTabButton').classList.add('hidden');
                document.getElementById('playerSelect').classList.add('hidden');
                document.getElementById('skipWordBtn').classList.add('hidden');
                document.getElementById('endGameBtn').classList.add('hidden');
                document.getElementById('resetModeBtn').classList.remove('hidden');
                document.getElementById('generateWordBtn').disabled = false;
            } else {
                document.getElementById('settingsTabButton').classList.remove('hidden');
                document.getElementById('playerSelect').classList.remove('hidden');
                document.getElementById('skipWordBtn').classList.remove('hidden');
                document.getElementById('endGameBtn').classList.remove('hidden');
                document.getElementById('resetModeBtn').classList.add('hidden');
            }
            fetchWords().then(success => {
                if (success) {
                    generateWord(true);
                    feedback.textContent = 'Game started! Generate a word to begin.';
                    feedback.className = 'green fade-in';
                } else {
                    feedback.textContent = 'Failed to load words. Check your internet or custom sheet URL in Settings.';
                    feedback.className = 'red fade-in';
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
            const feedback = document.getElementById('feedbackSettings');
            if (!newUrl) {
                feedback.textContent = 'Please enter a valid Google Sheet CSV URL or use the default word list.';
                feedback.className = 'red fade-in';
                return;
            }
            if (!newUrl.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/.*\/pub\?output=csv$/)) {
                feedback.textContent = 'Invalid Google Sheet URL. Use a public CSV link (File > Share > Publish to web > Comma-separated values). See the help guide for details.';
                feedback.className = 'red fade-in';
                return;
            }
            currentSheetUrl = newUrl;
            localStorage.setItem('customSheetUrl', newUrl);
            feedback.textContent = 'Custom sheet URL saved! Refreshing word list from custom sheet...';
            feedback.className = 'green fade-in';
            refreshWordList();
        }

        function useDefaultSheet() {
            const feedback = document.getElementById('feedbackSettings');
            currentSheetUrl = defaultSheetUrl;
            localStorage.removeItem('customSheetUrl');
            document.getElementById('customSheetUrl').value = '';
            feedback.textContent = 'Reverted to default word list. Refreshing...';
            feedback.className = 'green fade-in';
            refreshWordList();
        }

        function showModeModal() {
            document.getElementById('welcomeModal').style.display = 'none';
            document.getElementById('modeModal').style.display = 'flex';
        }

        async function checkForUpdates() {
            const updateNotice = document.getElementById('updateNotice');
            try {
                const response = await fetch('/song-game/version.txt', {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
                });
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
                                await navigator.serviceWorker.register('/song-game/sw.js');
                                console.log('Service worker re-registered');
                            }
                            location.reload();
                            updateNotice.style.display = 'none';
                        } catch (e) {
                            console.error('Failed to update service worker:', e.message);
                            updateNotice.textContent = 'Update failed. Clear browser cache and try again.';
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
                text: 'Sing songs matching random words in English or Malay! Play offline with friends.',
                url: 'https://izzoe3.github.io/song-game/'
            };
            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                    document.getElementById('feedback').textContent = 'Game shared successfully!';
                    document.getElementById('feedback').className = 'green fade-in';
                } else {
                    navigator.clipboard.writeText(shareData.url);
                    document.getElementById('feedback').textContent = 'Link copied to clipboard!';
                    document.getElementById('feedback').className = 'green fade-in';
                }
            } catch (err) {
                document.getElementById('feedback').textContent = 'Failed to share. Copy this link: ' + shareData.url;
                document.getElementById('feedback').className = 'red fade-in';
            }
        }

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

        function selectMode(mode) {
            gameMode = mode;
            document.getElementById('modeModal').style.display = 'none';
            document.getElementById('playerModal').style.display = 'flex';
            const playerInput = document.getElementById('playerInput');
            const setupTitle = document.getElementById('setupTitle');
            if (gameMode === 'casual') {
                playerInput.classList.add('hidden');
                setupTitle.textContent = 'Setup Word Generator';
                document.getElementById('endGameBtn').classList.add('hidden');
            } else {
                playerInput.classList.remove('hidden');
                setupTitle.textContent = 'Setup Game';
                document.getElementById('endGameBtn').classList.remove('hidden');
            }
            saveSessionState();
        }

        function endGame() {
            if (gameMode === 'casual') return;
            console.log('Ending game, current players:', JSON.stringify(players)); // Debug log
            const finalLeaderboard = document.getElementById('finalLeaderboard');
            const finalLeaderboardList = document.getElementById('finalLeaderboardList');
            const endGameMessage = document.getElementById('endGameMessage');
            finalLeaderboard.style.display = 'block'; // Ensure visibility
            finalLeaderboardList.innerHTML = ''; // Clear previous content
            const fragment = document.createDocumentFragment(); // Use fragment for performance

            console.log('Final leaderboard DOM:', finalLeaderboard); // Debug log
            console.log('Players object:', players, 'Type:', typeof players, 'Keys:', Object.keys(players)); // Debug log

            if (!players || typeof players !== 'object' || Object.keys(players).length === 0) {
                endGameMessage.textContent = 'No players added. Start a new game!';
                const li = document.createElement('li');
                li.textContent = 'No players added. Start a new game!';
                fragment.appendChild(li);
                console.warn('No valid players found for endGame:', players);
            } else {
                const sortedPlayers = Object.entries(players).sort((a, b) => b[1] - a[1]);
                console.log('Sorted players for leaderboard:', sortedPlayers); // Debug log
                const maxScore = sortedPlayers[0][1];
                const isTie = sortedPlayers.filter(([_, score]) => score === maxScore).length > 1;
                endGameMessage.textContent = isTie ? 'It’s a tie! Resume or start a new game.' : 'Final scores:';
                if (sortedPlayers.every(([_, score]) => score === 0)) {
                    endGameMessage.textContent = 'No scores earned. Play to earn points!';
                    const li = document.createElement('li');
                    li.textContent = 'No scores earned. Play to earn points!';
                    fragment.appendChild(li);
                } else {
                    sortedPlayers.forEach(([name, score]) => {
                        const li = document.createElement('li');
                        li.textContent = `${name}: ${score} point${score === 1 ? '' : 's'}`;
                        li.setAttribute('aria-label', `${name} has ${score} point${score === 1 ? '' : 's'}`);
                        fragment.appendChild(li);
                    });
                }
            }

            finalLeaderboardList.appendChild(fragment);
            console.log('Final leaderboard list HTML:', finalLeaderboardList.innerHTML); // Debug log
            document.getElementById('endGameModal').style.display = 'flex';
            document.getElementById('feedback').textContent = 'Game ended! Check the final scores.';
            document.getElementById('feedback').className = 'green fade-in';
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
            document.getElementById('removePlayerSelect').innerHTML = '<option value="">Select Player to Remove</option>';
            document.getElementById('leaderboardList').innerHTML = '';
            document.getElementById('gameTab').style.display = 'none';
            document.getElementById('settingsTab').style.display = 'none';
            document.getElementById('modeModal').style.display = 'flex';
            document.getElementById('feedback').textContent = 'Session ended. Choose a new game mode.';
            document.getElementById('feedback').className = 'green fade-in';
            saveSessionState();
            updateWordCount();
            console.log('Session ended, players reset:', players); // Debug log
        }

        function continueGame() {
            if (gameMode === 'casual') return;
            document.getElementById('endGameModal').style.display = 'none';
            document.getElementById('generateWordBtn').disabled = !document.getElementById('playerSelect').value;
            document.getElementById('feedback').textContent = 'Game resumed! Generate a new word to continue.';
            document.getElementById('feedback').className = 'green fade-in';
            saveSessionState();
        }

        function startNewRegularGame() {
            if (gameMode === 'casual') return;
            players = {};
            usedWords = { english: [], malay: [] };
            document.getElementById('wordDisplay').textContent = '';
            document.getElementById('wordDisplay').classList.remove('fade-in');
            document.getElementById('playerSelect').innerHTML = '<option value="">Select Player</option>';
            document.getElementById('removePlayerSelect').innerHTML = '<option value="">Select Player to Remove</option>';
            document.getElementById('leaderboardList').innerHTML = '';
            document.getElementById('endGameModal').style.display = 'none';
            document.getElementById('playerModal').style.display = 'flex';
            document.getElementById('setupTitle').textContent = 'Setup Game';
            document.getElementById('playerInput').value = '';
            document.getElementById('languageSelect').value = languageMode;
            document.getElementById('generateWordBtn').disabled = true;
            document.getElementById('feedback').textContent = 'Setup a new Regular Mode game.';
            document.getElementById('feedback').className = 'green fade-in';
            console.log('New Regular Mode game started, players reset:', players); // Debug log
            saveSessionState();
            updateWordCount();
        }

        function changeMode() {
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
            document.getElementById('feedback').textContent = '';
            document.getElementById('feedback').classList.remove('fade-in');
            document.getElementById('playerSelect').innerHTML = '<option value="">Select Player</option>';
            document.getElementById('removePlayerSelect').innerHTML = '<option value="">Select Player to Remove</option>';
            document.getElementById('leaderboardList').innerHTML = '';
            document.getElementById('gameTab').style.display = 'none';
            document.getElementById('settingsTab').style.display = 'none';
            document.getElementById('endGameModal').style.display = 'none';
            document.getElementById('modeModal').style.display = 'flex';
            document.getElementById('settingsTabButton').classList.remove('hidden');
            document.getElementById('playerSelect').classList.remove('hidden');
            document.getElementById('skipWordBtn').classList.remove('hidden');
            document.getElementById('endGameBtn').classList.remove('hidden');
            document.getElementById('resetModeBtn').classList.add('hidden');
            document.getElementById('resetUsedWordsBtn').classList.add('hidden');
            document.getElementById('generateWordBtn').disabled = true;
            document.getElementById('leaderboard').style.display = 'none';
            document.getElementById('toggleLeaderboard').innerHTML = '<i class="fas fa-trophy"></i> Show Leaderboard';
            document.getElementById('feedbackSettings').textContent = 'Game reset! Choose a new mode.';
            document.getElementById('feedbackSettings').className = 'green fade-in';
            localStorage.removeItem('songGameState');
            updateWordCount();
        }

        function resetGame() {
            document.getElementById('resetModal').style.display = 'flex';
        }

        function confirmReset(confirmed) {
            document.getElementById('resetModal').style.display = 'none';
            if (!confirmed) {
                document.getElementById('feedbackSettings').textContent = 'Game reset canceled.';
                document.getElementById('feedbackSettings').className = 'green fade-in';
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
            document.getElementById('feedback').textContent = '';
            document.getElementById('feedback').classList.remove('fade-in');
            document.getElementById('playerSelect').innerHTML = '<option value="">Select Player</option>';
            document.getElementById('removePlayerSelect').innerHTML = '<option value="">Select Player to Remove</option>';
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
            document.getElementById('feedbackSettings').textContent = 'Game reset successfully!';
            document.getElementById('feedbackSettings').className = 'green fade-in';
            localStorage.removeItem('songGameState');
            updateWordCount();
            console.log('Game reset, showing welcome screen');
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

        async function fetchWords() {
            const feedback = document.getElementById('feedbackSettings') || document.getElementById('feedback');
            if (!navigator.onLine) {
                const cachedWords = localStorage.getItem('songGameWords');
                if (cachedWords) {
                    const { english, malay } = JSON.parse(cachedWords);
                    wordLists.english = english || [];
                    wordLists.malay = malay || [];
                    if (wordLists.english.length || wordLists.malay.length) {
                        feedback.textContent = `Offline: Using cached word list with ${wordLists.english.length} English and ${wordLists.malay.length} Malay words.`;
                        feedback.className = 'green fade-in';
                        updateWordCount();
                        return true;
                    }
                }
                feedback.textContent = 'Offline: No cached words available. Connect to the internet to load words.';
                feedback.className = 'red fade-in';
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
                usedWords = { english: [], malay: [] }; // Reset used words on successful fetch
                saveSessionState();
                feedback.textContent = `Word list loaded successfully from ${currentSheetUrl === defaultSheetUrl ? 'default' : 'custom'} sheet! ${wordLists.english.length} English and ${wordLists.malay.length} Malay words available.`;
                feedback.className = 'green fade-in';
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
                        feedback.textContent = `Error fetching words: ${error.message}. Using cached word list with ${wordLists.english.length} English and ${wordLists.malay.length} Malay words. Retry in Settings or check the help guide.`;
                        feedback.className = 'green fade-in';
                        const retryBtn = document.createElement('button');
                        retryBtn.innerHTML = '<i class="fas fa-sync"></i> Retry Now';
                        retryBtn.onclick = refreshWordList;
                        retryBtn.setAttribute('aria-label', 'Retry fetching word list');
                        feedback.appendChild(retryBtn);
                        updateWordCount();
                        return true;
                    }
                }
                feedback.textContent = `Error: Could not load word list: ${error.message}. Ensure the Google Sheet is public (CSV, “Anyone with the link”). Retry in Settings or see the help guide.`;
                feedback.className = 'red fade-in';
                const retryBtn = document.createElement('button');
                retryBtn.innerHTML = '<i class="fas fa-sync"></i> Retry Now';
                retryBtn.onclick = refreshWordList;
                retryBtn.setAttribute('aria-label', 'Retry fetching word list');
                feedback.appendChild(retryBtn);
                return false;
            }
        }

        async function refreshWordList() {
            if (gameMode === 'casual') return;
            const feedback = document.getElementById('feedbackSettings');
            feedback.textContent = `Refreshing word list from ${currentSheetUrl === defaultSheetUrl ? 'default' : 'custom'} sheet...`;
            feedback.className = 'fade-in';
            usedWords = { english: [], malay: [] }; // Reset used words to ensure accurate word count
            const success = await fetchWords();
            if (success) {
                feedback.textContent = `Word list refreshed from ${currentSheetUrl === defaultSheetUrl ? 'default' : 'custom'} sheet! ${wordLists.english.length} English and ${wordLists.malay.length} Malay words available.`;
                feedback.className = 'green fade-in';
                document.getElementById('resetUsedWordsBtn').classList.add('hidden');
                generateWord(true);
                updateWordCount();
            }
        }

        function updatePlayerSelect() {
            if (gameMode === 'casual') return;
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
            removePlayerSelect.innerHTML = '<option value="">Select Player to Remove</option>';
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
            if (gameMode === 'casual') return;
            players[player] = (players[player] || 0) + 1;
            console.log(`Incremented score for ${player}: ${players[player]}`); // Debug log
            updateLeaderboard();
            updatePlayerSelect();
            document.getElementById('feedbackSettings').textContent = `Added 1 point to ${player}.`;
            document.getElementById('feedbackSettings').className = 'green fade-in';
            saveSessionState();
        }

        function decrementScore(player) {
            if (gameMode === 'casual') return;
            if (players[player] > 0) {
                players[player] -= 1;
                console.log(`Decremented score for ${player}: ${players[player]}`); // Debug log
                updateLeaderboard();
                updatePlayerSelect();
                document.getElementById('feedbackSettings').textContent = `Removed 1 point from ${player}.`;
                document.getElementById('feedbackSettings').className = 'green fade-in';
            } else {
                document.getElementById('feedbackSettings').textContent = `${player} already has 0 points.`;
                document.getElementById('feedbackSettings').className = 'red fade-in';
            }
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
            if (gameMode === 'casual') return;
            const player = document.getElementById('playerSelect').value;
            const generateBtn = document.getElementById('generateWordBtn');
            generateBtn.disabled = !player;
        }

        function updateWordCount() {
            let availableWords = [];
            if (languageMode === 'both') {
                availableWords = [...wordLists.english.filter(word => !usedWords.english.includes(word)), ...wordLists.malay.filter(word => !usedWords.malay.includes(word))];
            } else {
                const usedWordsKey = languageMode === 'en' ? 'english' : 'malay';
                availableWords = wordLists[usedWordsKey].filter(word => !usedWords[usedWordsKey].includes(word));
            }
            document.getElementById('wordCountDisplay').textContent = `Words remaining: ${availableWords.length}`;
        }

        function resetUsedWords() {
            usedWords = { english: [], malay: [] };
            document.getElementById('resetUsedWordsBtn').classList.add('hidden');
            document.getElementById('feedback').textContent = 'Used words reset! New words available.';
            document.getElementById('feedback').className = 'green fade-in';
            document.getElementById('generateWordBtn').disabled = gameMode === 'regular' && !document.getElementById('playerSelect').value;
            saveSessionState();
            generateWord(true);
            updateWordCount();
            console.log('Used words reset');
        }

        function generateWord(initial = false) {
            const player = document.getElementById('playerSelect').value;
            const feedback = document.getElementById('feedback');
            const generateBtn = document.getElementById('generateWordBtn');
            const resetUsedWordsBtn = document.getElementById('resetUsedWordsBtn');

            if (gameMode === 'regular' && !initial && !player) {
                feedback.textContent = 'Please select a player to generate a new word.';
                feedback.className = 'red fade-in';
                generateBtn.disabled = true;
                return;
            }

            if (gameMode === 'regular' && !initial && player) {
                players[player] = (players[player] || 0) + 1;
                feedback.textContent = `Nice singing, ${player}! You earn 1 point!`;
                feedback.className = 'green fade-in';
                console.log(`Point added to ${player}, new score: ${players[player]}`); // Debug log
                saveSessionState(); // Ensure immediate save after score update
            } else if (gameMode === 'casual') {
                feedback.textContent = 'New word generated!';
                feedback.className = 'green fade-in';
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
                feedback.textContent = `No more ${usedWordsKey === 'english' ? 'English' : 'Malay'} words available. Reset used words or refresh the word list in Settings (Regular Mode only).`;
                feedback.className = 'red fade-in';
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
            console.log('Generated word:', currentWord, 'for language:', lang, 'used words:', usedWords[usedWordsKey].length);
        }

        function skipWord() {
            if (gameMode === 'casual') return;
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
            const feedback = document.getElementById('feedback');
            const resetUsedWordsBtn = document.getElementById('resetUsedWordsBtn');
            if (availableWords.length === 0) {
                document.getElementById('wordDisplay').textContent = 'No more words available.';
                document.getElementById('wordDisplay').classList.add('fade-in');
                feedback.textContent = `No more ${usedWordsKey === 'english' ? 'English' : 'Malay'} words available. Reset used words or refresh the word list in Settings.`;
                feedback.className = 'red fade-in';
                document.getElementById('generateWordBtn').disabled = true;
                resetUsedWordsBtn.classList.remove('hidden');
                updateWordCount();
                return;
            }
            currentWord = availableWords[Math.floor(Math.random() * availableWords.length)];
            usedWords[usedWordsKey].push(currentWord);
            document.getElementById('wordDisplay').textContent = currentWord;
            document.getElementById('wordDisplay').classList.add('fade-in');
            document.getElementById('playerSelect').value = '';
            document.getElementById('generateWordBtn').disabled = true;
            feedback.textContent = 'Word skipped! New word generated.';
            feedback.className = 'green fade-in';
            saveSessionState();
            updateWordCount();
            console.log('Skipped to word:', currentWord, 'for language:', lang, 'used words:', usedWords[usedWordsKey].length);
        }

        function addPlayer() {
            if (gameMode === 'casual') return;
            const newPlayer = document.getElementById('addPlayerInput').value.trim();
            const feedback = document.getElementById('feedbackSettings');
            if (!newPlayer) {
                feedback.textContent = 'Please enter a player name to add.';
                feedback.className = 'red fade-in';
                return;
            }
            if (players[newPlayer]) {
                feedback.textContent = `Player "${newPlayer}" already exists.`;
                feedback.className = 'red fade-in';
                return;
            }
            players[newPlayer] = 0;
            console.log(`Added player ${newPlayer}, players:`, players); // Debug log
            updatePlayerSelect();
            updateRemovePlayerSelect();
            updateLeaderboard();
            document.getElementById('addPlayerInput').value = '';
            feedback.textContent = `Player "${newPlayer}" added!`;
            feedback.className = 'green fade-in';
            saveSessionState();
        }

        function removePlayer() {
            if (gameMode === 'casual') return;
            const playerToRemove = document.getElementById('removePlayerSelect').value;
            const feedback = document.getElementById('feedbackSettings');
            if (!playerToRemove) {
                feedback.textContent = 'Please select a player to remove.';
                feedback.className = 'red fade-in';
                return;
            }
            delete players[playerToRemove];
            console.log(`Removed player ${playerToRemove}, players:`, players); // Debug log
            updatePlayerSelect();
            updateRemovePlayerSelect();
            updateLeaderboard();
            feedback.textContent = `Player "${playerToRemove}" removed!`;
            feedback.className = 'green fade-in';
            saveSessionState();
        }

        function changeLanguage() {
            languageMode = document.getElementById('languageChangeSelect').value;
            useEnglish = true;
            document.getElementById('feedback').textContent = `Language changed to ${languageMode === 'en' ? 'English' : languageMode === 'ms' ? 'Malay' : 'Both'}.`;
            document.getElementById('feedback').className = 'green fade-in';
            document.getElementById('resetUsedWordsBtn').classList.add('hidden');
            generateWord(true);
            updateWordCount();
            saveSessionState();
        }