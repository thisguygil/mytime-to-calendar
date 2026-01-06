// content/ui/topBar.js

const TOP_EXPORT_BTN_ID = "tmc_export_btn";
const TOP_ADD_GOOGLE_BTN_ID = "tmc_add_google_btn";
const TOP_GROUP_ATTR = "data-tmc-topbar-group";

function findTopBarContainer() {
  const candidates = [
    "header",
    '[role="banner"]',
    "nav",
    '[data-cy*="header"]',
    '[data-testid*="header"]',
  ];

  for (const sel of candidates) {
    const element = document.querySelector(sel);
    if (element && element.getBoundingClientRect().top < 20) return element;
  }

  const containers = Array.from(document.querySelectorAll("div, header, nav"));
  return (
    containers.find((element) => {
      const styles = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        (styles.position === "fixed" || styles.position === "sticky") &&
        rect.top <= 0 &&
        rect.height >= 40 &&
        rect.width > 300
      );
    }) || null
  );
}

function flashButtonText(btn, text, ms = 1100) {
  const original = btn.textContent;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = original), ms);
}

function buildButtonBaseStyle() {
  return {
    padding: "6px 12px",
    borderRadius: "999px",
    background: "transparent",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  };
}

function ensureTopBarButtons() {
  const topBar = findTopBarContainer();
  if (!topBar) return;

  // If top bar is static, we need it to anchor our absolute-positioned group
  const topBarStyle = getComputedStyle(topBar);
  if (topBarStyle.position === "static") topBar.style.position = "relative";

  // If we already injected but the group got detached/moved, clean up and re-inject
  const existingGroup = document.querySelector(`[${TOP_GROUP_ATTR}="1"]`);
  if (existingGroup && !topBar.contains(existingGroup)) {
    existingGroup.remove();
  }

  if (document.querySelector(`[${TOP_GROUP_ATTR}="1"]`)) return;

  // Centered button group container
  const group = document.createElement("div");
  group.setAttribute(TOP_GROUP_ATTR, "1");
  Object.assign(group.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    zIndex: "9999",
  });

  // Primary: Add all to Google (API)
  const addBtn = document.createElement("button");
  addBtn.id = TOP_ADD_GOOGLE_BTN_ID;
  addBtn.type = "button";
  addBtn.textContent = "📅 Add all to Google";

  Object.assign(addBtn.style, buildButtonBaseStyle(), {
    border: "1px solid rgba(255,255,255,0.35)",
    color: "white",
  });

  addBtn.addEventListener("mouseenter", () => {
    addBtn.style.background = "rgba(255,255,255,0.10)";
    addBtn.style.borderColor = "rgba(255,255,255,0.55)";
  });
  addBtn.addEventListener("mouseleave", () => {
    addBtn.style.background = "transparent";
    addBtn.style.borderColor = "rgba(255,255,255,0.35)";
  });

  addBtn.addEventListener("click", async () => {
    const originalText = addBtn.textContent;
    if (addBtn.dataset.tmcBusy === "1") return;
    addBtn.dataset.tmcBusy = "1";

    addBtn.disabled = true;
    addBtn.style.cursor = "default";

    try {
      let shifts = parseShiftsFromPage();
      if (!shifts.length) {
        flashButtonText(addBtn, "No shifts found");
        return;
      }

      const settings = await TMC_SETTINGS.loadSettings();
      shifts = TMC.filterShiftsByPast(shifts, settings.includePastShifts);

      if (!shifts.length) {
        flashButtonText(
          addBtn,
          settings.includePastShifts ? "No shifts found" : "No upcoming shifts"
        );
        return;
      }

      addBtn.textContent = "Adding…";

      const res = await chrome.runtime.sendMessage({
        type: "TMC_ADD_ALL_SHIFTS",
        shifts: shifts.map((s) => ({
          start: s.start instanceof Date ? s.start.toISOString() : String(s.start),
          end: s.end instanceof Date ? s.end.toISOString() : String(s.end),
          location: s.location,
          role: s.role,
        })),
      });

      if (!res?.ok) throw new Error(res?.error || "Failed to add shifts");

      addBtn.textContent = "Added ✅";

      if (settings.openGoogleCalendarAfterAdd) {
        setTimeout(() => {
          window.open(
            "https://calendar.google.com/calendar/u/0/r",
            "_blank",
            "noopener,noreferrer"
          );
        }, 350);
      }

      setTimeout(() => {
        addBtn.textContent = originalText;
      }, 900);
    } catch (e) {
      console.error(e);
      addBtn.textContent = "Error";
      setTimeout(() => {
        addBtn.textContent = originalText;
      }, 1100);
    } finally {
      addBtn.disabled = false;
      addBtn.style.cursor = "pointer";
      addBtn.dataset.tmcBusy = "0";
    }
  });

  // Secondary: Export .ics
  const exportBtn = document.createElement("button");
  exportBtn.id = TOP_EXPORT_BTN_ID;
  exportBtn.type = "button";
  exportBtn.textContent = "Export .ics";

  Object.assign(exportBtn.style, buildButtonBaseStyle(), {
    border: "1px solid rgba(255,255,255,0.25)",
    color: "rgba(255,255,255,0.9)",
    opacity: "0.9",
    padding: "6px 10px",
  });

  exportBtn.addEventListener("mouseenter", () => {
    exportBtn.style.background = "rgba(255,255,255,0.08)";
    exportBtn.style.borderColor = "rgba(255,255,255,0.45)";
  });
  exportBtn.addEventListener("mouseleave", () => {
    exportBtn.style.background = "transparent";
    exportBtn.style.borderColor = "rgba(255,255,255,0.25)";
  });

  exportBtn.addEventListener("click", async () => {
    try {
      let shifts = parseShiftsFromPage();
      if (!shifts.length) {
        flashButtonText(exportBtn, "No shifts found");
        return;
      }

      const settings = await TMC_SETTINGS.loadSettings();
      shifts = TMC.filterShiftsByPast(shifts, settings.includePastShifts);

      if (!shifts.length) {
        flashButtonText(
          exportBtn,
          settings.includePastShifts ? "No shifts found" : "No upcoming shifts"
        );
        return;
      }

      TMC.downloadICS(shifts, "target-schedule.ics");
    } catch (e) {
      console.error(e);
    }
  });

  group.append(addBtn, exportBtn);
  topBar.appendChild(group);
}

function removeTopBarButtons() {
  document.querySelector(`[${TOP_GROUP_ATTR}="1"]`)?.remove();
  document.getElementById(TOP_ADD_GOOGLE_BTN_ID)?.remove();
  document.getElementById(TOP_EXPORT_BTN_ID)?.remove();
}
