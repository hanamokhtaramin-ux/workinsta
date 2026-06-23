/* ============================================================================
   Disguise content script
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
    shrinkStories: true,
    tabTitle: "Analytics – Performance",
  };

  let cfg = { ...DEFAULTS };
  let manualPanic = false; // panic toggled by the user via key/button

  // --- A small corporate "chart" glyph used for the favicon + panic screen ---
  const LOGO_SVG =
    '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="32" height="32" rx="7" fill="#4361ee"/>' +
    '<path d="M7 22 L13 14 L17 18 L25 8" stroke="#fff" stroke-width="2.6" ' +
    'fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // --- LinkedIn-style nav icons (simple line glyphs) -------------------------
  const ICON = {
    search:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>',
    home:
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3z"/></svg>',
    network:
      '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="9" r="3.2"/><circle cx="17" cy="10" r="2.6"/><path d="M2 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5z"/><path d="M14.5 20c0-2.2 1.4-4 3.5-4s3.5 1.8 3.5 4z"/></svg>',
    jobs:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    messaging:
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v12H8l-4 4z"/></svg>',
    bell:
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm7-5-2-2v-4a5 5 0 0 0-10 0v4l-2 2v1h14z"/></svg>',
  };

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
  function navItem(icon, label, active) {
    return (
      '<div class="li-nav' + (active ? " active" : "") + '">' +
      icon + "<span>" + label + "</span></div>"
    );
  }
  function buildTopBar() {
    if (document.getElementById("ciq-topbar")) return;
    const bar = document.createElement("div");
    bar.id = "ciq-topbar";
    bar.innerHTML =
      '<div class="li-logo">in</div>' +
      '<div class="li-search">' + ICON.search + "<span>Search</span></div>" +
      '<div class="li-spacer"></div>' +
      navItem(ICON.home, "Home", true) +
      navItem(ICON.network, "My Network") +
      navItem(ICON.jobs, "Jobs") +
      navItem(ICON.messaging, "Messaging") +
      navItem(ICON.bell, "Notifications") +
      '<div class="li-divider"></div>' +
      '<div class="li-nav li-me"><div class="li-av">HM</div><span>Me ▾</span></div>' +
      '<div class="ciq-clock" id="ciq-clock">--:--</div>' +
      '<div class="ciq-min" id="ciq-min" title="Minimize (boss key: Ctrl+Shift+Space)">▣</div>';
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
      '<div class="pc-top"><div class="ciq-logo">' + LOGO_SVG + "</div></div>" +
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

  // ----------------------------------------------------------- stories tray
  // Instagram's story rings are <canvas> elements. The tightest ancestor that
  // contains two or more canvases is the stories tray. We tag it so the CSS
  // can shrink it. (Class names are hashed, so we detect by structure.)
  function tagStories() {
    if (!cfg.disguise) return;
    const cs = document.querySelectorAll("canvas");
    if (cs.length < 2) return;
    let node = cs[0].parentElement;
    let hops = 0;
    while (node && hops < 12) {
      if (node.querySelectorAll("canvas").length >= 2) {
        node.classList.add("ciq-stories");
        return;
      }
      node = node.parentElement;
      hops++;
    }
  }
  function clearStories() {
    document.querySelectorAll(".ciq-stories").forEach((e) => e.classList.remove("ciq-stories"));
  }

  // --------------------------------------------------------------- apply cfg
  function applyClasses() {
    const html = document.documentElement;
    html.classList.toggle("ciq-on", !!cfg.disguise);
    html.classList.toggle("ciq-mute", !!(cfg.disguise && cfg.mutePhotos));
    html.classList.toggle("ciq-stories-sm", !!(cfg.disguise && cfg.shrinkStories));
    if (cfg.disguise) {
      buildTopBar();
      buildPanic();
      setFavicon();
      enforceTitle();
      tagStories();
    } else {
      removeTopBar();
      clearStories();
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
      tagStories();
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
      document.documentElement.classList.toggle(
        "ciq-stories-sm",
        !!(cfg.disguise && cfg.shrinkStories)
      );
      setFavicon();
    });
  }
})();
