# ContentIQ — Instagram "work mode" disguise

A small browser extension that **reskins instagram.com to look like a corporate
analytics dashboard** while you stay logged into your own account in your own
browser. You get your real personal feed; a glance over your shoulder reads
"boring work tool."

## Why an extension (and not a website)

There is no legitimate way for a website to log into your Instagram and show
your home feed — Instagram offers no API for it, and any site collecting your
password would be a phishing/security risk. The safe approach is to restyle the
real Instagram in your own browser, where you're already signed in. This
extension **never sees your password and sends no data anywhere** — it only
restyles the page you're already viewing.

## What it does

- **Swaps the tab title & favicon** → the tab reads "Q2 Performance — ContentIQ"
  with a chart icon (the most important disguise: it's what people see in your
  tab bar).
- **Injects a corporate top bar** with a fake breadcrumb, live-sync pill, and clock.
- **Hides the Instagram logo** and tones down the brand-color gradients.
- **Optional "Mute photos"** → desaturates feed images so the wall of vivid
  pictures doesn't stand out; hover any image to see it in full color.
- **Boss key** → press `Ctrl + Shift + Space` anywhere to instantly cover the
  screen with a fake "generating report…" dashboard. `Esc` resumes.
- **Optional auto-hide** → covers the screen automatically whenever you switch
  tabs or windows.

All toggles live in the popup and apply instantly — no page reload needed.

## Install (Chrome / Edge / Brave)

1. Download/clone this folder (`extension/`) to your computer.
2. Go to `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select this `extension/` folder.
5. Open `instagram.com` — you're in "work mode." Click the extension icon to
   adjust settings.

> Tip: pin the extension and rename nothing — the popup already presents itself
> as "ContentIQ Performance Dashboard."

## Notes / limits

- Instagram's internal CSS class names change constantly, so the disguise sticks
  to stable, semantic selectors (aria-labels, hrefs). If Instagram ships a big
  redesign, a selector or two may need a refresh — the tab-title, favicon, top
  bar, and boss key are the robust core and will keep working.
- This is for your own account and your own browser. It doesn't automate,
  scrape, or store anything.
