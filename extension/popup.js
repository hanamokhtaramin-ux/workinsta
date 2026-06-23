/* Popup logic: read/write settings in chrome.storage.local. The content
   script listens to storage changes and applies them live, so there's no
   need to reload the Instagram tab. */

const DEFAULTS = {
  disguise: true,
  mutePhotos: false,
  autoBlur: false,
  shrinkStories: true,
  tabTitle: "Analytics – Performance",
};

const toggles = ["disguise", "mutePhotos", "autoBlur", "shrinkStories"];

// Load current settings into the UI.
chrome.storage.local.get(DEFAULTS, (cfg) => {
  toggles.forEach((id) => {
    document.getElementById(id).checked = !!cfg[id];
  });
  document.getElementById("tabTitle").value = cfg.tabTitle || "";
});

// Wire up the checkboxes.
toggles.forEach((id) => {
  document.getElementById(id).addEventListener("change", (e) => {
    chrome.storage.local.set({ [id]: e.target.checked });
  });
});

// Tab title: save as you type (fall back to default if cleared).
document.getElementById("tabTitle").addEventListener("input", (e) => {
  const v = e.target.value.trim() || DEFAULTS.tabTitle;
  chrome.storage.local.set({ tabTitle: v });
});

// "Hide now" button -> tell the active Instagram tab to show the panic cover.
document.getElementById("panicBtn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "panic" }, () => void chrome.runtime.lastError);
    }
    window.close();
  });
});
