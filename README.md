# myTime to Calendar (Chrome & Firefox Extension)

A lightweight browser extension that helps **Target team members** turn their **weekly schedule** into calendar events.

The extension works on **both Chrome (PC) and Firefox (PC/Android)**.

---

## Features

When you’re on the **myTime schedule page** ([mytime.target.com/team-member/schedule](https://mytime.target.com/team-member/schedule)),

### Top bar

In the header, the extension adds two buttons:

* **📅 Add all to Google** (Chrome & Firefox PC only, using Google Calendar API)

  Adds all visible shifts to Google Calendar

* **Export .ics** (all platforms)

  Downloads an `.ics` file containing all visible shifts that can be imported into any calendar app

### Per-shift menu (Under “Manage Shift”)

Inside each shift’s **Manage Shift** menu, two new options are added:

* **Add this shift to Google**

  Opens a Google Calendar *template* so you can review/edit before saving

* **Export this shift (.ics)**

  Downloads a single-shift `.ics` file

### Settings popup

Click the extension icon to open settings:

* **Include past shifts**
  
  Include shifts that already ended (default: off)

* **Open Google Calendar in a new tab**
  
  After a successful “Add all” operation (default: on)

---

## Browser support

This extension is available on **both major browser platforms**:

* **Chromium-based browsers** - Install via the [**Chrome Web Store**](https://chromewebstore.google.com/detail/mytime-to-calendar/odekbnpmjmbggpaeglaljcgapeoknhcp)
  (works on Chrome, Edge, Brave, and other Chromium browsers)

* **Firefox** - Install via [**Firefox Add-ons**](https://addons.mozilla.org/en-US/firefox/addon/mytime-to-calendar/) (works on Firefox PC and Android)

All features — including `.ics` export, per-shift actions, and Google Calendar integration, are **supported on both PC platforms**.

The "Add all to Google" button using the Google Calendar API is **not available on Firefox Android**, but you can still use per-shift Google Calendar templates.

---

## Permissions (what & why)

### Host permissions

* `https://mytime.target.com/*`
  Read schedule data and inject UI

* Google APIs
  Required only for Chrome’s Google Calendar API integration
  Despite the fact that it's not used on Firefox Android, the permission is still needed due to manifest requirements since the feature is available on Firefox PC.

### Extension permissions

* `identity` – OAuth authentication for Google API (Chrome and Firefox PC, but again required on Firefox Android due to manifest requirements)
* `storage` – settings and token cache

Firefox builds include additional metadata for AMO data-collection disclosure.

---

## Project structure (simplified)

```
src/
  background/
    background.js                 # message handling
    auth.js                       # OAuth flow
    calendarApi.js                # Google Calendar API

  content/
    parseShifts.js                # DOM parsing
    ui/
      topBar.js                   # top bar buttons
      manageShiftMenu.js          # per-shift menu items
    main.js                       # SPA lifecycle handling

  shared/
    calendarUtils.js              # ICS + Google template helpers
    settings.js                   # storage helpers

  popup/                          # settings UI
    index.html
    popup.css
    popup.js

build/
  build.ps1                       # build script
  manifest.chrome.override.json   # Chrome-specific manifest additions
  manifest.firefox.override.json  # Firefox-specific manifest additions
```

---

## Notes / known behavior

* "Add all to Google" requires **Chrome or Firefox PC** and is hidden on Firefox Android
  (not available on Firefox Android due to lack of `browser.identity` API)

* Running “Add all” multiple times will create duplicates (events are inserted each button click)

* Per-shift Google actions use a template link **by design** to allow editing before saving

* Times are interpreted in your **local timezone**:

  * `.ics` files use UTC timestamps
  * Google API inserts use RFC3339 timestamps with timezone info
