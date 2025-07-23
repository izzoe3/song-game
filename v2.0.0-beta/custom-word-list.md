# Using a Custom Word List in Song Association Game

This guide provides instructions for creating and using a custom word list for the **Song Association Game** in Regular Mode. By using a Google Sheet, you can personalize the words used in the game. Follow the steps below to set it up, and refer to the troubleshooting section for common issues.

## Step-by-Step Guide

1. **Create a Google Sheet**:
   - Open [Google Sheets](https://sheets.google.com) and create a new spreadsheet.
   - In the first row, add headers: `English` in column A and `Malay` in column B (case-sensitive).
   - List your words in the respective columns (one word per row). Example:
      English,Malay
      love,cinta
      happy,gembira
      sun,matahari
   - Save the spreadsheet with a descriptive name (e.g., "SongGameWords").

2. **Publish as CSV**:
- In Google Sheets, click *File* > *Share* > *Publish to web*.
- Select the sheet containing your words (e.g., "Sheet1").
- Choose *Comma-separated values (.csv)* as the format.
- Click *Publish* and copy the provided URL. It should look like:
   https://docs.google.com/spreadsheets/d/e/.../pub?output=csv
- Ensure the sheet is shared with "Anyone with the link" under *Share* settings.

3. **Add to Settings**:
- Open the Song Association Game at [https://izzoe3.github.io/song-game/](https://izzoe3.github.io/song-game/).
- Navigate to the *Settings* tab (available in Regular Mode only).
- In the "Word List Management" section, paste the copied URL into the "Enter custom Google Sheet CSV URL" field.
- Click *Save Sheet URL* to validate and save the URL.

4. **Refresh the Word List**:
- Click *Refresh Word List* to load the words from your Google Sheet.
- The app will display a confirmation message (e.g., "Word list refreshed from custom sheet! X English and Y Malay words available.") and update the word count in the Game tab.

5. **Play with Your Words**:
- Return to the *Game* tab and generate words as usual. Your custom words will now be used in Regular Mode.

## Troubleshooting

- **Word Count Not Updating After Refresh**:
- If the word count in the Game tab ("Words remaining: X") does not change after refreshing, ensure you are online, as the app may be using a cached word list.
- Verify the Google Sheet URL is correct and publicly accessible (set to "Anyone with the link" and published as CSV).
- Click *Reset Used Words* in the Game tab to reset the used word list, or clear the browser cache and refresh the word list again.
- If the issue persists, revert to the default word list by clicking *Use Default Word List* in Settings and retry with a new CSV URL.

- **HTTP 400 Error When Loading Words**:
- A 400 error indicates the Google Sheet URL is invalid or not publicly accessible. Ensure the URL ends with `pub?output=csv` and the sheet is shared with "Anyone with the link".
- In Google Sheets, go to *File* > *Share* > *Publish to web*, select *Comma-separated values (.csv)*, and republish to get a new URL.
- If using the default word list, contact the maintainer (see [CONTRIBUTING.md](CONTRIBUTING.md)) to report the issue.

- **No Words Loaded**:
- Confirm the Google Sheet has headers `English` and `Malay` (case-sensitive) in the first row.
- Ensure there are valid words in at least one column (no empty rows or invalid characters).
- Check for typos or special characters in the word list that may cause parsing errors.

For further assistance, contact the maintainer via email as specified in [CONTRIBUTING.md](CONTRIBUTING.md).

---

Play the game at [https://izzoe3.github.io/song-game/](https://izzoe3.github.io/song-game/)! 🎵

