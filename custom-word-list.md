# Using a Custom Word List in Song Association Game

This guide explains how to create and use your own word list for the **Song Association Game** in Regular Mode. By using a custom Google Sheet, you can personalize the words used in the game. Follow these steps to set it up, and refer to the troubleshooting section if you encounter issues.

## Step-by-Step Guide

1. **Create a Google Sheet**:
   - Open [Google Sheets](https://sheets.google.com) and create a new spreadsheet.
   - In the first row, add headers: `English` in column A and `Malay` in column B.
   - List your words in the respective columns (one word per row). For example:

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


3. **Add to Settings**:
- Open the Song Association Game at [https://izzoe3.github.io/song-game/](https://izzoe3.github.io/song-game/).
- Navigate to the *Settings* tab.
- In the "Word List Management" section, paste the copied URL into the "Enter custom Google Sheet CSV URL" field.
- Click *Save Sheet URL* to validate and save the URL.

4. **Refresh the Word List**:
- Click *Refresh Word List* to load the words from your Google Sheet.
- The app will display a confirmation message (e.g., "Word list refreshed from custom sheet! X English and Y Malay words available.") and update the word count.

5. **Play with Your Words**:
- Return to the *Game* tab and generate words as usual. Your custom words will now be used in Regular Mode.

## Troubleshooting

- **Word Count Not Updating After Refresh**:
- If the word count in the Game tab does not change after refreshing, ensure you are online, as the app may be using a cached word list.
- Verify the Google Sheet URL is correct and publicly accessible (set to "Anyone with the link").
- Try resetting used words by clicking *Reset Used Words* in the Game tab, or clear the browser cache and refresh the word list again.
- If the issue persists, revert to the default word list by clicking *Use Default Word List* in Settings and retry with a new CSV URL.

- **Invalid URL Error**:
- Ensure the URL matches the format: `https://docs.google.com/spreadsheets/d/e/.../pub?output=csv`.
- Check that the Google Sheet is published and shared publicly (File > Share > Publish to web).

- **No Words Loaded**:
- Confirm the Google Sheet has headers `English` and `Malay` (case-sensitive) in the first row.
- Ensure there are valid words in at least one column (no empty rows or invalid characters).

For further assistance, contact the maintainer via email as specified in [CONTRIBUTING.md](CONTRIBUTING.md).

---

Play the game at [https://izzoe3.github.io/song-game/](https://izzoe3.github.io/song-game/)! 🎵
