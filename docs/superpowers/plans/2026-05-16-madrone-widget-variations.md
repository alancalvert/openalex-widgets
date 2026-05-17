# Madrone Widget Variations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `openalex-widgets.js` with Madrone-themed rendering branches for all three widget types (pub badge, list mini-badge, faculty author panel), plus a companion CSS file.

**Architecture:** Add Madrone variant detection inside each existing `init*` function; branch to new `renderMadrone*` functions that use the same safe `el()` DOM builder pattern already used throughout the codebase. CSS lives in a separate `openalex-widgets-madrone.css` file loaded by Drupal's library system. Browser-based test harness in `tests/test.html` exercises render functions via a mock `fetch`.

**Tech Stack:** Vanilla JS (ES5 IIFE), no build tools, no npm. Browser-based test harness using `window.fetch` mock. Bootstrap 5.2 + Open Sans already loaded by Madrone theme.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `openalex-widgets-madrone.css` | All Madrone CSS: tokens, OA badges, 3 pub badge variants, 3 author panel variants, list mini-badge, tooltips, responsive |
| Modify | `openalex-widgets.js` | Add `MADRONE_OA` config, helper functions, 7 `renderMadrone*` functions, branch logic in 3 `init*` functions, expose test hooks on `window.OAWidgets` |
| Create | `tests/test.html` | Browser test harness: mock fetch, assertions, tests for helpers and all render paths |
| Create | `drupal-snippets/4-madrone-snippets.html` | Copy-paste Drupal template examples for all Madrone variants |

---

## Task 1: CSS File — Tokens, OA Badges, Tooltips

**Files:**
- Create: `openalex-widgets-madrone.css`

- [ ] **Step 1: Create the file with design tokens, OA badge classes, citation badge, FWCI badge, tooltip system, and brand mark**

```css
/* openalex-widgets-madrone.css
   Load via Drupal library. Madrone theme provides Bootstrap 5.2 + Open Sans.
   All font sizes in rem (scales with browser font preference, WCAG 1.4.4).
*/

/* Design tokens scoped to widget containers */
.openalex-pub-badge,
.openalex-list-badge,
.openalex-author-panel {
  --osu-orange:    #d73f09;
  --osu-orange-dk: #b53507;
  --neutral-100:   #f7f5f5;
  --neutral-200:   #e9e5e4;
  --neutral-300:   #d4cfcd;
  --neutral-700:   #423e3c;
  --neutral-800:   #2e2b2a;
  --stratosphere:  #006a8e;
  --pine:          #4a773c;
  --label:         #595959;
  --shadow:        0 2px 3px hsl(0 0% 0% / 0.25);
}

/* OA status badges — Bootstrap badge pattern */
/* Used by: list mini-badge Madrone variant */
.oax-oa-badge {
  display: inline-block;
  padding: 0.25em 0.5em;
  font-size: 0.75em;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  vertical-align: middle;
  border-radius: 4px;
  font-family: 'Open Sans', sans-serif;
}
/* 11.9:1 contrast — black on Luminance gold */
.oax-oa-badge--gold   { background: #ffb500; color: #000; }
/* 5.3:1 — white on Pine Stand green */
.oax-oa-badge--green  { background: #4a773c; color: #fff; }
/* 7.0:1 — black on Solar Flare; white fails at 2.98:1 */
.oax-oa-badge--bronze { background: #d3832b; color: #000; }
/* 6.0:1 — white on Stratosphere */
.oax-oa-badge--hybrid { background: #006a8e; color: #fff; }
/* 10.3:1 — near-black on Neutral-200 with border */
.oax-oa-badge--closed  { background: #e9e5e4; color: #2e2b2a; border: 1px solid #d4cfcd; }
/* Treat diamond same as green */
.oax-oa-badge--diamond { background: #4a773c; color: #fff; }

/* Citation count badge */
.oax-cite-badge {
  display: inline-block;
  padding: 0.25em 0.5em;
  font-size: 0.75em;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  background: #f7f5f5;
  color: #000;
  border-radius: 4px;
  border: 1px solid #d4cfcd;
  font-family: 'Open Sans', sans-serif;
}

/* FWCI badge — Beaver Orange, 4.56:1 on white */
.oax-fwci-badge {
  display: inline-block;
  padding: 0.25em 0.5em;
  font-size: 0.75em;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  background: #d73f09;
  color: #fff;
  border-radius: 4px;
  font-family: 'Open Sans', sans-serif;
  cursor: help;
}

/* CSS-only tooltip — no JS required */
[data-oax-tooltip] { position: relative; }
[data-oax-tooltip]::after {
  content: attr(data-oax-tooltip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #2e2b2a;
  color: #fff;
  font-size: 0.75rem;
  line-height: 1.5;
  padding: 8px 12px;
  border-radius: 4px;
  width: 260px;
  white-space: normal;
  z-index: 200;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
  box-shadow: 0 3px 10px rgba(0,0,0,0.3);
  font-weight: 400;
  text-align: left;
  font-family: 'Open Sans', sans-serif;
}
[data-oax-tooltip]::before {
  content: '';
  position: absolute;
  bottom: calc(100% + 2px);
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #2e2b2a;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}
[data-oax-tooltip]:hover::after,
[data-oax-tooltip]:focus::after  { opacity: 1; }
[data-oax-tooltip]:hover::before,
[data-oax-tooltip]:focus::before { opacity: 1; }
[data-oax-tooltip]:focus-visible {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
  border-radius: 2px;
}

/* Brand mark */
.oax-brand {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #2e2b2a;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.oax-brand-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d73f09;
  flex-shrink: 0;
}

/* Focus rings */
.openalex-pub-badge a:focus-visible,
.openalex-pub-badge button:focus-visible,
.openalex-list-badge a:focus-visible,
.openalex-author-panel a:focus-visible,
.openalex-author-panel button:focus-visible {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
  border-radius: 2px;
}
```

- [ ] **Step 2: Commit**

```bash
git add openalex-widgets-madrone.css
git commit -m "feat: Madrone CSS — tokens, OA badges, tooltips, brand mark"
```

---

## Task 2: CSS — List Mini-Badge + Pub Badge Variants A, B, C

**Files:**
- Modify: `openalex-widgets-madrone.css`

- [ ] **Step 1: Append list mini-badge CSS and pub badge Card A CSS**

```css
/* LIST MINI-BADGE — openalex-list-badge--madrone */
.openalex-list-badge--madrone {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
  vertical-align: middle;
  flex-wrap: wrap;
}

/* PUB BADGE CARD A — openalex-pub-badge--madrone-card */
.oax-madrone-card {
  background: #fff;
  border: 1px solid #e9e5e4;
  border-radius: 4px;
  box-shadow: 0 2px 3px hsl(0 0% 0% / 0.25);
  font-family: 'Open Sans', sans-serif;
  width: 100%;
}
.oax-mc__stripe { height: 4px; background: #d73f09; border-radius: 4px 4px 0 0; }
.oax-mc__body { padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.oax-mc__header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.oax-mc__primary-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.oax-mc__primary { font-size: 1.75rem; font-weight: 700; color: #2e2b2a; line-height: 1; }
.oax-mc__primary-sub { font-size: 0.6875rem; color: #595959; margin-top: 2px; }
.oax-mc__metrics { display: flex; gap: 16px; align-items: flex-start; }
.oax-mc__metric { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.oax-mc__metric-val { font-size: 1.125rem; font-weight: 700; color: #2e2b2a; line-height: 1; }
.oax-mc__metric-lbl { font-size: 0.6875rem; color: #595959; text-transform: uppercase; letter-spacing: 0.04em; }
.oax-mc__divider { border: none; border-top: 1px solid #e9e5e4; }
.oax-mc__footer { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.oax-mc__oa {
  display: inline-flex; align-items: center; gap: 5px;
  background: #fef2ed; border: 1px solid #f0b99e;
  border-radius: 1.5rem; padding: 4px 10px 4px 7px;
  font-size: 0.6875rem; font-weight: 600; color: #b53507;
  align-self: flex-start; /* prevent stretch in flex-column body */
  cursor: help;
}
.oax-mc__oa-dot { width: 8px; height: 8px; border-radius: 50%; background: #d73f09; flex-shrink: 0; }
.oax-mc__tag {
  background: #f7f5f5; color: #423e3c;
  border-radius: 1.5rem; padding: 3px 10px;
  font-size: 0.6875rem; border: 1px solid #d4cfcd;
}
.oax-mc__link {
  font-size: 0.6875rem; color: #006a8e;
  text-decoration: underline; text-underline-offset: 2px;
  font-weight: 600; margin-left: auto; white-space: nowrap;
  min-height: 24px; display: inline-flex; align-items: center;
}
```

- [ ] **Step 2: Append Strip B and Bold C pub badge CSS**

```css
/* PUB BADGE STRIP B — openalex-pub-badge--madrone-strip */
.oax-madrone-strip {
  border-left: 4px solid #d73f09; padding: 10px 14px;
  background: #f7f5f5; display: flex; align-items: center;
  gap: 14px; flex-wrap: wrap; font-family: 'Open Sans', sans-serif; width: 100%;
}
.oax-ms__vdivider { width: 1px; height: 30px; background: #d4cfcd; flex-shrink: 0; }
.oax-ms__stat { text-align: center; }
.oax-ms__stat-val { font-size: 1rem; font-weight: 700; color: #2e2b2a; line-height: 1; }
.oax-ms__stat-lbl { font-size: 0.6875rem; color: #595959; text-transform: uppercase; letter-spacing: 0.04em; }
.oax-ms__oa-tag {
  font-size: 0.6875rem; font-weight: 600; color: #4a773c;
  background: #edf3e3; border-radius: 1.5rem; padding: 4px 11px;
  border: 1px solid #c5d9b5; white-space: nowrap; cursor: help;
}
.oax-ms__link {
  font-size: 0.6875rem; color: #006a8e; text-decoration: underline;
  text-underline-offset: 2px; margin-left: auto; white-space: nowrap;
  font-weight: 600; min-height: 24px; display: inline-flex; align-items: center;
}

/* PUB BADGE BOLD C — openalex-pub-badge--madrone-bold */
.oax-madrone-bold {
  font-family: 'Open Sans', sans-serif; border: 1px solid #e9e5e4;
  border-radius: 4px; box-shadow: 0 2px 3px hsl(0 0% 0% / 0.25); width: 100%;
}
.oax-mb__header {
  background: #d73f09; padding: 10px 14px;
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 8px; border-radius: 4px 4px 0 0;
}
.oax-mb__brand { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #fff; }
.oax-mb__header-right { text-align: right; }
.oax-mb__percentile { font-size: 1.375rem; font-weight: 700; color: #fff; line-height: 1; }
.oax-mb__percentile-sub { font-size: 0.6875rem; color: #fff; }
.oax-mb__body {
  padding: 10px 14px; background: #fff;
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  border-radius: 0 0 4px 4px;
}
.oax-mb__metrics { display: flex; gap: 16px; align-items: center; }
.oax-mb__metric { text-align: center; }
.oax-mb__metric-val { font-size: 1rem; font-weight: 700; color: #2e2b2a; line-height: 1; }
.oax-mb__metric-lbl { font-size: 0.6875rem; color: #595959; text-transform: uppercase; letter-spacing: 0.04em; }
.oax-mb__vdivider { width: 1px; height: 28px; background: #e9e5e4; flex-shrink: 0; }
.oax-mb__oa { display: flex; align-items: center; gap: 6px; }
.oax-mb__oa-dot { width: 9px; height: 9px; border-radius: 50%; background: #4a773c; flex-shrink: 0; }
.oax-mb__oa-label { font-size: 0.6875rem; color: #423e3c; }
.oax-mb__link {
  font-size: 0.6875rem; color: #d73f09; text-decoration: underline;
  text-underline-offset: 2px; font-weight: 600; margin-left: auto;
  white-space: nowrap; min-height: 24px; display: inline-flex; align-items: center;
}
```

- [ ] **Step 3: Append author panel CSS for all three variants**

```css
/* AUTHOR PANEL CARD A — openalex-author-panel--madrone-card */
.oax-ap-card {
  background: #fff; border: 1px solid #e9e5e4;
  border-radius: 4px; box-shadow: 0 2px 3px hsl(0 0% 0% / 0.25);
  font-family: 'Open Sans', sans-serif; width: 100%;
}
.oax-ap-card__stripe { height: 4px; background: #d73f09; border-radius: 4px 4px 0 0; }
.oax-ap-card__body { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.oax-ap-card__header { display: flex; align-items: center; justify-content: space-between; }
.oax-ap-card__name { font-size: 1.125rem; font-weight: 700; color: #2e2b2a; line-height: 1.2; }
.oax-ap-card__stats { display: flex; border: 1px solid #e9e5e4; border-radius: 4px; overflow: hidden; }
.oax-ap-card__stat { flex: 1; text-align: center; padding: 7px 4px; border-right: 1px solid #e9e5e4; }
.oax-ap-card__stat:last-child { border-right: none; }
.oax-ap-card__stat-val { font-size: 1.0625rem; font-weight: 700; color: #2e2b2a; line-height: 1; }
.oax-ap-card__stat-lbl { font-size: 0.625rem; color: #595959; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }
.oax-ap-card__works-heading { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #595959; margin-bottom: 5px; }
.oax-ap-card__works { display: flex; flex-direction: column; gap: 5px; }
.oax-ap-card__work { font-size: 0.75rem; line-height: 1.4; padding: 5px 8px; background: #f7f5f5; border-radius: 3px; border-left: 3px solid #d4cfcd; }
.oax-ap-card__work-meta { color: #595959; font-size: 0.6875rem; margin-top: 1px; }
.oax-ap-card__work a { color: #423e3c; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; }
.oax-ap-card__link { font-size: 0.6875rem; color: #006a8e; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; align-self: flex-start; min-height: 24px; display: inline-flex; align-items: center; }

/* AUTHOR PANEL STRIP B — openalex-author-panel--madrone-strip */
.oax-ap-strip { border-left: 4px solid #d73f09; background: #f7f5f5; font-family: 'Open Sans', sans-serif; width: 100%; }
.oax-ap-strip__top { padding: 10px 14px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.oax-ap-strip__vdivider { width: 1px; height: 34px; background: #d4cfcd; flex-shrink: 0; }
.oax-ap-strip__name { font-size: 0.875rem; font-weight: 700; color: #2e2b2a; }
.oax-ap-strip__stat { text-align: center; }
.oax-ap-strip__stat-val { font-size: 0.9375rem; font-weight: 700; color: #2e2b2a; line-height: 1; }
.oax-ap-strip__stat-lbl { font-size: 0.625rem; color: #595959; text-transform: uppercase; letter-spacing: 0.04em; }
.oax-ap-strip__works { border-top: 1px solid #e9e5e4; padding: 7px 14px; display: flex; flex-direction: column; gap: 3px; }
.oax-ap-strip__work { font-size: 0.75rem; line-height: 1.4; display: flex; gap: 8px; align-items: baseline; }
.oax-ap-strip__work-year { font-size: 0.6875rem; color: #595959; flex-shrink: 0; min-width: 32px; }
.oax-ap-strip__work-meta { font-size: 0.625rem; color: #595959; margin-top: 1px; }
.oax-ap-strip__work a { color: #423e3c; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; }
.oax-ap-strip__footer { border-top: 1px solid #e9e5e4; padding: 6px 14px; display: flex; gap: 12px; }
.oax-ap-strip__footer a { color: #006a8e; text-decoration: underline; text-underline-offset: 2px; font-size: 0.75rem; font-weight: 600; min-height: 24px; display: inline-flex; align-items: center; }

/* AUTHOR PANEL BOLD C — openalex-author-panel--madrone-bold */
.oax-ap-bold { font-family: 'Open Sans', sans-serif; border: 1px solid #e9e5e4; border-radius: 4px; box-shadow: 0 2px 3px hsl(0 0% 0% / 0.25); width: 100%; }
.oax-ap-bold__header { background: #d73f09; padding: 10px 14px; border-radius: 4px 4px 0 0; }
.oax-ap-bold__brand { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #fff; margin-bottom: 3px; }
.oax-ap-bold__name { font-size: 1.25rem; font-weight: 700; color: #fff; line-height: 1.2; }
.oax-ap-bold__body { padding: 12px 14px; background: #fff; border-radius: 0 0 4px 4px; display: flex; flex-direction: column; gap: 10px; }
.oax-ap-bold__stats { display: flex; gap: 18px; flex-wrap: wrap; }
.oax-ap-bold__stat { text-align: center; }
.oax-ap-bold__stat-val { font-size: 1.125rem; font-weight: 700; color: #2e2b2a; line-height: 1; }
.oax-ap-bold__stat-lbl { font-size: 0.625rem; color: #595959; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }
.oax-ap-bold__divider { border: none; border-top: 1px solid #e9e5e4; }
.oax-ap-bold__works-heading { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #595959; margin-bottom: 5px; }
.oax-ap-bold__works { display: flex; flex-direction: column; }
.oax-ap-bold__work { font-size: 0.75rem; line-height: 1.4; padding: 5px 0; border-bottom: 1px solid #e9e5e4; }
.oax-ap-bold__work:last-child { border-bottom: none; }
.oax-ap-bold__work-meta { color: #595959; font-size: 0.6875rem; margin-top: 1px; }
.oax-ap-bold__work a { color: #423e3c; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; }
.oax-ap-bold__link { font-size: 0.6875rem; color: #d73f09; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; align-self: flex-start; min-height: 24px; display: inline-flex; align-items: center; }

/* Responsive */
@media (max-width: 600px) {
  .oax-madrone-strip { flex-direction: column; align-items: flex-start; gap: 8px; }
  .oax-ms__vdivider { display: none; }
  .oax-ms__link { margin-left: 0; }
  .oax-mb__body { flex-direction: column; align-items: flex-start; }
  .oax-mb__vdivider { display: none; }
  .oax-mb__link { margin-left: 0; }
  .oax-ap-strip__top { flex-direction: column; align-items: flex-start; gap: 8px; }
  .oax-ap-strip__vdivider { display: none; }
  [data-oax-tooltip]::after { left: 0; transform: none; width: 220px; }
  [data-oax-tooltip]::before { left: 14px; transform: none; }
}
```

- [ ] **Step 4: Commit**

```bash
git add openalex-widgets-madrone.css
git commit -m "feat: complete Madrone CSS — all widget variants, responsive"
```

---

## Task 3: JS — Madrone Config and Helper Functions

**Files:**
- Modify: `openalex-widgets.js`

- [ ] **Step 1: Add `MADRONE_OA` config and helpers inside the IIFE, after the closing `};` of the `CONFIG` block (after line 38)**

```js
  // ─── Madrone OA status config ─────────────────────────────────────────────
  var MADRONE_OA = {
    gold:    { label: 'Gold OA',    cssKey: 'gold',
      tooltip: 'Gold OA: Published in a fully open-access journal. Free for anyone to read.' },
    green:   { label: 'Green OA',   cssKey: 'green',
      tooltip: 'Green OA: Free to read via a repository. The journal version may be paywalled.' },
    bronze:  { label: 'Bronze OA',  cssKey: 'bronze',
      tooltip: 'Bronze OA: Free to read on the publisher site without an open license. May be removed.' },
    hybrid:  { label: 'Hybrid OA',  cssKey: 'hybrid',
      tooltip: 'Hybrid OA: Subscription journal, freely readable because the author paid an APC.' },
    diamond: { label: 'Diamond OA', cssKey: 'diamond',
      tooltip: 'Diamond OA: Fully open-access journal with no author-facing fees.' },
    closed:  { label: 'Closed',     cssKey: 'closed',
      tooltip: 'Closed: No free version available. Access requires a subscription or purchase.' }
  };

  function oaMadrone(status) {
    return MADRONE_OA[status] || MADRONE_OA.closed;
  }

  // Returns true only when FWCI should appear in the list mini-badge.
  // Values at or below 1.0 (world average or below) add noise in scan lists.
  function shouldShowFwci(value) {
    return value !== null && value !== undefined && value > 1.0;
  }

  // Reconstructs plain-text abstract from OpenAlex abstract_inverted_index.
  // Format: { "word": [position, ...], ... }
  function reconstructAbstract(invertedIndex) {
    if (!invertedIndex || typeof invertedIndex !== 'object') return '';
    var words = [];
    Object.keys(invertedIndex).forEach(function (word) {
      var positions = invertedIndex[word];
      if (Array.isArray(positions)) {
        positions.forEach(function (pos) { words[pos] = word; });
      }
    });
    return words.filter(Boolean).join(' ');
  }
```

- [ ] **Step 2: Expose helpers for the test harness. Find the existing line:**

```js
  window.OAWidgets = { init: init };
```

Replace with:

```js
  window.OAWidgets = {
    init: init,
    _test: {
      shouldShowFwci: shouldShowFwci,
      reconstructAbstract: reconstructAbstract,
      oaMadrone: oaMadrone
    }
  };
```

- [ ] **Step 3: Commit**

```bash
git add openalex-widgets.js
git commit -m "feat: add Madrone OA config and helper functions"
```

---

## Task 4: Test Harness

**Files:**
- Create: `tests/test.html`

- [ ] **Step 1: Create `tests/` directory and test file**

```bash
mkdir -p tests
```

- [ ] **Step 2: Create `tests/test.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>OpenAlex Widget — Madrone Tests</title>
<link rel="stylesheet" href="../openalex-widgets-madrone.css">
<style>
  body { font-family: monospace; padding: 20px; max-width: 900px; }
  .pass { color: green; }
  .fail { color: red; font-weight: bold; }
  .suite { margin: 16px 0 8px; font-weight: bold; font-size: 1rem; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  .result { margin: 2px 0; font-size: 0.875rem; }
  #summary { margin-top: 24px; font-size: 1.125rem; font-weight: bold; }
</style>
</head>
<body>
<h1>OpenAlex Madrone Widget Tests</h1>
<div id="output"></div>
<div id="summary"></div>
<div id="mount" style="display:none"></div>

<script>
var passed = 0, failed = 0;
var out = document.getElementById('output');

function suite(name) {
  var h = document.createElement('div');
  h.className = 'suite';
  h.textContent = name;
  out.appendChild(h);
}

function assert(label, condition) {
  var d = document.createElement('div');
  d.className = 'result ' + (condition ? 'pass' : 'fail');
  d.textContent = (condition ? 'PASS ' : 'FAIL ') + label;
  out.appendChild(d);
  condition ? passed++ : failed++;
}

function assertEl(label, selector, root) {
  assert(label, !!(root || document).querySelector(selector));
}

/* Mock fetch — returns appropriate data based on URL */
var MOCK_WORK = {
  id: 'https://openalex.org/W123',
  doi: 'https://doi.org/10.1234/test',
  title: 'Air Pollution and Birth Weight',
  publication_year: 2021,
  cited_by_count: 774,
  fwci: 6.1,
  cited_by_percentile_year: { min: 90, max: 100 },
  open_access: { oa_status: 'gold', oa_url: 'https://example.com/pdf' },
  primary_location: { source: { display_name: 'Environmental Research' } },
  abstract_inverted_index: { 'Air': [0], 'pollution': [1], 'affects': [2], 'birth': [3], 'weight': [4] },
  keywords: [{ display_name: 'Air pollution' }, { display_name: 'Birth weight' }],
  funders: [],
  is_retracted: false
};

var MOCK_AUTHOR = {
  id: 'https://openalex.org/A123',
  display_name: 'Perry Hystad',
  works_count: 174,
  cited_by_count: 7674,
  summary_stats: { '2yr_mean_citedness': 3.22, h_index: 42 }
};

var MOCK_WORKS = [
  { title: 'Recent Work One',   doi: '10.1/w1', publication_year: 2024, primary_location: { source: { display_name: 'Nature' } } },
  { title: 'Recent Work Two',   doi: '10.1/w2', publication_year: 2023, primary_location: { source: { display_name: 'Science' } } },
  { title: 'Recent Work Three', doi: '10.1/w3', publication_year: 2022, primary_location: null }
];

window.fetch = function(url) {
  var data;
  if (url.indexOf('/authors') !== -1) {
    data = { results: [MOCK_AUTHOR] };
  } else if (url.indexOf('cited_by_count:desc') !== -1 || url.indexOf('publication_date:desc') !== -1) {
    data = { results: MOCK_WORKS };
  } else {
    data = MOCK_WORK;
  }
  return Promise.resolve({ ok: true, json: function() { return Promise.resolve(data); } });
};
</script>

<script src="../openalex-widgets.js"></script>

<script>
var T = window.OAWidgets._test;
var mount = document.getElementById('mount');

function clearMount() {
  while (mount.firstChild) { mount.removeChild(mount.firstChild); }
}

function fresh(classes, attrs) {
  clearMount();
  var d = document.createElement('div');
  d.className = classes;
  if (attrs) {
    Object.keys(attrs).forEach(function(k) { d.setAttribute(k, attrs[k]); });
  }
  mount.appendChild(d);
  return d;
}

/* Helper tests — synchronous */
suite('shouldShowFwci');
assert('null returns false',      T.shouldShowFwci(null) === false);
assert('undefined returns false', T.shouldShowFwci(undefined) === false);
assert('0 returns false',         T.shouldShowFwci(0) === false);
assert('1.0 returns false',       T.shouldShowFwci(1.0) === false);
assert('1.01 returns true',       T.shouldShowFwci(1.01) === true);
assert('6.1 returns true',        T.shouldShowFwci(6.1) === true);

suite('reconstructAbstract');
assert('null returns empty string',   T.reconstructAbstract(null) === '');
assert('empty object returns empty',  T.reconstructAbstract({}) === '');
assert('reconstructs correct order',  T.reconstructAbstract({ 'B': [1], 'A': [0] }) === 'A B');
assert('five-word example correct',
  T.reconstructAbstract({ 'Air': [0], 'pollution': [1], 'affects': [2], 'birth': [3], 'weight': [4] })
    === 'Air pollution affects birth weight');

suite('oaMadrone');
assert('gold label correct',      T.oaMadrone('gold').label === 'Gold OA');
assert('bronze cssKey correct',   T.oaMadrone('bronze').cssKey === 'bronze');
assert('unknown falls back to closed', T.oaMadrone('unknown').label === 'Closed');
assert('closed cssKey is closed', T.oaMadrone('closed').cssKey === 'closed');

/* Render tests — async (fetch is async even when mocked) */
function delay(ms) { return new Promise(function(resolve) { setTimeout(resolve, ms); }); }

async function runRenderTests() {
  suite('List mini-badge Madrone — gold OA, FWCI 6.1');
  var mb = fresh('openalex-list-badge openalex-list-badge--madrone', { 'data-doi': '10.1234/test' });
  window.OAWidgets.init();
  await delay(100);
  assertEl('OA badge rendered',       '.oax-oa-badge--gold',  mb);
  assertEl('citation badge rendered', '.oax-cite-badge',      mb);
  assertEl('FWCI badge rendered',     '.oax-fwci-badge',      mb);

  suite('Pub badge Card A — gold OA, Top 10%');
  var pb = fresh('openalex-pub-badge openalex-pub-badge--madrone-card', { 'data-doi': '10.1234/test' });
  window.OAWidgets.init();
  await delay(100);
  assertEl('orange stripe rendered',   '.oax-mc__stripe',  pb);
  assertEl('brand mark rendered',      '.oax-brand',       pb);
  assertEl('metrics group rendered',   '.oax-mc__metrics', pb);
  assertEl('OA pill rendered',         '.oax-mc__oa',      pb);
  assertEl('OpenAlex link present',    '.oax-mc__link',    pb);

  suite('Pub badge Strip B');
  var ps = fresh('openalex-pub-badge openalex-pub-badge--madrone-strip', { 'data-doi': '10.1234/test' });
  window.OAWidgets.init();
  await delay(100);
  assertEl('strip container rendered', '.oax-madrone-strip', ps);
  assertEl('OA tag rendered',          '.oax-ms__oa-tag',   ps);

  suite('Pub badge Bold C');
  var pbold = fresh('openalex-pub-badge openalex-pub-badge--madrone-bold', { 'data-doi': '10.1234/test' });
  window.OAWidgets.init();
  await delay(100);
  assertEl('bold container rendered',  '.oax-madrone-bold', pbold);
  assertEl('orange header rendered',   '.oax-mb__header',   pbold);

  suite('Author panel Card A — recent mode');
  var ap = fresh('openalex-author-panel openalex-author-panel--madrone-card',
    { 'data-orcid': '0000-0002-0299-2783', 'data-pub-mode': 'recent' });
  window.OAWidgets.init();
  await delay(200);
  assertEl('stripe rendered',      '.oax-ap-card__stripe', ap);
  assertEl('author name shown',    '.oax-ap-card__name',   ap);
  assertEl('stats grid rendered',  '.oax-ap-card__stats',  ap);
  assertEl('works list rendered',  '.oax-ap-card__works',  ap);

  suite('Author panel Strip B');
  var aps = fresh('openalex-author-panel openalex-author-panel--madrone-strip',
    { 'data-orcid': '0000-0002-0299-2783', 'data-pub-mode': 'recent' });
  window.OAWidgets.init();
  await delay(200);
  assertEl('strip container rendered', '.oax-ap-strip',     aps);
  assertEl('author name shown',        '.oax-ap-strip__name', aps);

  suite('Author panel Bold C');
  var apb = fresh('openalex-author-panel openalex-author-panel--madrone-bold',
    { 'data-orcid': '0000-0002-0299-2783', 'data-pub-mode': 'cited' });
  window.OAWidgets.init();
  await delay(200);
  assertEl('bold container rendered',  '.oax-ap-bold',        apb);
  assertEl('author name in header',    '.oax-ap-bold__name',  apb);
  assertEl('stats rendered',           '.oax-ap-bold__stats', apb);

  var s = document.getElementById('summary');
  var total = passed + failed;
  s.textContent = total + ' tests — ' + passed + ' passed, ' + failed + ' failed';
  s.style.color = failed === 0 ? 'green' : 'red';
}

runRenderTests();
</script>
</body>
</html>
```

- [ ] **Step 3: Open `tests/test.html` in browser. Confirm helper tests pass (green). Render tests will fail — the render functions are not yet written.**

- [ ] **Step 4: Commit**

```bash
git add tests/test.html
git commit -m "feat: add browser-based test harness for Madrone widgets"
```

---

## Task 5: JS — List Mini-Badge Madrone Renderer

**Files:**
- Modify: `openalex-widgets.js`

- [ ] **Step 1: Add `fwci` to the batch API select. Find `buildBatchUrl` (around line 373). Change:**

```js
    + '&select=doi,cited_by_count,open_access,cited_by_percentile_year,id'
```

To:

```js
    + '&select=doi,cited_by_count,open_access,cited_by_percentile_year,fwci,id'
```

- [ ] **Step 2: Add `renderMadroneListBadge` function. Insert after the closing `}` of `renderListBadge` (around line 682):**

```js
  function renderMadroneListBadge(container, work) {
    var oaStatus = (work.open_access && work.open_access.oa_status) || 'closed';
    var oa = oaMadrone(oaStatus);
    var citations = work.cited_by_count || 0;
    var fwci = work.fwci;

    container.setAttribute('aria-label',
      'OpenAlex: ' + oa.label + ', ' +
      formatNumber(citations) + (citations === 1 ? ' citation' : ' citations') +
      (shouldShowFwci(fwci) ? ', FWCI ' + fwci.toFixed(2) : ''));

    var wrap = el('span', { className: 'openalex-list-badge--madrone' });

    wrap.appendChild(el('span', {
      className: 'oax-oa-badge oax-oa-badge--' + oa.cssKey,
      tabindex: '0',
      'data-oax-tooltip': oa.tooltip,
      'aria-hidden': 'true',
      textContent: oa.label
    }));

    wrap.appendChild(el('span', {
      className: 'oax-cite-badge',
      'aria-hidden': 'true',
      textContent: formatNumber(citations) + (citations === 1 ? ' citation' : ' citations')
    }));

    if (shouldShowFwci(fwci)) {
      wrap.appendChild(el('span', {
        className: 'oax-fwci-badge',
        tabindex: '0',
        'data-oax-tooltip': 'Field-Weighted Citation Impact: ' + fwci.toFixed(2) +
          '. This paper is cited at ' + fwci.toFixed(1) + 'x the world average. 1.0 = world average.',
        'aria-hidden': 'true',
        textContent: 'FWCI ' + fwci.toFixed(2)
      }));
    }

    container.appendChild(wrap);
  }
```

- [ ] **Step 3: Branch on the Madrone class inside `renderListBadge`. Add at the top of the function body (before `var citations = ...`):**

```js
    if (container.classList.contains('openalex-list-badge--madrone')) {
      renderMadroneListBadge(container, work);
      return;
    }
```

- [ ] **Step 4: Refresh `tests/test.html`. Verify the "List mini-badge" suite shows all three assertions green.**

- [ ] **Step 5: Commit**

```bash
git add openalex-widgets.js
git commit -m "feat: add renderMadroneListBadge — OA badge, citations, FWCI suppression"
```

---

## Task 6: JS — Pub Badge Card A, Strip B, Bold C

**Files:**
- Modify: `openalex-widgets.js`

- [ ] **Step 1: Add `renderMadronePubCard` after `renderPubBadge` (around line 606)**

```js
  function renderMadronePubCard(container, data) {
    var oaStatus = (data.open_access && data.open_access.oa_status) || 'closed';
    var oa = oaMadrone(oaStatus);
    var citations = data.cited_by_count || 0;
    var fwci = data.fwci;
    var percentile = data.cited_by_percentile_year;
    var pubYear = data.publication_year || '';
    var openAlexUrl = data.id || 'https://openalex.org';
    var journal = data.primary_location &&
      data.primary_location.source &&
      data.primary_location.source.display_name;

    var card = el('div', {
      className: 'oax-madrone-card',
      role: 'region',
      'aria-label': 'OpenAlex metrics for this publication'
    });
    card.appendChild(el('div', { className: 'oax-mc__stripe', 'aria-hidden': 'true' }));

    var body = el('div', { className: 'oax-mc__body' });

    body.appendChild(el('div', { className: 'oax-mc__header' }, [
      el('span', { className: 'oax-brand', 'aria-hidden': 'true' }, [
        el('span', { className: 'oax-brand-dot' }),
        document.createTextNode('OpenAlex')
      ]),
      el('a', {
        href: openAlexUrl,
        className: 'oax-mc__link',
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': 'View publication on OpenAlex',
        textContent: 'View on OpenAlex'
      })
    ]));

    var primaryRow = el('div', { className: 'oax-mc__primary-row' });

    if (percentile && percentile.min >= 75) {
      var topPct = 100 - percentile.min;
      var pg = el('div', {});
      pg.appendChild(el('div', {
        className: 'oax-mc__primary',
        'aria-label': 'Top ' + topPct + ' percent of publications in ' + pubYear,
        textContent: 'Top ' + topPct + '%'
      }));
      pg.appendChild(el('div', {
        className: 'oax-mc__primary-sub',
        'aria-hidden': 'true',
        textContent: 'of publications in ' + pubYear
      }));
      primaryRow.appendChild(pg);
    }

    var metricsGroup = el('div', { className: 'oax-mc__metrics' });
    metricsGroup.appendChild(el('div', {
      className: 'oax-mc__metric',
      'aria-label': formatNumber(citations) + (citations === 1 ? ' citation' : ' citations')
    }, [
      el('div', { className: 'oax-mc__metric-val', 'aria-hidden': 'true',
        textContent: formatNumber(citations) }),
      el('div', { className: 'oax-mc__metric-lbl', 'aria-hidden': 'true',
        textContent: citations === 1 ? 'Citation' : 'Citations' })
    ]));

    if (fwci !== null && fwci !== undefined) {
      metricsGroup.appendChild(el('div', {
        className: 'oax-mc__metric',
        tabindex: '0',
        'data-oax-tooltip': 'Field-Weighted Citation Impact: ' + fwci.toFixed(2) +
          '. 1.0 = world average. Higher = cited more than expected.',
        'aria-label': 'FWCI ' + fwci.toFixed(2) + ' — 1.0 equals world average'
      }, [
        el('div', { className: 'oax-mc__metric-val', 'aria-hidden': 'true',
          textContent: fwci.toFixed(2) }),
        el('div', { className: 'oax-mc__metric-lbl', 'aria-hidden': 'true',
          textContent: 'FWCI' })
      ]));
    }

    primaryRow.appendChild(metricsGroup);
    body.appendChild(primaryRow);
    body.appendChild(el('hr', { className: 'oax-mc__divider', 'aria-hidden': 'true' }));

    var footer = el('div', { className: 'oax-mc__footer' });
    footer.appendChild(el('div', {
      className: 'oax-mc__oa',
      tabindex: '0',
      role: 'img',
      'aria-label': oa.label,
      'data-oax-tooltip': oa.tooltip
    }, [
      el('span', { className: 'oax-mc__oa-dot', 'aria-hidden': 'true' }),
      document.createTextNode(oa.label)
    ]));

    if (journal) {
      footer.appendChild(el('span', { className: 'oax-mc__tag', textContent: journal }));
    }

    body.appendChild(footer);
    card.appendChild(body);
    container.appendChild(card);
  }
```

- [ ] **Step 2: Add `renderMadronePubStrip` after `renderMadronePubCard`**

```js
  function renderMadronePubStrip(container, data) {
    var oaStatus = (data.open_access && data.open_access.oa_status) || 'closed';
    var oa = oaMadrone(oaStatus);
    var citations = data.cited_by_count || 0;
    var fwci = data.fwci;
    var percentile = data.cited_by_percentile_year;
    var pubYear = data.publication_year || '';
    var openAlexUrl = data.id || 'https://openalex.org';

    var strip = el('div', {
      className: 'oax-madrone-strip',
      role: 'region',
      'aria-label': 'OpenAlex metrics for this publication'
    });

    strip.appendChild(el('span', { className: 'oax-brand', 'aria-hidden': 'true' }, [
      el('span', { className: 'oax-brand-dot' }),
      document.createTextNode('OpenAlex')
    ]));
    strip.appendChild(el('div', { className: 'oax-ms__vdivider', 'aria-hidden': 'true' }));

    if (percentile && percentile.min >= 75) {
      var topPct = 100 - percentile.min;
      strip.appendChild(el('div', {
        className: 'oax-ms__stat',
        'aria-label': 'Top ' + topPct + ' percent in ' + pubYear
      }, [
        el('div', { className: 'oax-ms__stat-val', 'aria-hidden': 'true',
          textContent: 'Top ' + topPct + '%' }),
        el('div', { className: 'oax-ms__stat-lbl', 'aria-hidden': 'true',
          textContent: 'in ' + pubYear })
      ]));
    }

    strip.appendChild(el('div', {
      className: 'oax-ms__stat',
      'aria-label': formatNumber(citations) + (citations === 1 ? ' citation' : ' citations')
    }, [
      el('div', { className: 'oax-ms__stat-val', 'aria-hidden': 'true',
        textContent: formatNumber(citations) }),
      el('div', { className: 'oax-ms__stat-lbl', 'aria-hidden': 'true',
        textContent: citations === 1 ? 'Citation' : 'Citations' })
    ]));

    if (fwci !== null && fwci !== undefined) {
      strip.appendChild(el('div', {
        className: 'oax-ms__stat',
        tabindex: '0',
        'data-oax-tooltip': 'FWCI: ' + fwci.toFixed(2) + '. 1.0 = world average.',
        'aria-label': 'FWCI ' + fwci.toFixed(2)
      }, [
        el('div', { className: 'oax-ms__stat-val', 'aria-hidden': 'true',
          textContent: fwci.toFixed(2) }),
        el('div', { className: 'oax-ms__stat-lbl', 'aria-hidden': 'true',
          textContent: 'FWCI' })
      ]));
    }

    strip.appendChild(el('span', {
      className: 'oax-ms__oa-tag',
      tabindex: '0',
      role: 'img',
      'aria-label': oa.label,
      'data-oax-tooltip': oa.tooltip,
      textContent: oa.label
    }));

    strip.appendChild(el('a', {
      href: openAlexUrl,
      className: 'oax-ms__link',
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': 'View on OpenAlex',
      textContent: 'OpenAlex'
    }));

    container.appendChild(strip);
  }
```

- [ ] **Step 3: Add `renderMadronePubBold` after `renderMadronePubStrip`**

```js
  function renderMadronePubBold(container, data) {
    var oaStatus = (data.open_access && data.open_access.oa_status) || 'closed';
    var oa = oaMadrone(oaStatus);
    var citations = data.cited_by_count || 0;
    var fwci = data.fwci;
    var percentile = data.cited_by_percentile_year;
    var pubYear = data.publication_year || '';
    var openAlexUrl = data.id || 'https://openalex.org';

    var bold = el('div', {
      className: 'oax-madrone-bold',
      role: 'region',
      'aria-label': 'OpenAlex metrics for this publication'
    });

    var header = el('div', { className: 'oax-mb__header' });
    header.appendChild(el('span', {
      className: 'oax-mb__brand',
      'aria-hidden': 'true',
      textContent: 'OpenAlex'
    }));

    if (percentile && percentile.min >= 75) {
      var topPct = 100 - percentile.min;
      var hr = el('div', { className: 'oax-mb__header-right' });
      hr.appendChild(el('div', {
        className: 'oax-mb__percentile',
        'aria-label': 'Top ' + topPct + ' percent',
        textContent: 'Top ' + topPct + '%'
      }));
      hr.appendChild(el('div', {
        className: 'oax-mb__percentile-sub',
        'aria-hidden': 'true',
        textContent: 'of publications in ' + pubYear
      }));
      header.appendChild(hr);
    }
    bold.appendChild(header);

    var body = el('div', { className: 'oax-mb__body' });
    var metrics = el('div', { className: 'oax-mb__metrics' });

    metrics.appendChild(el('div', {
      className: 'oax-mb__metric',
      'aria-label': formatNumber(citations) + (citations === 1 ? ' citation' : ' citations')
    }, [
      el('div', { className: 'oax-mb__metric-val', 'aria-hidden': 'true',
        textContent: formatNumber(citations) }),
      el('div', { className: 'oax-mb__metric-lbl', 'aria-hidden': 'true',
        textContent: citations === 1 ? 'Citation' : 'Citations' })
    ]));

    if (fwci !== null && fwci !== undefined) {
      metrics.appendChild(el('div', { className: 'oax-mb__vdivider', 'aria-hidden': 'true' }));
      metrics.appendChild(el('div', {
        className: 'oax-mb__metric',
        tabindex: '0',
        'data-oax-tooltip': 'FWCI: ' + fwci.toFixed(2) + '. 1.0 = world average.',
        'aria-label': 'FWCI ' + fwci.toFixed(2)
      }, [
        el('div', { className: 'oax-mb__metric-val', 'aria-hidden': 'true',
          textContent: fwci.toFixed(2) }),
        el('div', { className: 'oax-mb__metric-lbl', 'aria-hidden': 'true',
          textContent: 'FWCI' })
      ]));
    }

    body.appendChild(metrics);
    body.appendChild(el('div', { className: 'oax-mb__vdivider', 'aria-hidden': 'true' }));
    body.appendChild(el('div', { className: 'oax-mb__oa', 'aria-label': oa.label }, [
      el('span', { className: 'oax-mb__oa-dot', 'aria-hidden': 'true' }),
      el('span', { className: 'oax-mb__oa-label', 'aria-hidden': 'true', textContent: oa.label })
    ]));
    body.appendChild(el('a', {
      href: openAlexUrl,
      className: 'oax-mb__link',
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': 'View on OpenAlex',
      textContent: 'OpenAlex'
    }));

    bold.appendChild(body);
    container.appendChild(bold);
  }
```

- [ ] **Step 4: Update `initPubBadge` to branch on Madrone classes. Find `.then(function (data) {` inside `initPubBadge` and replace its body:**

```js
      .then(function (data) {
        clearContainer(container);
        if (container.classList.contains('openalex-pub-badge--madrone-card')) {
          renderMadronePubCard(container, data);
        } else if (container.classList.contains('openalex-pub-badge--madrone-strip')) {
          renderMadronePubStrip(container, data);
        } else if (container.classList.contains('openalex-pub-badge--madrone-bold')) {
          renderMadronePubBold(container, data);
        } else {
          renderPubBadge(container, data);
        }
      })
```

- [ ] **Step 5: Refresh `tests/test.html`. Verify pub badge suites (Card A, Strip B, Bold C) all show green.**

- [ ] **Step 6: Commit**

```bash
git add openalex-widgets.js
git commit -m "feat: add all pub badge Madrone render functions and branching"
```

---

## Task 7: JS — Faculty Author Panel Render Functions

**Files:**
- Modify: `openalex-widgets.js`

- [ ] **Step 1: Add `initMadroneAuthorPanel` before `initAuthorPanel`. Insert after `renderAuthorPanel`:**

```js
  function initMadroneAuthorPanel(container, orcid) {
    var pubMode = (container.getAttribute('data-pub-mode') || 'recent').toLowerCase();

    var fetches = [
      fetchJSON(buildUrl('/authors', {
        filter: 'orcid:' + orcid,
        select: 'id,display_name,works_count,cited_by_count,summary_stats,last_known_institutions'
      }))
    ];

    if (pubMode === 'recent') {
      fetches.push(fetchJSON(buildUrl('/works', {
        filter: 'author.orcid:' + orcid,
        sort: 'publication_date:desc',
        'per-page': '3',
        select: 'title,doi,publication_year,primary_location'
      })));
    } else if (pubMode === 'cited') {
      fetches.push(fetchJSON(buildUrl('/works', {
        filter: 'author.orcid:' + orcid,
        sort: 'cited_by_count:desc',
        'per-page': '3',
        select: 'title,doi,publication_year,cited_by_count,primary_location'
      })));
    }

    Promise.all(fetches).then(function (results) {
      var authorData = results[0].results && results[0].results[0];
      if (!authorData) { hideElement(container); return; }

      var works = (results[1] && results[1].results) || [];
      var stats = authorData.summary_stats || {};
      var hIndex = stats.h_index || 0;
      var fwci = stats['2yr_mean_citedness'] != null ? stats['2yr_mean_citedness'] : null;

      clearContainer(container);

      if (container.classList.contains('openalex-author-panel--madrone-card')) {
        renderMadroneAuthorCard(container, authorData, works, hIndex, fwci, pubMode);
      } else if (container.classList.contains('openalex-author-panel--madrone-strip')) {
        renderMadroneAuthorStrip(container, authorData, works, hIndex, fwci, pubMode);
      } else {
        renderMadroneAuthorBold(container, authorData, works, hIndex, fwci, pubMode);
      }
    }).catch(function (err) {
      log('Madrone author panel failed for ORCID ' + orcid + ': ' + err);
      hideElement(container);
    });
  }
```

- [ ] **Step 2: Add `buildMadroneWorkItem` shared helper after `initMadroneAuthorPanel`:**

```js
  function buildMadroneWorkItem(work, outerClass, linkClass, metaClass, pubMode) {
    var workUrl = work.doi
      ? 'https://doi.org/' + normalizeDoi(work.doi)
      : (work.id || 'https://openalex.org');
    var journal = work.primary_location &&
      work.primary_location.source &&
      work.primary_location.source.display_name;
    var year = work.publication_year ? String(work.publication_year) : '';
    var isStrip = outerClass.indexOf('strip') !== -1;

    var metaParts = [];
    if (pubMode === 'cited' && work.cited_by_count != null) {
      metaParts.push(formatNumber(work.cited_by_count) +
        (work.cited_by_count === 1 ? ' citation' : ' citations'));
    }
    if (journal) metaParts.push(journal);

    var wrap = el('div', { className: outerClass, role: 'listitem' });
    var linkEl = el('a', {
      href: workUrl,
      className: linkClass,
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': (work.title || 'Untitled') + ' (opens in new tab)',
      textContent: work.title || 'Untitled'
    });

    if (isStrip) {
      wrap.appendChild(el('span', {
        className: 'oax-ap-strip__work-year',
        'aria-hidden': 'true',
        textContent: year
      }));
      var inner = el('div', {});
      inner.appendChild(linkEl);
      if (metaParts.length) {
        inner.appendChild(el('div', {
          className: metaClass, 'aria-hidden': 'true',
          textContent: metaParts.join(' · ')
        }));
      }
      wrap.appendChild(inner);
    } else {
      wrap.appendChild(linkEl);
      var metaLine = year ? [year].concat(metaParts) : metaParts;
      if (metaLine.length) {
        wrap.appendChild(el('div', {
          className: metaClass, 'aria-hidden': 'true',
          textContent: metaLine.join(' · ')
        }));
      }
    }
    return wrap;
  }
```

- [ ] **Step 3: Add `renderMadroneAuthorCard` after `buildMadroneWorkItem`:**

```js
  function renderMadroneAuthorCard(container, author, works, hIndex, fwci, pubMode) {
    var authorUrl = author.id || 'https://openalex.org';
    var heading = pubMode === 'cited' ? 'Most Cited Publications' : 'Recent Publications';

    var card = el('div', {
      className: 'oax-ap-card',
      role: 'region',
      'aria-label': 'OpenAlex research profile'
    });
    card.appendChild(el('div', { className: 'oax-ap-card__stripe', 'aria-hidden': 'true' }));

    var body = el('div', { className: 'oax-ap-card__body' });
    body.appendChild(el('div', { className: 'oax-ap-card__header' }, [
      el('span', { className: 'oax-brand', 'aria-hidden': 'true' }, [
        el('span', { className: 'oax-brand-dot' }),
        document.createTextNode('OpenAlex')
      ])
    ]));
    body.appendChild(el('div', {
      className: 'oax-ap-card__name',
      textContent: author.display_name || ''
    }));

    var grid = el('div', { className: 'oax-ap-card__stats' });
    [
      { val: formatNumber(author.works_count || 0), lbl: 'Works',
        aria: formatNumber(author.works_count || 0) + ' publications', tip: null },
      { val: formatNumber(author.cited_by_count || 0), lbl: 'Citations',
        aria: formatNumber(author.cited_by_count || 0) + ' total citations', tip: null },
      { val: String(hIndex), lbl: 'h-index', aria: 'h-index ' + hIndex,
        tip: 'h-index from OpenAlex. May differ from Scopus or Web of Science.' },
      { val: fwci !== null ? fwci.toFixed(2) : '—', lbl: 'FWCI',
        aria: 'FWCI ' + (fwci !== null ? fwci.toFixed(2) : 'not available'),
        tip: 'Field-Weighted Citation Impact: 2-year citation rate vs. world average. 1.0 = average.' }
    ].forEach(function (s) {
      var attrs = { className: 'oax-ap-card__stat', 'aria-label': s.aria };
      if (s.tip) { attrs.tabindex = '0'; attrs['data-oax-tooltip'] = s.tip; }
      grid.appendChild(el('div', attrs, [
        el('div', { className: 'oax-ap-card__stat-val', 'aria-hidden': 'true', textContent: s.val }),
        el('div', { className: 'oax-ap-card__stat-lbl', 'aria-hidden': 'true', textContent: s.lbl })
      ]));
    });
    body.appendChild(grid);

    if (works.length > 0 && pubMode !== 'none') {
      body.appendChild(el('div', { className: 'oax-ap-card__works-heading',
        'aria-hidden': 'true', textContent: heading }));
      var list = el('div', { className: 'oax-ap-card__works', role: 'list',
        'aria-label': heading });
      works.forEach(function (w) {
        list.appendChild(buildMadroneWorkItem(w,
          'oax-ap-card__work', '', 'oax-ap-card__work-meta', pubMode));
      });
      body.appendChild(list);
    }

    body.appendChild(el('a', {
      href: authorUrl, className: 'oax-ap-card__link',
      target: '_blank', rel: 'noopener noreferrer',
      'aria-label': 'View full profile on OpenAlex', textContent: 'View on OpenAlex'
    }));

    card.appendChild(body);
    container.appendChild(card);
  }
```

- [ ] **Step 4: Add `renderMadroneAuthorStrip` after `renderMadroneAuthorCard`:**

```js
  function renderMadroneAuthorStrip(container, author, works, hIndex, fwci, pubMode) {
    var authorUrl = author.id || 'https://openalex.org';
    var heading = pubMode === 'cited' ? 'Most Cited' : 'Recent';

    var strip = el('div', { className: 'oax-ap-strip', role: 'region',
      'aria-label': 'OpenAlex research profile' });

    var top = el('div', { className: 'oax-ap-strip__top' });
    top.appendChild(el('span', { className: 'oax-brand', 'aria-hidden': 'true' }, [
      el('span', { className: 'oax-brand-dot' }),
      document.createTextNode('OpenAlex')
    ]));
    top.appendChild(el('div', { className: 'oax-ap-strip__vdivider', 'aria-hidden': 'true' }));
    top.appendChild(el('span', { className: 'oax-ap-strip__name',
      textContent: author.display_name || '' }));

    [
      { val: formatNumber(author.works_count || 0), lbl: 'Works', tip: null },
      { val: formatNumber(author.cited_by_count || 0), lbl: 'Citations', tip: null },
      { val: String(hIndex), lbl: 'h-index',
        tip: 'h-index from OpenAlex. May differ from Scopus or WoS.' },
      { val: fwci !== null ? fwci.toFixed(2) : '—', lbl: 'FWCI',
        tip: 'FWCI: 2-year citation rate vs. world average. 1.0 = average.' }
    ].forEach(function (s) {
      top.appendChild(el('div', { className: 'oax-ap-strip__vdivider', 'aria-hidden': 'true' }));
      var attrs = { className: 'oax-ap-strip__stat' };
      if (s.tip) { attrs.tabindex = '0'; attrs['data-oax-tooltip'] = s.tip; }
      top.appendChild(el('div', attrs, [
        el('div', { className: 'oax-ap-strip__stat-val', 'aria-hidden': 'true', textContent: s.val }),
        el('div', { className: 'oax-ap-strip__stat-lbl', 'aria-hidden': 'true', textContent: s.lbl })
      ]));
    });
    strip.appendChild(top);

    if (works.length > 0 && pubMode !== 'none') {
      var list = el('div', { className: 'oax-ap-strip__works', role: 'list',
        'aria-label': heading + ' publications' });
      works.forEach(function (w) {
        list.appendChild(buildMadroneWorkItem(w,
          'oax-ap-strip__work', '', 'oax-ap-strip__work-meta', pubMode));
      });
      strip.appendChild(list);
    }

    var footer = el('div', { className: 'oax-ap-strip__footer' });
    footer.appendChild(el('a', {
      href: authorUrl, target: '_blank', rel: 'noopener noreferrer',
      'aria-label': 'View full profile on OpenAlex', textContent: 'View on OpenAlex'
    }));
    strip.appendChild(footer);
    container.appendChild(strip);
  }
```

- [ ] **Step 5: Add `renderMadroneAuthorBold` after `renderMadroneAuthorStrip`:**

```js
  function renderMadroneAuthorBold(container, author, works, hIndex, fwci, pubMode) {
    var authorUrl = author.id || 'https://openalex.org';
    var heading = pubMode === 'cited' ? 'Most Cited Publications' : 'Recent Publications';

    var bold = el('div', { className: 'oax-ap-bold', role: 'region',
      'aria-label': 'OpenAlex research profile' });

    var header = el('div', { className: 'oax-ap-bold__header' });
    header.appendChild(el('div', { className: 'oax-ap-bold__brand',
      'aria-hidden': 'true', textContent: 'OpenAlex' }));
    header.appendChild(el('div', { className: 'oax-ap-bold__name',
      textContent: author.display_name || '' }));
    bold.appendChild(header);

    var body = el('div', { className: 'oax-ap-bold__body' });
    var stats = el('div', { className: 'oax-ap-bold__stats' });
    [
      { val: formatNumber(author.works_count || 0), lbl: 'Works', tip: null },
      { val: formatNumber(author.cited_by_count || 0), lbl: 'Citations', tip: null },
      { val: String(hIndex), lbl: 'h-index',
        tip: 'h-index from OpenAlex. May differ from Scopus or Web of Science.' },
      { val: fwci !== null ? fwci.toFixed(2) : '—', lbl: 'FWCI',
        tip: 'FWCI: 2-year citation rate vs. world average. 1.0 = average.' }
    ].forEach(function (s) {
      var attrs = { className: 'oax-ap-bold__stat' };
      if (s.tip) { attrs.tabindex = '0'; attrs['data-oax-tooltip'] = s.tip; }
      stats.appendChild(el('div', attrs, [
        el('div', { className: 'oax-ap-bold__stat-val', 'aria-hidden': 'true', textContent: s.val }),
        el('div', { className: 'oax-ap-bold__stat-lbl', 'aria-hidden': 'true', textContent: s.lbl })
      ]));
    });
    body.appendChild(stats);

    if (works.length > 0 && pubMode !== 'none') {
      body.appendChild(el('hr', { className: 'oax-ap-bold__divider', 'aria-hidden': 'true' }));
      body.appendChild(el('div', { className: 'oax-ap-bold__works-heading',
        'aria-hidden': 'true', textContent: heading }));
      var list = el('div', { className: 'oax-ap-bold__works', role: 'list',
        'aria-label': heading });
      works.forEach(function (w) {
        list.appendChild(buildMadroneWorkItem(w,
          'oax-ap-bold__work', '', 'oax-ap-bold__work-meta', pubMode));
      });
      body.appendChild(list);
    }

    body.appendChild(el('a', {
      href: authorUrl, className: 'oax-ap-bold__link',
      target: '_blank', rel: 'noopener noreferrer',
      'aria-label': 'View full profile on OpenAlex', textContent: 'View on OpenAlex'
    }));

    bold.appendChild(body);
    container.appendChild(bold);
  }
```

- [ ] **Step 6: Update `initAuthorPanel` to branch on Madrone classes. Find the orcid guard inside `initAuthorPanel`:**

```js
    var orcid = (container.getAttribute('data-orcid') || '').trim();
    if (!orcid) { hideElement(container); return; }

    renderSkeleton(container);

    Promise.all([
```

Replace with:

```js
    var orcid = (container.getAttribute('data-orcid') || '').trim();
    if (!orcid) { hideElement(container); return; }

    renderSkeleton(container);

    if (container.classList.contains('openalex-author-panel--madrone-card') ||
        container.classList.contains('openalex-author-panel--madrone-strip') ||
        container.classList.contains('openalex-author-panel--madrone-bold')) {
      initMadroneAuthorPanel(container, orcid);
      return;
    }

    Promise.all([
```

- [ ] **Step 7: Refresh `tests/test.html`. All three author panel suites should show green.**

- [ ] **Step 8: Commit**

```bash
git add openalex-widgets.js
git commit -m "feat: add faculty author panel Madrone render functions and branching"
```

---

## Task 8: Drupal Snippets

**Files:**
- Create: `drupal-snippets/4-madrone-snippets.html`

- [ ] **Step 1: Create the file**

```html
<!--
  Madrone Widget Variants — Drupal Template Snippets
  ===================================================
  Paste these into Drupal node templates or Views "Rewrite results" fields.
  Adjust field tokens to match your actual View field machine names.

  Prerequisites:
    1. openalex-widgets.js loaded (JS Injector or Drupal library)
    2. openalex-widgets-madrone.css loaded via Drupal theme library

  Example library definition (your_theme.libraries.yml):

    openalex_madrone:
      css:
        component:
          /themes/custom/your_theme/css/openalex-widgets-madrone.css: {}
      js:
        /themes/custom/your_theme/js/openalex-widgets.js: {}
      dependencies:
        - core/drupal

  Attach in a template:
    {{ attach_library('your_theme/openalex_madrone') }}
-->

<!-- WIDGET 1: Publication Badge -->

<!-- Card A — full sidebar on publication detail pages -->
<div class="openalex-pub-badge openalex-pub-badge--madrone-card"
     data-doi="{{ field__pub_widget_doi }}"></div>

<!-- Strip B — compact, for module blocks -->
<div class="openalex-pub-badge openalex-pub-badge--madrone-strip"
     data-doi="{{ field__pub_widget_doi }}"></div>

<!-- Bold C — feature or highlight placement -->
<div class="openalex-pub-badge openalex-pub-badge--madrone-bold"
     data-doi="{{ field__pub_widget_doi }}"></div>


<!-- WIDGET 2: Faculty Author Panel -->

<!-- Card A, 3 most recent publications (default) -->
<div class="openalex-author-panel openalex-author-panel--madrone-card"
     data-orcid="{{ node.field_orcid.value }}"
     data-pub-mode="recent"></div>

<!-- Card A, 3 most-cited publications -->
<div class="openalex-author-panel openalex-author-panel--madrone-card"
     data-orcid="{{ node.field_orcid.value }}"
     data-pub-mode="cited"></div>

<!-- Card A, stats only — no publication list -->
<div class="openalex-author-panel openalex-author-panel--madrone-card"
     data-orcid="{{ node.field_orcid.value }}"
     data-pub-mode="none"></div>

<!-- Strip B — compact horizontal, directory listing rows -->
<div class="openalex-author-panel openalex-author-panel--madrone-strip"
     data-orcid="{{ node.field_orcid.value }}"
     data-pub-mode="recent"></div>

<!-- Bold C — landing page feature -->
<div class="openalex-author-panel openalex-author-panel--madrone-bold"
     data-orcid="{{ node.field_orcid.value }}"
     data-pub-mode="recent"></div>


<!-- WIDGET 3: List Mini-Badge -->

<!-- Place span immediately after the publication title text or link -->
<span class="openalex-list-badge openalex-list-badge--madrone"
      data-doi="{{ field__pub_widget_doi }}"></span>
```

- [ ] **Step 2: Commit**

```bash
git add drupal-snippets/4-madrone-snippets.html
git commit -m "docs: Drupal template snippets for all Madrone widget variants"
```

---

## Self-Review — Spec Coverage

| Spec requirement | Task |
|---|---|
| Widget 1 — Card A, Strip B, Bold C | Task 6 |
| Widget 2 — Card A, Strip B, Bold C | Task 7 |
| Widget 2 — `data-pub-mode` (recent/cited/none) | Task 7 |
| Widget 3 — `--madrone` list mini-badge | Task 5 |
| OA badge system — 5 types, correct CSS colors | Tasks 1, 2 |
| Bronze uses black text (7.0:1 vs 2.98:1 for white) | Task 1 CSS comment |
| FWCI suppressed at or below 1.0 in mini-badge | Tasks 3, 5 |
| FWCI always shown in faculty panel | Task 7 |
| rem font sizes throughout | All CSS tasks |
| CSS-only tooltips, tabindex on non-interactive elements | Tasks 1, 6, 7 |
| No external-link arrows in widget markup | All render functions (link text is plain text only) |
| Separate CSS file | Tasks 1, 2 |
| Existing render paths untouched | Tasks 6, 7 (branch bypasses originals) |
| Drupal template snippets | Task 8 |
| Test coverage for helpers and all render paths | Tasks 3, 4 |

All requirements covered. No placeholders. Class names and function signatures are consistent across all tasks.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-16-madrone-widget-variations.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, checkpoints for review

**Which approach?**
