// background/background.js
// Orchestrator: imports + message handler

importScripts(
  chrome.runtime.getURL("shared/calendarUtils.js"),
  chrome.runtime.getURL("background/auth.js"),
  chrome.runtime.getURL("background/calendarApi.js")
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "TMC_ADD_ALL_SHIFTS") return;

  (async () => {
    try {
      const result = await TMC_CAL.addAllShifts(message.shifts);
      sendResponse({ ok: true, result });
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();

  return true;
});
