// shared/calendarUtils.js
// Pure helpers shared by content scripts + service worker.
// Exposes a single namespace: globalThis.TMC

(function (g) {
  const TMC = (g.TMC = g.TMC || {});

  /* ------------------------- small helpers ------------------------- */

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function asDate(d) {
    return d instanceof Date ? d : new Date(d);
  }

  function randomHex(bytes = 8) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  function simpleHash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(16);
  }

  function filterShiftsByPast(shifts, includePast) {
    if (includePast) return shifts || [];
    const now = Date.now();
    return (shifts || []).filter((s) => new Date(s.end).getTime() >= now);
  };

  /* ------------------------- ICS helpers ------------------------- */

  function toICSDateTimeUTC(d) {
    const dt = asDate(d);
    const year = dt.getUTCFullYear();
    const month = pad2(dt.getUTCMonth() + 1);
    const day = pad2(dt.getUTCDate());
    const hour = pad2(dt.getUTCHours());
    const min = pad2(dt.getUTCMinutes());
    const sec = pad2(dt.getUTCSeconds());
    return `${year}${month}${day}T${hour}${min}${sec}Z`;
  }

  function escapeICS(text) {
    return String(text ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");
  }

  function buildICS(shifts) {
    const calendarName = "Target Schedule";

    const lines = [];
    lines.push("BEGIN:VCALENDAR");
    lines.push("VERSION:2.0");
    lines.push("PRODID:-//Target Calendarizer//EN");
    lines.push(`X-WR-CALNAME:${escapeICS(calendarName)}`);

    (shifts || []).forEach((s, idx) => {
      const start = asDate(s.start);
      const end = asDate(s.end);

      const uid = `${Date.now()}-${idx}@target-calendarizer`;
      const summary = "Target Shift";
      const dtStart = toICSDateTimeUTC(start);
      const dtEnd = toICSDateTimeUTC(end);

      const location = ("T" + (s.location || "").trim()).trim();
      const description = `Job Role: ${s.role || "Shift"}`;

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`SUMMARY:${escapeICS(summary)}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      if (location) lines.push(`LOCATION:${escapeICS(location)}`);
      if (description) lines.push(`DESCRIPTION:${escapeICS(description)}`);
      lines.push("END:VEVENT");
    });

    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  /* ------------------------- Google template URL ------------------------- */

  // Implemented without URL/URLSearchParams so it works in any context.
  function buildGoogleRenderUrl(shift) {
    const start = asDate(shift.start);
    const end = asDate(shift.end);

    const summary = "Target Shift";
    const dates = `${toICSDateTimeUTC(start)}/${toICSDateTimeUTC(end)}`;
    const location = ("T" + (shift.location || "").trim()).trim();
    const description = `Job Role: ${shift.role || "Shift"}`;

    const params = [];
    params.push(["action", "TEMPLATE"]);
    params.push(["text", summary]);
    params.push(["dates", dates]);
    if (location) params.push(["location", location]);
    if (description) params.push(["details", description]);

    const qs = params
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    return `https://calendar.google.com/calendar/render?${qs}`;
  }

  /* ------------------------- Google Calendar API body ------------------------- */

  // RFC3339 with local offset: 2026-01-05T13:45:00-06:00
  function toRFC3339Local(date) {
    const d = asDate(date);
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mm = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());

    const offMin = -d.getTimezoneOffset(); // minutes east of UTC
    const sign = offMin >= 0 ? "+" : "-";
    const abs = Math.abs(offMin);
    const oh = pad2(Math.floor(abs / 60));
    const om = pad2(abs % 60);

    return `${y}-${m}-${day}T${hh}:${mm}:${ss}${sign}${oh}:${om}`;
  }

  function buildUniqueIcalUidForApi(shiftKey) {
    // If you want duplicates allowed, keep it unique per insert:
    return `tmc-${simpleHash(shiftKey)}-${Date.now()}-${randomHex(8)}@target-calendarizer`;
  }

  function buildGoogleEventInsertBody(shift) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const start = asDate(shift.start);
    const end = asDate(shift.end);
    if (isNaN(start) || isNaN(end)) {
      throw new Error("[TMC] Invalid shift dates: " + JSON.stringify(shift));
    }

    const location = ("T" + (shift.location || "").trim()).trim();
    const role = shift.role || "Shift";

    const key = [
      start.toISOString(),
      end.toISOString(),
      location,
      role,
    ].join("|");

    return {
      summary: "Target Shift",
      location,
      description: `Job Role: ${role}`,
      iCalUID: buildUniqueIcalUidForApi(key),
      start: { dateTime: toRFC3339Local(start), timeZone: tz },
      end: { dateTime: toRFC3339Local(end), timeZone: tz },
    };
  }

  /* ------------------------- downloads ------------------------- */

  function downloadTextFile({ filename, mime, text }) {
    const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "download.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadICS(shifts, filename = "target-schedule.ics") {
    const icsText = TMC.buildICS(shifts);
    downloadTextFile({ filename, mime: "text/calendar;charset=utf-8", text: icsText });
  }

  /* ------------------------- exports ------------------------- */

  TMC.filterShiftsByPast = filterShiftsByPast;
  TMC.buildICS = buildICS;
  TMC.buildGoogleRenderUrl = buildGoogleRenderUrl;
  TMC.buildGoogleEventInsertBody = buildGoogleEventInsertBody;
  TMC.downloadTextFile = downloadTextFile;
  TMC.downloadICS = downloadICS;

  // debug exports
  TMC._toICSDateTimeUTC = toICSDateTimeUTC;
  TMC._toRFC3339Local = toRFC3339Local;
})(globalThis);
