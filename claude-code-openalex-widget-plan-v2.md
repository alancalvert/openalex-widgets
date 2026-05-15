# Claude Code Build Plan: OpenAlex Widget Suite for OSU College of Health
**Version 2 — Updated with live API response, actual JS injector patterns, WCAG 2.2 AA**

---

## Project Summary

Build a self-contained vanilla JavaScript widget suite that pulls publication and author metrics from the [OpenAlex API](https://developers.openalex.org/) and renders them on OSU College of Health Drupal 10 pages. The widgets follow the identical initialization pattern already used by Dimensions, Altmetric, and PlumX on these pages: a script is loaded via JS Injector, it scans the DOM for elements with a specific class and `data-doi` attribute, calls the API, and renders output inside those elements. No Drupal module installation required.

**No build tools. No bundler. No npm. No framework.** Single `.js` file delivered via jsDelivr CDN.

---

## How the Existing Widgets Work (Match This Pattern Exactly)

All three existing widget scripts use the same approach. Study these before writing a line of code.

### Altmetric (simplest — just a script loader):
```javascript
!function(e,t){
  // removes old script if present, creates new <script> tag, appends to head
  var m = document.createElement("script");
  m.setAttribute("src", t);
  document.getElementsByTagName("head")[0].appendChild(m);
}("altmetric-embed-js","https://d1bxh8uas1mnw7.cloudfront.net/assets/altmetric_badges-[hash].js");
```
The loaded script then finds `.altmetric-embed[data-doi]` elements and renders into them.

### Dimensions (self-contained bundle):
The minified Dimensions bundle:
1. Fetches `https://badge.dimensions.ai/config.json` for endpoint config
2. Injects a `<link rel="stylesheet">` tag into `<head>` for its CSS
3. Finds all `.__dimensions_badge_embed__` elements
4. Reads `data-doi`, `data-style`, `data-hide-zero-citations` attributes
5. Calls its metrics API, renders SVG badge inside the element
6. Uses `data-dimensions-badge-installed` attribute to prevent double-init

### PlumX (CSS + script loader):
```javascript
// Injects CSS:
var n = document.createElement("link");
n.setAttribute("href", "//cdn.plu.mx/details.css");
document.head.appendChild(n);
// Then finds .plumx-details[href] elements and renders
```

### OpenAlex widget must follow this same pattern:
1. When loaded, inject CSS into `<head>` (check for `[data-oax-styles]` to prevent double-inject)
2. On `DOMContentLoaded` (or immediately if already loaded), find all trigger elements
3. Read `data-doi` or `data-orcid` from each element
4. Call OpenAlex API
5. Render output inside the element using DOM methods (never `innerHTML` with untrusted data)
6. Mark element with `data-oax-installed` to prevent double-init

---

## Constraints and Environment

- **CMS:** Drupal 10, JS Injector module. No theme file access. No custom module installation.
- **JS loading:** External URL via jsDelivr/GitHub raw. Scoped by path pattern (e.g., `/research/publications/*`).
- **Existing snippet pattern:** The View "Rewrite results" field outputs HTML with `data-doi="{{ field__pub_widget_doi }}"`. The OpenAlex widget div slots into this same HTML block.
- **CSS delivery:** Inject a `<style>` tag into `<head>` at runtime (same approach as Dimensions). No separate CSS file needed in JS Injector.
- **WCAG compliance:** WCAG **2.2** AA (not 2.1). This adds specific new requirements detailed below.
- **CSP:** Assume strict Content Security Policy. Use `fetch()` only. No `eval()`, no `document.write()`.
- **Data safety:** All API response values (titles, names, topics) must be set via `textContent` or explicit DOM property assignment — never concatenated into `innerHTML`.

---

## Deliverables

```
openalex-widgets/
├── README.md
├── openalex-widgets.js          # Unminified source
├── openalex-widgets.min.js      # Production (minify with terser or similar)
└── drupal-snippets/
    ├── 1-publication-page.html      # Paste into View "Rewrite results"
    ├── 2-publication-list.html      # Paste into list View "Rewrite results"
    ├── 3-faculty-profile.html       # Add to faculty display after ORCID field added
    └── js-injector-setup.md         # Exact steps for JS Injector configuration
```

---

## Real API Response — Use This As Ground Truth

The following is the actual OpenAlex response for DOI `10.1093/aje/kwae120`. Build all field references against this structure. Do not guess field names.

### Fields to use in Widget 1 (Publication Badge):

```javascript
// From the root of the response object:
data.cited_by_count                          // → 1  (raw citation count)
data.fwci                                    // → 0.3047  (Field-Weighted Citation Impact)
data.cited_by_percentile_year.min            // → 90
data.cited_by_percentile_year.max            // → 94
data.open_access.is_oa                       // → true
data.open_access.oa_status                   // → "hybrid"  (gold|green|bronze|hybrid|diamond|closed)
data.open_access.oa_url                      // → PDF URL (may be null)
data.primary_location.license                // → "cc-by"  (may be null)
data.primary_location.source.display_name    // → "American Journal of Epidemiology"
data.primary_topic.display_name              // → "Air Quality and Health Impacts"
data.primary_topic.field.display_name        // → "Environmental Science"
data.primary_topic.domain.display_name       // → "Physical Sciences"
data.topics[0..2].display_name               // → top 3 topics
data.keywords[0..4].display_name             // → top 5 keywords (better for display than topics)
data.funders[].display_name                  // → "U.S. Environmental Protection Agency"
data.sustainable_development_goals[].display_name  // → "Good health and well-being"
data.id                                      // → "https://openalex.org/W4399718327"
data.is_retracted                            // → false (always check this)
```

### OA Status Values and Their Display Labels:
```javascript
const OA_CONFIG = {
  gold:    { label: 'Gold Open Access',    color: '#F4A900', emoji: '🔓' },
  green:   { label: 'Green Open Access',   color: '#2E7D32', emoji: '🔓' },
  diamond: { label: 'Diamond Open Access', color: '#00BCD4', emoji: '🔓' },
  hybrid:  { label: 'Hybrid Open Access',  color: '#7B1FA2', emoji: '🔓' },
  bronze:  { label: 'Bronze Open Access',  color: '#A0522D', emoji: '🔓' },
  closed:  { label: 'Subscription Access', color: '#757575', emoji: '🔒' },
};
// Note: The test paper (kwae120) is "hybrid" not "gold" — OA via CC-BY license in subscription journal
```

### FWCI Display Note:
FWCI of `0.3047` means this paper is cited at 30% of the world average for its field and age. Display this as `0.30` (2 decimal places). Add a tooltip or `aria-label` explaining: "Field-Weighted Citation Impact — compares citation rate to global average for similar works. 1.0 = world average."

### Percentile Display:
`cited_by_percentile_year: { min: 90, max: 94 }` means this paper is in the 90–94th percentile for its publication year. Display as "Top 10% in 2024" (use `100 - min` for the "top X%" framing). This is the most compelling single metric for a newer paper.

---

## WCAG 2.2 AA Requirements (Non-Negotiable)

### Carried over from WCAG 2.1 AA (still required):
- **1.4.3 Contrast minimum:** All text at least 4.5:1 against background (3:1 for large text ≥18pt/14pt bold).
- **1.4.11 Non-text contrast:** UI components (focus rings, icons, OA dots) at least 3:1.
- **2.1.1 Keyboard:** All interactive elements (links, buttons) reachable by Tab.
- **2.4.3 Focus order:** Logical Tab order within the widget.
- **2.4.7 Focus visible:** Focus indicator must be visible on all interactive elements.
- **4.1.2 Name/role/value:** All interactive elements have accessible names via `aria-label` or visible text.

### New in WCAG 2.2 — Claude Code MUST implement these:

**2.4.11 Focus Appearance (AA):**
The focus indicator must have:
- Minimum area: perimeter of the component × 2px CSS pixels
- Contrast ratio of the focus indicator itself: at least 3:1 against adjacent colors
- Implementation: `outline: 3px solid #005fcc; outline-offset: 2px;` on all `:focus-visible` states. Never use `outline: none` without providing an equal or better replacement.

**2.5.8 Target Size Minimum (AA):**
All clickable/tappable targets must be at least **24×24 CSS pixels**.
- The OA status dot (●) used as a link or button must meet this — either increase its font size or pad it: `min-width: 24px; min-height: 24px; display: inline-flex; align-items: center; justify-content: center;`
- Tag/keyword pills: ensure they have at least 24px height
- "View in OpenAlex" links: at least 24px tall (easy with normal line-height)
- Citation count links in list badges: must meet this — add padding if needed

**2.5.7 Dragging Movements:** No drag interactions in this widget — not applicable.

### Implementation pattern for all interactive elements:
```css
.oax-link,
.oax-tag,
.oax-badge__link,
.oax-mini-count {
  /* Focus appearance — WCAG 2.4.11 */
  outline: none;
}
.oax-link:focus-visible,
.oax-tag:focus-visible,
.oax-badge__link:focus-visible,
.oax-mini-count:focus-visible {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
  border-radius: 2px;
}

/* Target size — WCAG 2.5.8 */
.oax-mini-dot,
.oax-mini-count {
  min-width: 24px;
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

### Contrast ratios to verify (use browser DevTools or axe):
- Citation count number (`#1a1a1a` on `#ffffff`): 16:1 ✓
- OA status label text (`#1a1a1a` on `#f5f5f5`): ~14:1 ✓
- Gold OA dot (`#F4A900`) on white: 2.4:1 — **FAILS 4.5:1** for text, passes 3:1 for non-text icon
  - The dot is decorative/icon, so 3:1 applies. Use `role="img"` with `aria-label`, not text content.
- "View in OpenAlex" link color: Use `#0056b3` (not `#2196F3`) for sufficient contrast against white.
  - `#2196F3` on white = 3.0:1 — **FAILS 4.5:1**. Use `#0056b3` = 7.0:1 ✓

---

## Widget Type 1 — Publication Page Badge (Priority 1)

**Path:** `/research/publications/*`  
**Trigger element:** `<div class="openalex-pub-badge" data-doi="...">`

### Drupal View Snippet (add to existing "Rewrite results" field):

```html
<!-- EXISTING: do not modify these two divs -->
<div class="grid-pub-widget-sm-start">
  <div>
    <span class="__dimensions_badge_embed__"
          data-doi="{{ field__pub_widget_doi }}"
          data-style="large_rectangle"></span>
  </div>
  <div style="margin-top:-4px;">
    <div class="altmetric-embed"
         data-badge-popover="top"
         data-badge-type="1"
         data-doi="{{ field__pub_widget_doi }}"
         data-hide-no-mentions="true">&nbsp;</div>
  </div>

  <!-- ADD THIS: OpenAlex badge -->
  <div class="openalex-pub-badge"
       data-doi="{{ field__pub_widget_doi }}"
       aria-label="OpenAlex publication metrics"></div>
</div>
```

### Rendered HTML output (what the JS generates inside the div):

```html
<div class="oax-badge" role="region" aria-label="OpenAlex metrics for this publication">

  <!-- Header row -->
  <div class="oax-badge__header">
    <svg class="oax-badge__logo" aria-hidden="true" focusable="false" 
         viewBox="0 0 100 100" width="18" height="18">
      <!-- OpenAlex "O" letterform SVG path -->
    </svg>
    <span class="oax-badge__brand">OpenAlex</span>
  </div>

  <!-- Primary metric: percentile (most compelling for newer papers) -->
  <div class="oax-badge__primary">
    <span class="oax-badge__percentile-value"
          aria-label="In the top 10 percent of publications from 2024">
      Top 10%
    </span>
    <span class="oax-badge__percentile-label">in 2024</span>
  </div>

  <!-- Secondary metrics row -->
  <div class="oax-badge__metrics">
    <div class="oax-metric" aria-label="1 citation">
      <span class="oax-metric__value">1</span>
      <span class="oax-metric__label">Citation</span>
    </div>
    <div class="oax-metric"
         title="Field-Weighted Citation Impact: compares citation rate to global average for similar works. 1.0 = world average."
         aria-label="Field-Weighted Citation Impact: 0.30">
      <span class="oax-metric__value">0.30</span>
      <span class="oax-metric__label">FWCI</span>
    </div>
  </div>

  <!-- Open access status -->
  <div class="oax-badge__oa">
    <span class="oax-oa-indicator oax-oa-indicator--hybrid"
          role="img"
          aria-label="Hybrid Open Access — freely readable under CC-BY license">
      <!-- SVG lock-open icon, aria-hidden -->
    </span>
    <span class="oax-badge__oa-label">Hybrid Open Access</span>
    <!-- If oa_url exists: -->
    <a href="[oa_url]" class="oax-badge__pdf-link"
       target="_blank" rel="noopener noreferrer"
       aria-label="Read free PDF of this article (opens in new tab)">
      PDF ↗
    </a>
  </div>

  <!-- Top keywords (from keywords[], not topics[]) -->
  <div class="oax-badge__tags" aria-label="Research topics">
    <span class="oax-tag">Air pollution</span>
    <span class="oax-tag">Birth weight</span>
    <span class="oax-tag">Environmental health</span>
  </div>

  <!-- Funder (if present) -->
  <div class="oax-badge__funder" aria-label="Funded by U.S. Environmental Protection Agency">
    <span class="oax-badge__funder-icon" aria-hidden="true">🏛</span>
    <span class="oax-badge__funder-text">U.S. Environmental Protection Agency</span>
  </div>

  <!-- Footer link -->
  <a href="https://openalex.org/W4399718327"
     class="oax-badge__link"
     target="_blank"
     rel="noopener noreferrer"
     aria-label="View full record for this publication on OpenAlex (opens in new tab)">
    View on OpenAlex ↗
  </a>
</div>
```

### States to handle:

| State | Behavior |
|-------|----------|
| Loading | Show skeleton: grey placeholder bars, `aria-busy="true"` on container |
| Success | Render full badge |
| Not found (404) | `el.style.display = 'none'` — silent, no broken UI |
| API error (5xx, network) | `el.style.display = 'none'` — log to console with `[OpenAlex Widget]` prefix |
| `is_retracted: true` | Render badge BUT add a red "⚠ Retracted" warning label prominently |
| Zero citations | Show `0 Citations` — do not hide |
| No funders | Omit funder row entirely |
| No OA URL | Show OA status but omit "PDF ↗" link |
| OA status = "closed" | Show closed padlock icon in grey, label "Subscription Access" |

---

## Widget Type 2 — Publication List Mini Badge (Priority 2)

**Path:** `/research/*/publications` (Spatial Health Lab and similar unit pub list pages)  
**Trigger element:** `<span class="openalex-list-badge" data-doi="...">`

### Performance-critical: Use batch API calls

The list page may have 40–60+ publications. **Never fire one API call per publication.** Instead:

1. On DOM ready, collect all `data-doi` values from `.openalex-list-badge` elements
2. Deduplicate
3. Chunk into batches of 25
4. For each chunk, call the filter endpoint with pipe-separated DOIs:
   `GET /works?filter=doi:10.x/a|10.x/b|10.x/c&select=doi,cited_by_count,open_access,cited_by_percentile_year&per-page=25&mailto=...`
5. Map results back to DOM elements by DOI
6. Render each badge

This reduces ~50 API calls to 2. Verify in DevTools Network tab before shipping.

**Important:** The `select=` parameter limits fields returned, keeping the payload small. Only request what you need for this widget.

### Drupal View Snippet:

The list View currently renders citation text. Add the badge trigger as an inline element within each citation's rewrite:

```html
<!-- Inside the list View "Rewrite results" field, after the citation text: -->
<span class="openalex-list-badge"
      data-doi="{{ field__pub_widget_doi }}"
      aria-label="OpenAlex metrics — loading"></span>
```

> **Note to implementer:** The field token name (`field__pub_widget_doi`) may differ in the list View from the publication page View. Check the actual field machine names in the list View's Fields configuration and substitute accordingly.

### Rendered output (inline, non-breaking):

```html
<span class="oax-mini-badge"
      aria-label="OpenAlex: Top 10% in 2024, 1 citation, Hybrid Open Access">
  <!-- OA indicator -->
  <span class="oax-mini-dot oax-mini-dot--hybrid"
        role="img"
        aria-hidden="true"
        title="Hybrid Open Access">●</span>
  <!-- Citation count as link to OpenAlex record -->
  <a href="https://openalex.org/W..."
     class="oax-mini-count"
     target="_blank"
     rel="noopener noreferrer"
     aria-label="1 citation — view on OpenAlex (opens in new tab)">
    1
  </a>
</span>
```

WCAG 2.5.8 target size: the `oax-mini-dot` and `oax-mini-count` elements must be `min-width: 24px; min-height: 24px`.

---

## Widget Type 3 — Faculty Profile Author Metrics Panel (Priority 3)

**Path:** `/directory/*` (confirm actual faculty profile path)  
**Prerequisite:** ORCID field (`field_orcid`) added to Faculty Profile content type and populated.

### API Calls (two, in sequence):

```javascript
// Call 1: Get author entity
GET https://api.openalex.org/authors?filter=orcid:{ORCID}&mailto=...
// Key fields: id, display_name, cited_by_count, works_count, topics[]

// Call 2: Get recent works
GET https://api.openalex.org/works?filter=author.orcid:{ORCID}&sort=publication_date:desc
    &per-page=5&select=title,doi,publication_year,primary_location,open_access,cited_by_count
    &mailto=...

// Call 3 (for h-index): Get top cited works
GET https://api.openalex.org/works?filter=author.orcid:{ORCID}&sort=cited_by_count:desc
    &per-page=100&select=cited_by_count&mailto=...
```

### h-index calculation (must be computed client-side):
```javascript
function computeHIndex(citationCounts) {
  // citationCounts is an array of numbers, already sorted descending
  // (the API returns them sorted by cited_by_count:desc)
  let h = 0;
  for (let i = 0; i < citationCounts.length; i++) {
    if (citationCounts[i] >= i + 1) {
      h = i + 1;
    } else {
      break;
    }
  }
  return h;
}
// Usage: computeHIndex(works.map(w => w.cited_by_count))
```

**Important disclosure:** Display h-index with a tooltip: "h-index as indexed in OpenAlex. May differ from Scopus or Web of Science due to coverage differences."

### Drupal Snippet (add to faculty profile display after ORCID field added):

```html
<div class="openalex-author-panel"
     data-orcid="{{ field_orcid }}"
     aria-label="OpenAlex research profile metrics"></div>
```

If `field_orcid` is empty, the widget must hide silently (check for empty string before calling API).

---

## JavaScript Architecture

### File: `openalex-widgets.js`

```javascript
/**
 * OpenAlex Widgets for OSU College of Health
 * Follows the same initialization pattern as Dimensions, Altmetric, and PlumX
 * on health.oregonstate.edu publication pages.
 * 
 * Pattern:
 * 1. Inject CSS into <head> once
 * 2. On DOM ready, find trigger elements by class
 * 3. Read data-doi or data-orcid attribute
 * 4. Call OpenAlex API
 * 5. Render result into the element
 */
(function () {
  'use strict';

  // ─── Configuration ───────────────────────────────────────────────────────
  var CONFIG = {
    API_BASE: 'https://api.openalex.org',
    MAILTO: 'your-contact-email@oregonstate.edu',  // ← replace before deploy
    STYLE_INJECTED_ATTR: 'data-oax-styles-v1',
    INSTALLED_ATTR: 'data-oax-installed',
    LOG_PREFIX: '[OpenAlex Widget]',

    OA_STATUS: {
      gold:    { label: 'Gold Open Access',    color: '#B8860B' },  // darkened for contrast
      green:   { label: 'Green Open Access',   color: '#1B5E20' },
      diamond: { label: 'Diamond Open Access', color: '#006064' },
      hybrid:  { label: 'Hybrid Open Access',  color: '#4A148C' },
      bronze:  { label: 'Bronze Open Access',  color: '#6D4C41' },
      closed:  { label: 'Subscription Access', color: '#424242' },
    }
  };
  // Note: All OA indicator colors above are darkened to achieve 3:1 contrast
  // on white background for WCAG 1.4.11 non-text contrast.

  // ─── CSS Injection (run once) ─────────────────────────────────────────────
  function injectStyles() {
    if (document.head.hasAttribute(CONFIG.STYLE_INJECTED_ATTR)) return;
    document.head.setAttribute(CONFIG.STYLE_INJECTED_ATTR, '1');

    var style = document.createElement('style');
    style.textContent = [
      // All styles here — see CSS Spec section below
    ].join('');
    document.head.appendChild(style);
  }

  // ─── API Helpers ──────────────────────────────────────────────────────────
  function buildUrl(path, params) {
    var url = CONFIG.API_BASE + path;
    params = params || {};
    params.mailto = CONFIG.MAILTO;
    var qs = Object.keys(params).map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    return url + (url.indexOf('?') === -1 ? '?' : '&') + qs;
  }

  function fetchJSON(url) {
    return fetch(url).then(function(response) {
      if (!response.ok) {
        return Promise.reject(response.status);
      }
      return response.json();
    });
  }

  function normalizeDoi(doi) {
    // Strip https://doi.org/ prefix if present
    return doi.replace(/^https?:\/\/doi\.org\//i, '').trim();
  }

  function hideElement(el) {
    el.style.display = 'none';
  }

  function log(msg) {
    console.log(CONFIG.LOG_PREFIX + ' ' + msg);
  }

  // ─── Safe DOM construction ────────────────────────────────────────────────
  // Never use innerHTML with API data. Use these helpers instead.
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function(k) {
      if (k === 'textContent') {
        node.textContent = attrs[k];
      } else if (k === 'className') {
        node.className = attrs[k];
      } else {
        node.setAttribute(k, attrs[k]);
      }
    });
    (children || []).forEach(function(child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  // ─── Widget 1: Publication Page Badge ─────────────────────────────────────
  function initPubBadge(container) {
    if (container.hasAttribute(CONFIG.INSTALLED_ATTR)) return;
    container.setAttribute(CONFIG.INSTALLED_ATTR, '1');

    var doi = normalizeDoi(container.getAttribute('data-doi') || '');
    if (!doi) { hideElement(container); return; }

    // Show loading skeleton
    renderSkeleton(container);
    container.setAttribute('aria-busy', 'true');

    var url = buildUrl('/works/doi:' + doi);

    fetchJSON(url).then(function(data) {
      container.removeAttribute('aria-busy');
      renderPubBadge(container, data);
    }).catch(function(status) {
      log('Publication badge failed for DOI ' + doi + ' (status: ' + status + ')');
      hideElement(container);
    });
  }

  function renderPubBadge(container, data) {
    // Clear skeleton
    while (container.firstChild) container.removeChild(container.firstChild);

    var oaStatus = (data.open_access && data.open_access.oa_status) || 'closed';
    var oaConfig = CONFIG.OA_STATUS[oaStatus] || CONFIG.OA_STATUS.closed;
    var citations = data.cited_by_count || 0;
    var fwci = data.fwci;
    var percentile = data.cited_by_percentile_year;
    var keywords = (data.keywords || []).slice(0, 3);
    var funders = data.funders || [];
    var oaUrl = data.open_access && data.open_access.oa_url;
    var openAlexId = (data.id || '').replace('https://openalex.org/', '');
    var openAlexUrl = data.id || 'https://openalex.org';
    var isRetracted = data.is_retracted;

    var badge = el('div', { className: 'oax-badge', role: 'region',
      'aria-label': 'OpenAlex metrics for this publication' });

    // Retraction warning (MUST be first and prominent)
    if (isRetracted) {
      badge.appendChild(el('div', {
        className: 'oax-badge__retraction',
        role: 'alert',
        textContent: '⚠ This article has been retracted'
      }));
    }

    // Header
    badge.appendChild(buildBadgeHeader());

    // Primary metric: percentile
    if (percentile && percentile.min >= 75) {
      var topPercent = 100 - percentile.min;
      var pubYear = data.publication_year || '';
      badge.appendChild(el('div', { className: 'oax-badge__primary' }, [
        el('span', {
          className: 'oax-badge__percentile-value',
          'aria-label': 'In the top ' + topPercent + ' percent of publications from ' + pubYear,
          textContent: 'Top ' + topPercent + '%'
        }),
        el('span', {
          className: 'oax-badge__percentile-label',
          textContent: 'in ' + pubYear,
          'aria-hidden': 'true'
        })
      ]));
    }

    // Secondary metrics: citations + FWCI
    var metricsRow = el('div', { className: 'oax-badge__metrics' });
    metricsRow.appendChild(el('div', {
      className: 'oax-metric',
      'aria-label': citations + (citations === 1 ? ' citation' : ' citations')
    }, [
      el('span', { className: 'oax-metric__value', 'aria-hidden': 'true',
        textContent: String(citations) }),
      el('span', { className: 'oax-metric__label', 'aria-hidden': 'true',
        textContent: citations === 1 ? 'Citation' : 'Citations' })
    ]));

    if (fwci !== null && fwci !== undefined) {
      metricsRow.appendChild(el('div', {
        className: 'oax-metric',
        title: 'Field-Weighted Citation Impact — compares this paper\'s citations to the global average for similar works. 1.0 = world average.',
        'aria-label': 'Field-Weighted Citation Impact: ' + fwci.toFixed(2) + '. 1.0 equals world average.'
      }, [
        el('span', { className: 'oax-metric__value', 'aria-hidden': 'true',
          textContent: fwci.toFixed(2) }),
        el('span', { className: 'oax-metric__label', 'aria-hidden': 'true',
          textContent: 'FWCI' })
      ]));
    }
    badge.appendChild(metricsRow);

    // OA status
    var oaRow = el('div', { className: 'oax-badge__oa' });
    oaRow.appendChild(el('span', {
      className: 'oax-oa-dot oax-oa-dot--' + oaStatus,
      role: 'img',
      'aria-label': oaConfig.label,
      'aria-hidden': 'false'
    }));
    oaRow.appendChild(el('span', {
      className: 'oax-badge__oa-label',
      textContent: oaConfig.label,
      'aria-hidden': 'true'  // label already in the dot's aria-label
    }));
    if (oaUrl) {
      oaRow.appendChild(el('a', {
        href: oaUrl,
        className: 'oax-badge__pdf-link',
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': 'Read free PDF of this article (opens in new tab)',
        textContent: 'PDF ↗'
      }));
    }
    badge.appendChild(oaRow);

    // Keywords/topics
    if (keywords.length > 0) {
      var tagsWrap = el('div', { className: 'oax-badge__tags', 'aria-label': 'Research topics' });
      keywords.forEach(function(kw) {
        tagsWrap.appendChild(el('span', {
          className: 'oax-tag',
          textContent: kw.display_name
        }));
      });
      badge.appendChild(tagsWrap);
    }

    // Funder (first funder only)
    if (funders.length > 0) {
      badge.appendChild(el('div', {
        className: 'oax-badge__funder',
        'aria-label': 'Funded by ' + funders[0].display_name
      }, [
        el('span', { className: 'oax-badge__funder-text',
          textContent: funders[0].display_name })
      ]));
    }

    // Footer link
    badge.appendChild(el('a', {
      href: openAlexUrl,
      className: 'oax-badge__link',
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': 'View full publication record on OpenAlex (opens in new tab)',
      textContent: 'View on OpenAlex ↗'
    }));

    container.appendChild(badge);
  }

  // ─── Widget 2: List Badge (batch) ─────────────────────────────────────────
  function initListBadges(elements) {
    // Collect and deduplicate DOIs
    var doiToElements = {};
    Array.prototype.forEach.call(elements, function(el) {
      if (el.hasAttribute(CONFIG.INSTALLED_ATTR)) return;
      el.setAttribute(CONFIG.INSTALLED_ATTR, '1');
      var doi = normalizeDoi(el.getAttribute('data-doi') || '');
      if (!doi) return;
      if (!doiToElements[doi]) doiToElements[doi] = [];
      doiToElements[doi].push(el);
    });

    var allDois = Object.keys(doiToElements);
    if (!allDois.length) return;

    // Chunk into batches of 25
    var chunkSize = 25;
    for (var i = 0; i < allDois.length; i += chunkSize) {
      var chunk = allDois.slice(i, i + chunkSize);
      fetchBatchDois(chunk, doiToElements);
    }
  }

  function fetchBatchDois(dois, doiToElements) {
    var filter = 'doi:' + dois.map(encodeURIComponent).join('|');
    var url = buildUrl('/works', {
      filter: filter,
      select: 'doi,cited_by_count,open_access,cited_by_percentile_year,id',
      'per-page': '25'
    });

    fetchJSON(url).then(function(data) {
      (data.results || []).forEach(function(work) {
        var doi = normalizeDoi(work.doi || '');
        var targets = doiToElements[doi] || [];
        targets.forEach(function(el) {
          renderListBadge(el, work);
        });
      });
    }).catch(function(err) {
      log('Batch fetch failed: ' + err);
      // Elements remain empty — acceptable silent failure
    });
  }

  function renderListBadge(container, work) {
    var citations = work.cited_by_count || 0;
    var oaStatus = (work.open_access && work.open_access.oa_status) || 'closed';
    var oaConfig = CONFIG.OA_STATUS[oaStatus] || CONFIG.OA_STATUS.closed;
    var openAlexUrl = work.id || 'https://openalex.org';

    var percentile = work.cited_by_percentile_year;
    var percentileText = '';
    if (percentile && percentile.min >= 75) {
      percentileText = ', Top ' + (100 - percentile.min) + '%';
    }

    var ariaLabel = 'OpenAlex: ' + citations + 
                    (citations === 1 ? ' citation' : ' citations') + 
                    ', ' + oaConfig.label + percentileText;

    container.setAttribute('aria-label', ariaLabel);

    var badge = el('span', { className: 'oax-mini-badge' });

    badge.appendChild(el('span', {
      className: 'oax-mini-dot oax-mini-dot--' + oaStatus,
      role: 'img',
      'aria-label': oaConfig.label,
      title: oaConfig.label
    }));

    badge.appendChild(el('a', {
      href: openAlexUrl,
      className: 'oax-mini-count',
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': citations + (citations === 1 ? ' citation' : ' citations') +
                    ' — view on OpenAlex (opens in new tab)',
      textContent: String(citations)
    }));

    container.appendChild(badge);
  }

  // ─── Widget 3: Author Panel ───────────────────────────────────────────────
  function initAuthorPanel(container) {
    if (container.hasAttribute(CONFIG.INSTALLED_ATTR)) return;
    container.setAttribute(CONFIG.INSTALLED_ATTR, '1');

    var orcid = (container.getAttribute('data-orcid') || '').trim();
    if (!orcid) { hideElement(container); return; }

    renderSkeleton(container);
    container.setAttribute('aria-busy', 'true');

    var authorUrl = buildUrl('/authors', { filter: 'orcid:' + orcid });
    var recentUrl = buildUrl('/works', {
      filter: 'author.orcid:' + orcid,
      sort: 'publication_date:desc',
      'per-page': '5',
      select: 'title,doi,publication_year,primary_location,open_access,cited_by_count,id'
    });
    var hIndexUrl = buildUrl('/works', {
      filter: 'author.orcid:' + orcid,
      sort: 'cited_by_count:desc',
      'per-page': '100',
      select: 'cited_by_count'
    });

    Promise.all([
      fetchJSON(authorUrl),
      fetchJSON(recentUrl),
      fetchJSON(hIndexUrl)
    ]).then(function(results) {
      var authorData = results[0].results && results[0].results[0];
      var recentWorks = results[1].results || [];
      var hIndexWorks = results[2].results || [];

      if (!authorData) { hideElement(container); return; }

      var hIndex = computeHIndex(hIndexWorks.map(function(w) { return w.cited_by_count || 0; }));

      container.removeAttribute('aria-busy');
      renderAuthorPanel(container, authorData, recentWorks, hIndex);
    }).catch(function(err) {
      log('Author panel failed for ORCID ' + orcid + ': ' + err);
      hideElement(container);
    });
  }

  function computeHIndex(sortedCounts) {
    var h = 0;
    for (var i = 0; i < sortedCounts.length; i++) {
      if (sortedCounts[i] >= i + 1) { h = i + 1; } else { break; }
    }
    return h;
  }

  function renderAuthorPanel(container, author, recentWorks, hIndex) {
    while (container.firstChild) container.removeChild(container.firstChild);
    // Full panel implementation here — follows same el() pattern as Widget 1
    // See rendered HTML spec in plan section above
  }

  // ─── Skeleton / Loading State ─────────────────────────────────────────────
  function renderSkeleton(container) {
    container.setAttribute('aria-label', 'Loading OpenAlex metrics');
    var skel = el('div', { className: 'oax-skeleton', 'aria-hidden': 'true' }, [
      el('div', { className: 'oax-skeleton__line oax-skeleton__line--short' }),
      el('div', { className: 'oax-skeleton__line' }),
      el('div', { className: 'oax-skeleton__line oax-skeleton__line--short' }),
    ]);
    container.appendChild(skel);
  }

  // ─── Badge Header (shared) ────────────────────────────────────────────────
  function buildBadgeHeader() {
    return el('div', { className: 'oax-badge__header' }, [
      // Logo: simple text "OpenAlex" styled with CSS — avoids SVG licensing questions
      el('span', { className: 'oax-badge__brand', 'aria-hidden': 'true',
        textContent: 'OpenAlex' })
    ]);
  }

  // ─── Entry Point ─────────────────────────────────────────────────────────
  function init() {
    injectStyles();

    var pubBadges = document.querySelectorAll('.openalex-pub-badge[data-doi]');
    var listBadges = document.querySelectorAll('.openalex-list-badge[data-doi]');
    var authorPanels = document.querySelectorAll('.openalex-author-panel[data-orcid]');

    Array.prototype.forEach.call(pubBadges, initPubBadge);
    if (listBadges.length > 0) initListBadges(listBadges);
    Array.prototype.forEach.call(authorPanels, initAuthorPanel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for external re-triggering if needed (e.g. after AJAX loads)
  window.OAWidgets = { init: init };

})();
```

---

## CSS Specification

```css
/* ─── OpenAlex Widgets ─── Injected at runtime into <head> ─── */

/* Widget 1: Publication Badge */
.oax-badge {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #ffffff;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.4;
  color: #1a1a1a;
  min-width: 160px;
  max-width: 220px;
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
}

/* Focus appearance — WCAG 2.4.11 */
.oax-badge *:focus-visible,
.oax-badge a:focus-visible,
.oax-badge button:focus-visible {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
  border-radius: 2px;
}

.oax-badge__retraction {
  background: #B71C1C;
  color: #ffffff;
  padding: 4px 6px;
  border-radius: 2px;
  font-weight: bold;
  font-size: 11px;
}

.oax-badge__header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.oax-badge__brand {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #2196F3;
}

.oax-badge__primary {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin: 2px 0;
}

.oax-badge__percentile-value {
  font-size: 20px;
  font-weight: 700;
  color: #DC4405;  /* OSU Beaver Orange */
  line-height: 1;
}

.oax-badge__percentile-label {
  font-size: 11px;
  color: #555;
}

.oax-badge__metrics {
  display: flex;
  gap: 12px;
}

.oax-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: default;
}

.oax-metric__value {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
}

.oax-metric__label {
  font-size: 10px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.oax-badge__oa {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

/* OA dots — aria-label carries the meaning, color is supplementary */
.oax-oa-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.oax-oa-dot--gold    { background: #F4A900; }
.oax-oa-dot--green   { background: #2E7D32; }
.oax-oa-dot--diamond { background: #006064; }
.oax-oa-dot--hybrid  { background: #4A148C; }
.oax-oa-dot--bronze  { background: #6D4C41; }
.oax-oa-dot--closed  { background: #757575; }

.oax-badge__oa-label {
  font-size: 11px;
  color: #444;
}

.oax-badge__pdf-link {
  font-size: 11px;
  color: #0056b3;
  text-decoration: underline;
  margin-left: auto;
}

.oax-badge__pdf-link:hover { color: #003d80; }

.oax-badge__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.oax-tag {
  background: #f0f4ff;
  color: #1a3a6b;
  border-radius: 3px;
  padding: 2px 7px;
  font-size: 11px;
  min-height: 24px;        /* WCAG 2.5.8 target size */
  display: inline-flex;
  align-items: center;
}

.oax-badge__funder {
  font-size: 11px;
  color: #555;
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.oax-badge__link {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: #0056b3;          /* 7.0:1 contrast on white — WCAG 1.4.3 */
  text-decoration: underline;
  min-height: 24px;        /* WCAG 2.5.8 */
  display: flex;
  align-items: center;
}
.oax-badge__link:hover { color: #003d80; }

/* Widget 2: List Mini Badge */
.oax-mini-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: 6px;
  vertical-align: middle;
  white-space: nowrap;
}

.oax-mini-dot {
  font-size: 14px;
  line-height: 1;
  min-width: 24px;          /* WCAG 2.5.8 */
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.oax-mini-dot--gold    { color: #B8860B; }
.oax-mini-dot--green   { color: #1B5E20; }
.oax-mini-dot--diamond { color: #006064; }
.oax-mini-dot--hybrid  { color: #4A148C; }
.oax-mini-dot--bronze  { color: #6D4C41; }
.oax-mini-dot--closed  { color: #424242; }

.oax-mini-count {
  font-size: 12px;
  font-weight: 600;
  color: #0056b3;
  text-decoration: none;
  min-width: 24px;          /* WCAG 2.5.8 */
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px dotted #0056b3;
}
.oax-mini-count:hover { color: #003d80; }
.oax-mini-count:focus-visible {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
  border-radius: 2px;
}

/* Loading skeleton */
.oax-skeleton {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  min-width: 160px;
}
.oax-skeleton__line {
  height: 12px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: oax-shimmer 1.5s infinite;
  border-radius: 3px;
}
.oax-skeleton__line--short { width: 60%; }

@keyframes oax-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Reduced motion — WCAG 2.3.3 (AAA, but implement anyway) */
@media (prefers-reduced-motion: reduce) {
  .oax-skeleton__line { animation: none; background: #e0e0e0; }
}
```

---

## JS Injector Configuration

### Rule 1 — Publication pages
| Field | Value |
|-------|-------|
| Script URL | `https://cdn.jsdelivr.net/gh/[your-org]/openalex-widgets@1.0.0/openalex-widgets.min.js` |
| Path pattern | `/research/publications/*` |
| Load type | External (async defer) |
| Position | Footer |

### Rule 2 — Unit publication list pages
| Field | Value |
|-------|-------|
| Script URL | Same as Rule 1 |
| Path pattern | `/research/*/publications` |
| Load type | External (async defer) |
| Position | Footer |

### Rule 3 — Faculty profiles (Phase 3)
| Field | Value |
|-------|-------|
| Script URL | Same as Rule 1 |
| Path pattern | `/directory/*` *(confirm actual path)* |
| Load type | External (async defer) |
| Position | Footer |

**Rules 1–3 can all use the same script.** On each page, `init()` only activates widget types whose trigger elements exist in the DOM.

---

## GitHub + jsDelivr Setup

1. Create public GitHub repo: `osu-coh-marcomm/openalex-widgets`
2. Commit `openalex-widgets.js` and `openalex-widgets.min.js` to repo root
3. Create a GitHub Release with tag `v1.0.0`
4. jsDelivr URL: `https://cdn.jsdelivr.net/gh/osu-coh-marcomm/openalex-widgets@1.0.0/openalex-widgets.min.js`
5. Use `@latest` tag during development, pin to version tag for production

---

## Implementation Order

**Do Phase 1 only first. Stop and test before Phase 2.**

### Phase 1: Publication page badge
1. Build `openalex-widgets.js` with only `initPubBadge()` working
2. **First test:** Open browser console on `health.oregonstate.edu/research/publications/101093ajekwae120` and run:
   ```javascript
   fetch('https://api.openalex.org/works/doi:10.1093/aje/kwae120?mailto=test@oregonstate.edu')
     .then(r => r.json()).then(console.log)
   ```
   If this returns the JSON data, CSP allows the fetch and you're clear to proceed. If you get a CSP error, stop — a Cloudflare Worker proxy is needed first.
3. Build CSS, inject via `<style>` tag
4. Test against the live page with the DOI snippet added to the View rewrite
5. Commit to GitHub, create v1.0.0 release
6. Add JS Injector Rule 1

### Phase 2: List badges
1. Add `initListBadges()` with batch fetch
2. Confirm batch URL builds correctly in console
3. Add snippet to the Spatial Health Lab list View
4. Add JS Injector Rule 2
5. Verify in DevTools: should see 1-2 API calls, not 40+

### Phase 3: Faculty panel
1. Alan adds `field_orcid` field to Faculty Profile content type
2. Alan populates ORCIDs for a test faculty member (use Perry Hystad: `0000-0002-9454-4986`)
3. Add `initAuthorPanel()` including `computeHIndex()`
4. Test with known ORCID
5. Add JS Injector Rule 3

---

## Testing Checklist

### CSP / Network:
- [ ] `fetch()` to `api.openalex.org` succeeds from the live domain (no console CSP errors)
- [ ] Widget script loads from jsDelivr (check Network tab)
- [ ] Batch API call fires once per 25 DOIs on list page (not one per badge)

### Correctness:
- [ ] Citation count matches openalex.org for the same DOI
- [ ] OA status matches openalex.org (test paper kwae120 should show "Hybrid Open Access")
- [ ] FWCI shows `0.30` for kwae120
- [ ] Percentile shows "Top 10%" for kwae120 (min=90, so 100-90=10)
- [ ] h-index calculation is correct (verify against author's Google Scholar)
- [ ] Retracted paper shows retraction warning (test with a known retracted DOI)
- [ ] `is_oa: true` paper with no `oa_url` shows OA badge but no PDF link

### WCAG 2.2 AA:
- [ ] All links and interactive elements reachable by Tab key
- [ ] Focus ring visible on all interactive elements (3px solid #005fcc)
- [ ] Focus ring contrasts 3:1 against adjacent colors (axe DevTools)
- [ ] All clickable targets ≥ 24×24px (check .oax-mini-dot, .oax-mini-count, .oax-tag)
- [ ] Color contrast of all text passes 4.5:1 (axe DevTools)
- [ ] OA indicator dots pass 3:1 non-text contrast
- [ ] `.oax-badge__link` color #0056b3 passes 4.5:1 on white
- [ ] Skeleton animation respects `prefers-reduced-motion`
- [ ] `aria-busy="true"` present during loading
- [ ] Screen reader announces "Loading OpenAlex metrics" during load state

### Graceful failure:
- [ ] Non-existent DOI: container hides, no broken UI, no console errors (only `[OpenAlex Widget]` log)
- [ ] Widget absent from pages without trigger elements (no JS errors on unrelated pages)
- [ ] Empty ORCID field: author panel hides silently

---

## Reference: OpenAlex API Endpoints

```
# Single work by DOI (Widget 1)
GET https://api.openalex.org/works/doi:{DOI}?mailto=...

# Batch works (Widget 2 list badges)
GET https://api.openalex.org/works?filter=doi:{DOI1}|{DOI2}|...&select=doi,cited_by_count,open_access,cited_by_percentile_year,id&per-page=25&mailto=...

# Author by ORCID (Widget 3)
GET https://api.openalex.org/authors?filter=orcid:{ORCID}&mailto=...

# Recent works by ORCID (Widget 3)
GET https://api.openalex.org/works?filter=author.orcid:{ORCID}&sort=publication_date:desc&per-page=5&select=title,doi,publication_year,primary_location,open_access,cited_by_count,id&mailto=...

# Top cited works for h-index (Widget 3)
GET https://api.openalex.org/works?filter=author.orcid:{ORCID}&sort=cited_by_count:desc&per-page=100&select=cited_by_count&mailto=...

# OSU institution (for future institution dashboard)
GET https://api.openalex.org/institutions/ror:https://ror.org/00ysfqy60?mailto=...
```

---

## Key Decisions Summary

| Decision | Rationale |
|----------|-----------|
| CSS injected via `<style>` in `<head>` | Matches Dimensions approach; no separate file to manage in JS Injector |
| `data-doi` attribute initialized from Drupal View token | Identical to Dimensions/Altmetric/PlumX — zero new infrastructure |
| Batch API for list badges (25 DOIs/request) | Prevents rate limiting and slow page load on long publication lists |
| Show percentile as primary metric | More compelling than raw citations for newer papers (kwae120: 1 citation, but top 10%) |
| FWCI as secondary metric | Mirrors what Dimensions shows; field-normalized = more honest than raw count |
| Keywords over topics for display | `keywords[]` values are shorter and more human-readable than topic hierarchy names |
| OA link points to `open_access.oa_url` | Direct PDF access, not just DOI landing page |
| `#0056b3` for link color | Passes 4.5:1 contrast; `#2196F3` (OpenAlex brand blue) fails at 3.0:1 |
| h-index computed client-side | OpenAlex doesn't return it directly; computed from top-100 cited works |
| `[data-oax-installed]` guard | Prevents double-init if script loads multiple times (consistent with Dimensions pattern) |

---

*Build plan v2 — OSU College of Health MarComm*  
*OpenAlex API docs: https://developers.openalex.org*  
*Test DOI: 10.1093/aje/kwae120 (kwae120) — confirmed live response included in this document*
