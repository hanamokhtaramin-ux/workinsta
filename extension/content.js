/* ============================================================================
   ContentIQ content script
   Runs on instagram.com (your own browser, your own logged-in session).
   It does NOT touch your credentials, send data anywhere, or talk to any
   server. It only restyles the page you're already looking at:
     - swaps the tab title + favicon
     - injects a corporate "dashboard" top bar
     - toggles the disguise / photo-mute CSS classes
     - provides a "boss key" panic screen
   Everything is driven by settings in chrome.storage.local, edited via the
   popup, applied live.
   ============================================================================ */

(function () {
  "use strict";

  const DEFAULTS = {
    disguise: true,
    mutePhotos: false,
    autoBlur: false,
    tabTitle: "Q2 Performance — ContentIQ",
  };

  let cfg = { ...DEFAULTS };
  let manualPanic = false; // panic toggled by the user via key/button

  // --- A small corporate "chart" glyph used for logo + favicon ---------------
  const LOGO_SVG =
    '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="32" height="32" rx="7" fill="#4361ee"/>' +
    '<path d="M7 22 L13 14 L17 18 L25 8" stroke="#fff" stroke-width="2.6" ' +
    'fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ------------------------------------------------------------------ favicon
  function setFavicon() {
    if (!cfg.disguise) return;
    try {
      document
        .querySelectorAll("link[rel~='icon'], link[rel='shortcut icon']")
        .forEach((l) => l.remove());
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.href = "data:image/svg+xml," + encodeURIComponent(LOGO_SVG);
      (document.head || document.documentElement).appendChild(link);
    } catch (e) {}
  }

  // -------------------------------------------------------------------- title
  function enforceTitle() {
    if (!cfg.disguise) return;
    if (document.title !== cfg.tabTitle) document.title = cfg.tabTitle;
  }

  // ----------------------------------------------------------------- top bar
  function buildTopBar() {
    if (document.getElementById("ciq-topbar")) return;
    const bar = document.createElement("div");
    bar.id = "ciq-topbar";
    bar.innerHTML =
      '<div class="ciq-logo">' + LOGO_SVG + "<span>ContentIQ</span></div>" +
      '<div class="ciq-crumb">Instagram <b>›</b> Audience <b>›</b> Live Feed</div>' +
      '<div class="ciq-spacer"></div>' +
      '<div class="ciq-pill">Live sync ●</div>' +
      '<div class="ciq-clock" id="ciq-clock">--:--</div>' +
      '<div class="ciq-min" id="ciq-min" title="Minimize report (boss key: Ctrl+Shift+Space)">▣</div>' +
      '<div class="ciq-avatar">HM</div>';
    document.body.appendChild(bar);
    bar.querySelector("#ciq-min").addEventListener("click", () => togglePanic(true));
    tickClock();
  }
  function removeTopBar() {
    const b = document.getElementById("ciq-topbar");
    if (b) b.remove();
  }
  function tickClock() {
    const el = document.getElementById("ciq-clock");
    if (el) {
      const d = new Date();
      el.textContent =
        String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }
  }
  setInterval(tickClock, 15000);

  // ----------------------------------------------------------- panic screen
  function buildPanic() {
    if (document.getElementById("ciq-panic")) return;
    const p = document.createElement("div");
    p.id = "ciq-panic";
    p.innerHTML =
      '<div class="pc-top"><div class="ciq-logo">' + LOGO_SVG +
      "<span>ContentIQ</span></div></div>" +
      '<div class="pc-body">' +
      '<div class="pc-side"><div class="pc-nav w2"></div><div class="pc-nav w1"></div>' +
      '<div class="pc-nav w4"></div><div class="pc-nav w3"></div><div class="pc-nav w2"></div>' +
      '<div class="pc-nav w1"></div></div>' +
      '<div class="pc-main"><div class="pc-kpis">' +
      '<div class="pc-kpi"><div class="b1"></div><div class="b2"></div></div>'.repeat(4) +
      '</div><div class="pc-chart"><div class="pc-spin"></div>' +
      "<div>Generating quarterly performance report…</div></div></div></div>" +
      '<div class="pc-hint">Press Ctrl+Shift+Space or Esc to resume</div>';
    document.body.appendChild(p);
  }
  function togglePanic(force) {
    const p = document.getElementById("ciq-panic");
    if (!p) return;
    const show = typeof force === "boolean" ? force : !p.classList.contains("show");
    p.classList.toggle("show", show);
    manualPanic = show;
  }

  // --------------------------------------------------------------- apply cfg
  function applyClasses() {
    const html = document.documentElement;
    html.classList.toggle("ciq-on", !!cfg.disguise);
    html.classList.toggle("ciq-mute", !!(cfg.disguise && cfg.mutePhotos));
    if (cfg.disguise) {
      buildTopBar();
      buildPanic();
      setFavicon();
      enforceTitle();
    } else {
      removeTopBar();
      togglePanic(false);
    }
  }

  // ------------------------------------------------------------------ events
  // Boss key: Ctrl+Shift+Space toggles the panic screen; Esc dismisses it.
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === "Space") {
        e.preventDefault();
        togglePanic();
      } else if (e.key === "Escape" && manualPanic) {
        togglePanic(false);
      }
    },
    true
  );

  // Optional auto-blur: cover the screen whenever you switch tabs / windows.
  // Only auto-dismiss covers that auto-blur itself raised, so it never
  // un-hides a panic you triggered on purpose with the boss key.
  let autoBlurRaised = false;
  window.addEventListener("blur", () => {
    if (cfg.disguise && cfg.autoBlur && !manualPanic) {
      togglePanic(true);
      autoBlurRaised = true;
    }
  });
  window.addEventListener("focus", () => {
    if (autoBlurRaised) {
      togglePanic(false);
      autoBlurRaised = false;
    }
  });

  // Instagram is a single-page app: it rewrites <title> and re-renders on
  // navigation. Keep re-asserting our disguise.
  setInterval(() => {
    if (cfg.disguise) {
      enforceTitle();
      if (!document.getElementById("ciq-topbar") && document.body) buildTopBar();
    }
  }, 1000);

  const titleObserver = new MutationObserver(enforceTitle);

  // ------------------------------------------------------------------- boot
  function boot() {
    chrome.storage.local.get(DEFAULTS, (stored) => {
      cfg = { ...DEFAULTS, ...stored };
      applyClasses();
      const titleEl = document.querySelector("title");
      if (titleEl) titleObserver.observe(titleEl, { childList: true });
    });
  }

  // Live updates from the popup.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    let changed = false;
    for (const k of Object.keys(DEFAULTS)) {
      if (k in changes) {
        cfg[k] = changes[k].newValue;
        changed = true;
      }
    }
    if (changed) applyClasses();
  });

  // Messages from the popup (e.g. "panic now" button).
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.action === "panic") togglePanic(true);
  });

  // document_start: body may not exist yet.
  if (document.body) {
    boot();
  } else {
    document.addEventListener("DOMContentLoaded", boot);
    // Apply the html classes immediately so the disguise CSS kicks in early.
    chrome.storage.local.get(DEFAULTS, (stored) => {
      cfg = { ...DEFAULTS, ...stored };
      document.documentElement.classList.toggle("ciq-on", !!cfg.disguise);
      document.documentElement.classList.toggle(
        "ciq-mute",
        !!(cfg.disguise && cfg.mutePhotos)
      );
      setFavicon();
    });
  }
})();
