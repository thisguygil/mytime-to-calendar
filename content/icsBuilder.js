function pad2(n) {
  return n.toString().padStart(2, "0");
}

function toICSDateTimeUTC(d) {
  const year = d.getUTCFullYear();
  const month = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());
  const hour = pad2(d.getUTCHours());
  const min = pad2(d.getUTCMinutes());
  const sec = pad2(d.getUTCSeconds());
  return `${year}${month}${day}T${hour}${min}${sec}Z`;
}

function escapeICS(text) {
  return text
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

  shifts.forEach((s, idx) => {
    const uid = `${Date.now()}-${idx}@target-calendarizer`;
    let summary = "Target Shift";
    const dtStart = toICSDateTimeUTC(s.start);
    const dtEnd   = toICSDateTimeUTC(s.end);
    let location = "T" + (s.location || "").trim();
    let description = `Job Role: ${s.role}`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`SUMMARY:${escapeICS(summary)}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`LOCATION:${escapeICS(location)}`);
    lines.push(`DESCRIPTION:${escapeICS(description)}`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}