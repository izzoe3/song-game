Song Association Game
A lightweight Progressive Web App (PWA) for playing a fun song association game, where players sing songs containing randomly generated words in English or Malay. Hosted on GitHub Pages, it works offline and supports Casual (word generator) and Regular (players, scoring, leaderboard) modes.
Features

Dual Modes: Casual (no scoring) and Regular (players, scores, leaderboard).
Language Support: English, Malay, or both, sourced from a default word list or your own Google Sheet.
Offline Play: Words and assets cached for seamless offline use.
Accessible: ARIA attributes and keyboard navigation for inclusivity.
Word Count: Displays remaining words to guide gameplay.
Custom UI: Styled reset modal and share options (link, QR code).
Theme Toggle: Light and dark modes for user preference.
Custom Word Lists: Use your own Google Sheet for personalized words.

How to Play

Access the App: Visit https://izzoe3.github.io/song-game/.
Choose Mode:
Casual: Generate words without scoring.
Regular: Add players, earn points, and track scores on the leaderboard.


Select Language: English, Malay, or both.
Gameplay:
A word appears (e.g., “love”). Sing a song containing that word.
In Regular Mode, select a player, generate a word, and award points for valid songs.
Skip words or reset used words if needed.


Share: Use the Share button or QR code to invite friends.

Installation

Open https://izzoe3.github.io/song-game/ in Chrome, Safari, or another modern browser.
Tap the browser’s menu and select “Add to Home Screen” or “Install App.”
Launch from your home screen for a standalone experience.

Using Your Own Word List
To use a custom word list:

Create a Google Sheet with two columns: “English” and “Malay”.
Add words in the respective columns (e.g., “love” for English, “cinta” for Malay).
Publish the sheet:
Go to File > Share > Publish to web.
Select “Comma-separated values (.csv)” and copy the link.


In the app’s Settings tab (Regular Mode only):
Paste the CSV link into the “Custom Google Sheet URL” field.
Click “Save Sheet URL” to load your word list.


Click “Refresh Word List” to update words.


Note: The sheet must be public (view-only, “Anyone with the link”). Leave the field blank to use the default word list.

Feedback and Support

This project is closed-source and maintained by .
To report bugs or suggest features, contact zulhimiamar@gmail.com.
For updates, check the app or refresh while online.

License
This software is proprietary and closed-source. See the LICENSE file for details.
