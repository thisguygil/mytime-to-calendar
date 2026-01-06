
# Target myTime Calendarizer (Chrome Extension)

A lightweight MV3 browser extension that helps Target team members turn their **myTime weekly schedule** into calendar events.

You can:
- **Export your schedule as an `.ics` file** (Apple Calendar / Outlook / Google import / etc.)
- **Add all shifts directly to Google Calendar** (via Google Calendar API)
- From the **“Manage shift”** menu, **add/export a single shift** (Google Calendar *link* template + single-shift `.ics`)

---

## Features

### Top bar (schedule page)
When you’re on the myTime schedule page, the extension injects two centered buttons into the top header:
- **📅 Add all to Google** (adds shifts via Google Calendar API)
- **Export .ics** (downloads an `.ics` containing all shifts)

### Per-shift menu (“Manage shift”)
Inside each shift’s **Manage shift** menu, the extension adds:
- **Add this shift to Google** (opens Google Calendar “TEMPLATE” link — customizable before saving)
- **Export this shift (.ics)** (downloads a single-shift `.ics`)

### Settings popup
Click the extension icon to open Settings:
- **Include past shifts** (include shifts that already ended)
- **Open Google Calendar in new tab** (after **Add all** succeeds)

---

## How it works

### 1) DOM parsing (myTime schedule)
The extension parses shifts directly from the schedule page DOM:
- Shift date (`aria-label` “schedule for YYYY-MM-DD”)
- Start & end times (handles overnight shifts)
- Location and role

It supports parsing:
- **All shifts on the page**
- **A single shift based on the clicked “Manage shift” button**

### 2) Calendar output options

#### `.ics` generation
A shared utility builds a standards-based iCalendar string for one or many shifts and downloads it.

#### Google Calendar link (single shift)
For the per-shift menu, the extension generates a Google Calendar “render?action=TEMPLATE” URL so you can edit details before saving.

#### Google Calendar API (add all)
For the top bar “Add all”, the extension:
- Uses `chrome.identity.launchWebAuthFlow` (implicit OAuth) and caches the short-lived access token in `chrome.storage.local`
- Calls Google Calendar `events.insert` for each shift
- If the token is invalid/expired, it clears the cached token and re-auths once, then retries

---

## Permissions (what/why)

- **host permissions**
  - `https://mytime.target.com/*` (read schedule DOM and inject UI)
  - Google APIs for Calendar + OAuth
- **permissions**
  - `identity` (OAuth via `launchWebAuthFlow`)
  - `storage` (settings + token cache)

---

## Installation (unpacked)

1. Clone/download this repo
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the project root folder

---

## Usage

1. Go to `https://mytime.target.com/team-member/schedule`
2. Use the injected top-bar buttons:
   - **📅 Add all to Google**
   - **Export .ics**
3. For a single shift:
   - Open a shift’s **Manage shift** menu
   - Choose **Add this shift to Google** (template link) or **Export this shift (.ics)**

---

## Project structure

```

manifest.json

shared/
calendarUtils.js        # ICS + Google link template + Google API event bodies
settings.js             # load/save settings (chrome.storage.sync)

content/
data/
parseShifts.js        # parse shifts (page + single shift)
ui/
topBar.js             # inject top bar buttons
manageShiftMenu.js    # inject items into Manage shift menu
main.js                 # SPA navigation + render lifecycle

background/
background.js           # message handler + imports
auth.js                 # OAuth implicit flow + token cache
calendarApi.js          # Google Calendar API calls (events.insert)

popup/
index.html
popup.css
popup.js

```

---

## Notes / known behavior
- **Google “Add all” can create duplicates** if you run it multiple times (it inserts new events each time).
- The per-shift **Google option uses a link template** (by design) so you can customize details before saving.
- Times are built from the schedule page in **your local timezone**; `.ics` output uses UTC timestamps, while Google API inserts use RFC3339 local timestamps with timezone info.



