// src/popup/popup.js

const el = (id) => document.getElementById(id);

const includePastShifts = el("includePastShifts");
const openGoogleCalendarAfterAdd = el("openGoogleCalendarAfterAdd");
const status = el("status");
const resetBtn = el("reset");

function setStatus(msg, ms = 900) {
  status.textContent = msg || "";
  if (msg) setTimeout(() => (status.textContent = ""), ms);
}

async function loadIntoUI() {
  const s = await TMC_SETTINGS.loadSettings();
  includePastShifts.checked = !!s.includePastShifts;
  openGoogleCalendarAfterAdd.checked = !!s.openGoogleCalendarAfterAdd;
}

async function saveFromUI() {
  try {
    await TMC_SETTINGS.saveSettings({
      includePastShifts: includePastShifts.checked,
      openGoogleCalendarAfterAdd: openGoogleCalendarAfterAdd.checked,
    });
    setStatus("Saved");
  } catch (e) {
    console.error(e);
    setStatus("Error saving", 1200);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadIntoUI();

  includePastShifts.addEventListener("change", saveFromUI);
  openGoogleCalendarAfterAdd.addEventListener("change", saveFromUI);

  resetBtn.addEventListener("click", async () => {
    try {
      await TMC_SETTINGS.saveSettings(TMC_SETTINGS.DEFAULTS);
      await loadIntoUI();
      setStatus("Reset");
    } catch (e) {
      console.error(e);
      setStatus("Error resetting", 1200);
    }
  });
});
