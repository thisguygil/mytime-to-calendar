const SCHEDULE_URL_PREFIX = "https://mytime.target.com/team-member/schedule";

// UI helpers
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, function (m) {
    return (
      {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[m] || m
    );
  });
}

function setStatus(text, isError = false, allowHTML = false) {
  const status = document.getElementById("status");
  status.innerHTML = allowHTML ? text : escapeHTML(text);
  status.style.color = isError ? "red" : "inherit";
}


// Enable/disable export button based on current page
function checkCurrentTabAndInit() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const url = tab && tab.url ? tab.url : "";

    if (!url.startsWith(SCHEDULE_URL_PREFIX)) {
      setExportEnabled(false);

      const hyperlinkMessage = `
        Please open the
        <a href="https://mytime.target.com/team-member/schedule"
          target="_blank" style="color: red;">
          myTime schedule page
        </a>
        to export your shifts.
      `;

      setStatus(hyperlinkMessage, true, true);
    } else { // On schedule page → normal behavior
      setExportEnabled(true);
      setStatus("");
    }
  });
}

function setExportEnabled(enabled) {
  const btn = document.getElementById("exportBtn");
  btn.disabled = !enabled;
  btn.style.opacity = enabled ? "1" : "0.6";
  btn.style.cursor = enabled ? "pointer" : "default";
}


// Handle export button click
async function handleExportClick() {
  setStatus("");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.id) {
      setStatus("No active tab found.", true);
      return;
    }

    chrome.tabs.sendMessage(
      tab.id,
      { type: "EXPORT_ICS" },
      (response) => {
        if (chrome.runtime.lastError) {
          setStatus("This page doesn't look like your myTime schedule.", true);
          return;
        }

        if (!response) {
          setStatus("No response from page script.", true);
          return;
        }

        if (response.ok) {
          setStatus("Exported schedule");
        } else {
          setStatus(response.error || "Failed to export.", true);
        }
      }
    );
  });
}


// Initialize popup
document.addEventListener("DOMContentLoaded", () => {
  checkCurrentTabAndInit();
  document.getElementById("exportBtn").addEventListener("click", handleExportClick);
});
