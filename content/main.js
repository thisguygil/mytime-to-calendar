// content/main.js

function isOnSchedulePage() {
  return location.pathname.includes("/team-member/schedule");
}

/* -------------------- scheduling (performance) -------------------- */

let tmcScheduled = false;
let tmcInFlight = false;
let tmcLastRunAt = 0;

function scheduleRunOnce() {
  if (tmcScheduled) return;
  tmcScheduled = true;

  requestAnimationFrame(async () => {
    tmcScheduled = false;

    if (tmcInFlight) return;

    const now = Date.now();
    if (now - tmcLastRunAt < 200) return;
    tmcLastRunAt = now;

    tmcInFlight = true;
    try {
      await runOnce();
    } finally {
      tmcInFlight = false;
    }
  });
}

/* -------------------- main render logic -------------------- */

async function runOnce() {
  if (!isOnSchedulePage()) {
    removeTopBarButtons?.();
    return;
  }

  // Ensure UI exists (idempotent)
  ensureTopBarButtons?.();
}

/* -------------------- init + SPA hooks -------------------- */

function hookHistory(onNav) {
  const _pushState = history.pushState;
  const _replaceState = history.replaceState;

  history.pushState = function (...args) {
    _pushState.apply(this, args);
    onNav();
  };

  history.replaceState = function (...args) {
    _replaceState.apply(this, args);
    onNav();
  };

  window.addEventListener("popstate", onNav);
}

function init() {
  // Init Manage Shift menu injection ONCE (global function, no imports)
  globalThis.initManageShiftMenuUi?.();

  runOnce();

  hookHistory(() => setTimeout(scheduleRunOnce, 0));

  const mo = new MutationObserver(scheduleRunOnce);
  mo.observe(document.body || document.documentElement, {
    subtree: true,
    childList: true,
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;
    if (!changes?.[TMC_SETTINGS?.KEY]) return;
    scheduleRunOnce();
  });
}

init();
