
# Target Calendarizer (Chrome Extension)

A simple Chrome extension that lets Target team members quickly export their weekly **myTime** schedule as a clean, standards-compliant **.ics calendar file**, ready to import into Apple Calendar, Google Calendar, Outlook, or any other calendar app.

---

## 🚀 Features

- **One-click export** of your current week's Target schedule  
- **Automatic parsing** of your schedule directly from  
  `https://mytime.target.com/team-member/schedule`
- **Clean .ics events** that import perfectly into any calendar app
- **Accurate shift locations**, using your store number pulled directly from myTime  
  (e.g. `LOCATION: T1234`)
- **Job role included** in each calendar event
- **No configuration needed**
- **No background script**
- **No personal data stored**

---

## 📥 Installation

*This extension is not yet available on the Chrome Web Store, but will hopefully be published soon.*  
In the meantime, you can install it manually:

1. Clone or download this repository  
2. In Chrome, go to: `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select this project folder

The extension icon should now appear in your toolbar.

---

## 🧠 How It Works

The extension consists of:

### **1. Content Scripts** (in `content/`)
Injected only on the myTime schedule page:

- `parseShifts.js`  
  Extracts the date, start time, end time, role, and store number from each shift tile.

- `icsBuilder.js`  
  Generates a full `.ics` file, with per-event fields:
  - `SUMMARY: Target Shift`
  - `LOCATION: T<store_number>`
  - `DESCRIPTION: Job Role: <role>`

- `main.js`  
  Handles messages from the popup and triggers the file download.

### **2. Popup UI** (in `popup/`):
`index.html`, `index.js`, `index.css`  

The popup:

- Checks whether the current tab is the correct myTime URL
- Enables or disables the export button
- Sends a message to trigger the `.ics` generation

---

## 🔒 Privacy

This extension:

- Does **not** collect or send any data
- Does **not** access cookies or personal information
- Does **not** store anything except temporary in-memory calendar data
- Does **not** use analytics or external APIs

Everything runs **locally in your browser**.

---

## 🛠️ Development

To modify the code:

1. Make changes to the JavaScript files in `content/` or `popup/`
2. Reload the extension via `chrome://extensions` → **Reload**
3. Open the popup or schedule page to test your changes

---
