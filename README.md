# myTime to Calendar (Chrome & Firefox Extension)

A lightweight browser extension that helps **Target team members** turn their **myTime weekly schedule** into calendar events.

The extension works on **both Chrome and Firefox**, with platform-appropriate features and permissions.

---

## Features

### Schedule page (top bar)

When you’re on the **myTime schedule page** ([mytime.target.com/team-member/schedule](https://mytime.target.com/team-member/schedule)), the extension injects centered buttons into the header:

* **📅 Add all to Google**
  Adds all visible shifts to Google Calendar (Chrome only, via API)

* **Export .ics**
  Downloads an `.ics` file containing all shifts

### Per-shift menu (Under “Manage Shift”)

Inside each shift’s **Manage Shift** menu:

* **Add this shift to Google**
  Opens a Google Calendar *template* so you can review/edit before saving

* **Export this shift (.ics)**
  Downloads a single-shift `.ics` file

### Settings popup

Click the extension icon to open settings:

* **Include past shifts**
  Include shifts that already ended

* **Open Google Calendar in a new tab**
  After a successful “Add all” operation

---

## Browser support

This extension is available on **both major browser platforms**:

* **Chromium-based browsers** - Install via the [**Chrome Web Store**](https://chromewebstore.google.com/detail/mytime-to-calendar/odekbnpmjmbggpaeglaljcgapeoknhcp)
  (works on Chrome, Edge, Brave, and other Chromium browsers)

* **Firefox** - Install via **Firefox Add-ons** (submission currently under review)

All core features — including `.ics` export, per-shift actions, and Google Calendar integration — are supported on both platforms.

---

## How it works

### 1) DOM parsing (myTime schedule)

The extension parses shift data directly from the myTime schedule page:

* Date (from `aria-label` metadata)
* Start & end times (including overnight shifts)
* Location and role

It supports:

* Parsing **all shifts on the page**
* Parsing **a single shift** from the clicked “Manage shift” menu

### 2) Calendar output options

#### `.ics` generation

A shared utility builds a standards-compliant iCalendar file for one or many shifts and downloads it locally.

#### Google Calendar template (single shift)

For per-shift actions, the extension generates a
`render?action=TEMPLATE` URL so details can be edited before saving.

#### Google Calendar API (add all – Chrome)

On Chrome, the extension can:

* Authenticate using `chrome.identity.launchWebAuthFlow`
* Cache a short-lived access token in `chrome.storage.local`
* Insert events using `events.insert`
* Re-authenticate automatically if the token expires

---

## Permissions (what & why)

### Host permissions

* `https://mytime.target.com/*`
  Read schedule data and inject UI

* Google APIs
  Required only for Chrome’s Google Calendar API integration

### Extension permissions

* `identity` – OAuth authentication (Chrome)
* `storage` – settings and token cache

Firefox builds include additional metadata for AMO data-collection disclosure.


---

## Usage

1. Go to
   `https://mytime.target.com/team-member/schedule`

2. Use the top bar buttons:

   * **📅 Add all to Google**
   * **Export .ics**

3. For a single shift:

   * Open **Manage shift**
   * Choose **Add this shift to Google** or **Export this shift (.ics)**

---

## Project structure (simplified)

```
background/
  background.js        # message handling
  auth.js              # OAuth flow (Chrome)
  calendarApi.js       # Google Calendar API

content/
  parseShifts.js       # DOM parsing
  ui/
    topBar.js
    manageShiftMenu.js
  main.js              # SPA lifecycle handling

shared/
  calendarUtils.js     # ICS + Google template helpers
  settings.js          # storage helpers

popup/
  index.html
  popup.css
  popup.js

manifest.chrome.json
manifest.firefox.json
```

---

## Notes / known behavior

* **Running “Add all” multiple times can create duplicates**
  (events are inserted each run)

* **Per-shift Google actions use a template link by design**
  to allow editing before saving

* Times are interpreted in your **local timezone**:

  * `.ics` files use UTC timestamps
  * Google API inserts use RFC3339 timestamps with timezone info
