// Main logic for content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXPORT_ICS") {
    try {
      const shifts = parseShiftsFromPage();
      if (!shifts.length) {
        sendResponse({
          ok: false,
          error: "No shifts found on this page."
        });
        return true;
      }

      const icsText = buildICS(shifts);
      triggerDownload(icsText);

      sendResponse({ ok: true });
    } catch (err) {
      console.error(err);
      sendResponse({
        ok: false,
        error: err.message || "Unexpected error."
      });
    }

    return true;
  }

  return false;
});


// Trigger download of ICS file
function triggerDownload(icsText) {
  const blob = new Blob([icsText], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "target-schedule.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}