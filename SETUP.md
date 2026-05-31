# Pickleball Matrix — Setup

## Connect to Google Sheets (2 steps)

### Step 1 — Deploy the Apps Script

1. Open your spreadsheet
2. Click **Extensions → Apps Script**
3. **Do not delete existing code.** Scroll to the bottom and paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs) below your existing functions
4. Click the blue **Deploy** button in the top-right corner of the Apps Script editor → **New deployment**
5. Set type to **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy** → copy the web app URL (looks like `https://script.google.com/macros/s/.../exec`)

### Step 2 — Add the URL to your environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and paste the URL:
```
APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

Then restart the dev server:
```bash
npm run dev
```

That's it — no Google Cloud Console, no service account, no API keys.

---

## Pages

| Path | Description |
|------|-------------|
| `/` | Recent matches + quick stats |
| `/submit` | Log a new match (writes directly to Google Sheet) |
| `/players` | Player leaderboard |
| `/players/CALVIN` | Individual player profile with singles/doubles/ELO stats |
