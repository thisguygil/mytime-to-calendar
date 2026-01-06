// content/data/parseShifts.js

const SHIFT_LINK_SELECTOR = 'a[role="link"][aria-label*=" shift from "]';
const START_SELECTOR = 'p[data-cy="nextSchedDisplaySegStartTime"]';
const END_SELECTOR   = 'p[data-cy="nextSchedDisplaySegEndTime"]';
const LOC_SELECTOR   = 'p[data-cy="nextSchedDisplaySegLoc"]';

function parseTime(text) {
  text = text.trim().toUpperCase();
  // Handle "8:00 AM", "08:00AM", etc.
  const m = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (!m) throw new Error("Could not parse time: " + text);

  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3];

  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  return { hour, minute };
}

function findShiftDate(node) {
  let cur = node;
  while (cur) {
    const aria = cur.getAttribute && cur.getAttribute("aria-label");
    if (aria) {
      const m = aria.match(/schedule for (\d{4}-\d{2}-\d{2})/);
      if (m) {
        // Local midnight of that date in user's timezone
        return new Date(m[1] + "T00:00:00");
      }
    }
    cur = cur.parentElement;
  }
  return null;
}

/**
 * Returns array of:
 * { start: Date, end: Date, location: string, role: string }
 */
function parseShiftsFromPage() {
  const nodes = document.querySelectorAll(SHIFT_LINK_SELECTOR);
  const shifts = [];

  nodes.forEach((link) => {
    const shiftDate = findShiftDate(link);
    if (!shiftDate) return;

    const startEl = link.querySelector(START_SELECTOR);
    const endEl   = link.querySelector(END_SELECTOR);
    const locEl   = link.querySelector(LOC_SELECTOR);

    if (!startEl || !endEl) return;

    const startText = startEl.textContent.trim();
    const endText   = endEl.textContent.trim();
    const location  = locEl ? locEl.textContent.trim() : "";

    const aria = link.getAttribute("aria-label") || "";
    let role = "Shift";
    const idx = aria.indexOf(" shift from ");
    if (idx !== -1) {
      role = aria.slice(0, idx).trim();
    }

    const { hour: sh, minute: sm } = parseTime(startText);
    const { hour: eh, minute: em } = parseTime(endText);

    const start = new Date(shiftDate);
    start.setHours(sh, sm, 0, 0);

    const end = new Date(shiftDate);
    end.setHours(eh, em, 0, 0);

    // Handle overnight shift: end <= start → add a day
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }

    shifts.push({ start, end, location, role });
  });

  return shifts;
}

function parseShiftFromManageShiftButton(manageBtn) {
  if (!manageBtn) return null;

  const li =
    manageBtn.closest('li[data-cy^="weeklySchedListItem"]') ||
    manageBtn.closest("li") ||
    manageBtn.parentElement;

  if (!li) return null;

  // Reuse the same robust date lookup you already have (aria-label "schedule for YYYY-MM-DD")
  const shiftDate = findShiftDate(li);
  if (!shiftDate) return null;

  const startText =
    li.querySelector('[data-cy="nextSchedDisplaySegStartTime"]')?.textContent?.trim() || null;
  const endText =
    li.querySelector('[data-cy="nextSchedDisplaySegEndTime"]')?.textContent?.trim() || null;

  if (!startText || !endText) return null;

  const location =
    li.querySelector('[data-cy="nextSchedDisplaySegLoc"]')?.textContent?.trim() || "";

  // Heuristic role (same idea you had in manageShiftMenu.js)
  const dateText =
    li.querySelector('[data-cy="nextSchedDisplaySegDateOnWeekly"]')?.textContent?.trim() || null;

  const role =
    Array.from(li.querySelectorAll("p.MuiTypography-body2"))
      .map((p) => p.textContent?.trim())
      .find((t) => t && t !== dateText && t !== startText && t !== endText && t !== location && t.length < 60) ||
    "Shift";

  const { hour: sh, minute: sm } = parseTime(startText);
  const { hour: eh, minute: em } = parseTime(endText);

  const start = new Date(shiftDate);
  start.setHours(sh, sm, 0, 0);

  const end = new Date(shiftDate);
  end.setHours(eh, em, 0, 0);

  if (end <= start) end.setDate(end.getDate() + 1);

  return { start, end, location, role };
}