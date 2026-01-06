// content/ui/manageShiftMenu.js

let lastManageShiftBtn = null;

/* -------------------- helpers -------------------- */

function isVisible(el) {
  if (!el) return false;
  const s = getComputedStyle(el);
  if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function findVisibleMenu() {
  // myTime uses MUI menus; the visible one lives inside a visible Paper/Popover wrapper.
  const menus = document.querySelectorAll('ul[role="menu"].MuiMenu-list');
  for (const ul of menus) {
    const paper = ul.closest(".MuiMenu-paper,.MuiPopover-paper,.MuiPaper-root");
    if (paper && isVisible(paper)) return ul;
  }
  return null;
}

function makeDividerLikeExisting(menu) {
  const existing =
    menu.querySelector('[role="separator"]') ||
    menu.querySelector("hr") ||
    menu.querySelector(".MuiDivider-root");

  if (existing) return existing.cloneNode(true);

  const hr = document.createElement("hr");
  hr.className = "MuiDivider-root MuiDivider-fullWidth";
  return hr;
}

function svgToEl(svgString) {
  const wrap = document.createElement("div");
  wrap.innerHTML = svgString.trim();
  return wrap.firstElementChild;
}

/* -------------------- icons -------------------- */

const ICON_CALENDAR = `
<svg width="25px" height="25px" viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="12.5" cy="12.5" r="12.5" fill="#CB0202"></circle>
  <rect x="6.5" y="7.2" width="12" height="11" rx="1.6" fill="#FFFFFF"></rect>
  <rect x="6.5" y="7.2" width="12" height="2.6" fill="#CB0202"></rect>
  <rect x="8.1" y="5.8" width="2" height="3" rx="1" fill="#FFFFFF"></rect>
  <rect x="14.4" y="5.8" width="2" height="3" rx="1" fill="#FFFFFF"></rect>
  <rect x="8.3" y="10.8" width="2.3" height="2.1" fill="#CB0202"></rect>
  <rect x="11.4" y="10.8" width="2.3" height="2.1" fill="#CB0202"></rect>
  <rect x="14.5" y="10.8" width="2.3" height="2.1" fill="#CB0202"></rect>
  <rect x="8.3" y="13.7" width="2.3" height="2.1" fill="#CB0202"></rect>
  <rect x="11.4" y="13.7" width="2.3" height="2.1" fill="#CB0202"></rect>
</svg>
`;

const ICON_EXPORT = `
<svg width="25px" height="25px" viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="12.5" cy="12.5" r="12.5" fill="#CC0202"></circle>
  <path d="M8 7.2h6.2l2.8 2.8V18c0 .9-.7 1.6-1.6 1.6H8c-.9 0-1.6-.7-1.6-1.6V8.8c0-.9.7-1.6 1.6-1.6z" fill="#FFFFFF"/>
  <path d="M14.2 7.2V10h2.8" fill="#CC0202"/>
  <path d="M12.5 11.1v5.2" stroke="#CC0202" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M10.3 14.3l2.2 2.2 2.2-2.2" fill="none" stroke="#CC0202" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

/* -------------------- menu item builder -------------------- */

function makeMenuItem(menu, label, svgIconString, onClick) {
  const template = menu.querySelector('li[role="menuitem"]');
  const li = template ? template.cloneNode(true) : document.createElement("li");

  li.setAttribute("role", "menuitem");
  li.tabIndex = -1;
  li.className = template
    ? template.className
    : "MuiButtonBase-root MuiMenuItem-root MuiMenuItem-gutters";

  li.textContent = "";

  const iconWrap = document.createElement("div");
  iconWrap.style.display = "flex";
  iconWrap.style.alignItems = "flex-end";
  iconWrap.appendChild(svgToEl(svgIconString));

  const textWrap = document.createElement("div");
  textWrap.style.marginLeft = "5px";
  textWrap.textContent = label;

  li.appendChild(iconWrap);
  li.appendChild(textWrap);

  const rippleClass =
    template?.querySelector(".MuiTouchRipple-root")?.className || "MuiTouchRipple-root";
  const ripple = document.createElement("span");
  ripple.className = rippleClass;
  li.appendChild(ripple);

  li.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    },
    true
  );

  return li;
}

/* -------------------- shift + inject -------------------- */

function getShift() {
  return typeof parseShiftFromManageShiftButton === "function"
    ? parseShiftFromManageShiftButton(lastManageShiftBtn)
    : null;
}

function inject(menu) {
  if (!menu || menu.dataset.tmcInjected) return;
  menu.dataset.tmcInjected = "1";

  menu.appendChild(makeDividerLikeExisting(menu));

  menu.appendChild(
    makeMenuItem(menu, "Add this shift to Google", ICON_CALENDAR, () => {
      const shift = getShift();
      if (!shift) return;
      window.open(TMC.buildGoogleRenderUrl(shift), "_blank", "noopener,noreferrer");
    })
  );

  menu.appendChild(
    makeMenuItem(menu, "Export this shift (.ics)", ICON_EXPORT, () => {
      const shift = getShift();
      if (!shift) return;
      TMC.downloadICS([shift], "target-shift.ics");
    })
  );
}

/* -------------------- fast injection strategy -------------------- */

function injectSoon() {
  // 1) Try immediately (sometimes menu is already in DOM)
  const now = findVisibleMenu();
  if (now) {
    inject(now);
    return;
  }

  // 2) Try next paint (this is usually the sweet spot)
  requestAnimationFrame(() => {
    const next = findVisibleMenu();
    if (next) {
      inject(next);
      return;
    }

    // 3) Short-lived observer ONLY while menu is opening
    const obs = new MutationObserver(() => {
      const m = findVisibleMenu();
      if (m) {
        obs.disconnect();
        inject(m);
      }
    });

    // Observe body (cheaper than documentElement), disconnect ASAP.
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });

    // Safety: never keep it running long
    setTimeout(() => obs.disconnect(), 1200);
  });
}

/* -------------------- event hook -------------------- */

function onManageShiftOpen(e) {
  const btn = e.target.closest?.('button[data-cy="manageShiftButton"]');
  if (!btn) return;

  lastManageShiftBtn = btn;

  // Kick as soon as possible without delaying a whole timer tick
  queueMicrotask(injectSoon);
}

function initManageShiftMenuUi() {
  // Capture phase helps us run before other handlers that might schedule work.
  document.addEventListener("click", onManageShiftOpen, true);

  // Optional: even earlier than click (feels snappier). Safe to keep.
  document.addEventListener("pointerdown", onManageShiftOpen, true);
}

globalThis.initManageShiftMenuUi = initManageShiftMenuUi;
