// background/calendarApi.js
// Google Calendar API calls (events.insert)

const CALENDAR_ID = "primary";
const API_BASE = "https://www.googleapis.com/calendar/v3";

async function fetchWithAuth(url, token, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  return fetch(url, { ...init, headers });
}

async function insertEvent(token, shift) {
  const body = TMC.buildGoogleEventInsertBody(shift);

  const url = `${API_BASE}/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;
  const resp = await fetchWithAuth(url, token, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const text = await resp.text().catch(() => "");
  if (!resp.ok) throw new Error(`events.insert failed: ${resp.status} ${text}`);

  return { ok: true };
}

async function addAllShifts(shifts) {
  if (!Array.isArray(shifts) || shifts.length === 0) return { added: 0 };

  let token = await TMC_AUTH.getValidAccessToken({ interactive: true });
  let added = 0;

  for (let i = 0; i < shifts.length; i++) {
    try {
      await insertEvent(token, shifts[i]);
      added++;
    } catch (e) {
      const msg = String(e?.message || "");

      // If token expired/revoked, clear cache and re-auth once, then retry this shift
      if (msg.includes("401") || msg.includes("403")) {
        await TMC_AUTH.clearTokenRecord();
        token = await TMC_AUTH.getValidAccessToken({ interactive: true });
        await insertEvent(token, shifts[i]);
        added++;
      } else {
        throw e;
      }
    }
  }

  return { added };
}

globalThis.TMC_CAL = {
  addAllShifts,
};
