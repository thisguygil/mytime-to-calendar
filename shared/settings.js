// shared/settings.js
// Exposes: globalThis.TMC_SETTINGS = { KEY, DEFAULTS, loadSettings, saveSettings }

(function (g) {
  const KEY = "tmc_settings_v2";

  const DEFAULTS = Object.freeze({
    includePastShifts: false,
    openGoogleCalendarAfterAdd: true,
  });

  async function loadSettings() {
    const res = await chrome.storage.sync.get(KEY);
    const raw = res?.[KEY] && typeof res[KEY] === "object" ? res[KEY] : {};
    return { ...DEFAULTS, ...raw };
  }

  async function saveSettings(settings) {
    // Only persist known keys (prevents old/extra junk from accumulating)
    const next = {
      includePastShifts: !!settings?.includePastShifts,
      openGoogleCalendarAfterAdd: !!settings?.openGoogleCalendarAfterAdd,
    };
    await chrome.storage.sync.set({ [KEY]: next });
  }

  g.TMC_SETTINGS = { KEY, DEFAULTS, loadSettings, saveSettings };
})(globalThis);
