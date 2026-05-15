# OpenAlex Widgets for OSU College of Health

Vanilla JavaScript widget suite that pulls publication and author metrics from the [OpenAlex API](https://developers.openalex.org/) and renders them on Drupal 10 pages.

No build tools. No bundler. No npm. No framework. Single `.js` file delivered via jsDelivr CDN.

---

## Widgets

### Widget 1 — Publication Page Badge

A card-style badge for single publication pages. Shows:
- Citation percentile ("Top 10% in 2024")
- Raw citation count
- Field-Weighted Citation Impact (FWCI)
- Open access status with PDF link
- Top 3 keywords
- Primary funder

**Trigger:** `<div class="openalex-pub-badge" data-doi="10.1093/aje/kwae120"></div>`

### Widget 2 — Publication List Mini Badge

Inline badge for publication list pages. Uses batch API calls (up to 25 DOIs per request) to avoid rate limiting. Shows:
- OA status dot (color-coded)
- Citation count (linked to OpenAlex record)

**Trigger:** `<span class="openalex-list-badge" data-doi="10.1093/aje/kwae120"></span>`

### Widget 3 — Faculty Author Metrics Panel

Full metrics panel for faculty profile pages. Requires an ORCID field on the Faculty Profile content type. Shows:
- Total works count, total citations, h-index
- 5 most recent publications with OA status
- Top 5 research topics

**Trigger:** `<div class="openalex-author-panel" data-orcid="0000-0002-9454-4986"></div>`

---

## Installation

### 1. Add the script via JS Injector

See [`drupal-snippets/js-injector-setup.md`](drupal-snippets/js-injector-setup.md) for complete step-by-step instructions.

**jsDelivr CDN URL (production):**
```
https://cdn.jsdelivr.net/gh/alancalvert/openalex-widgets@1.0.0/openalex-widgets.min.js
```

### 2. Add trigger elements to your Drupal Views

- Widget 1: See [`drupal-snippets/1-publication-page.html`](drupal-snippets/1-publication-page.html)
- Widget 2: See [`drupal-snippets/2-publication-list.html`](drupal-snippets/2-publication-list.html)
- Widget 3: See [`drupal-snippets/3-faculty-profile.html`](drupal-snippets/3-faculty-profile.html)

---

## Configuration

Edit `openalex-widgets.js`, find the `CONFIG` object near the top, and update:

```javascript
MAILTO: 'alan.calvert@oregonstate.edu',  // your contact email for OpenAlex API
```

OpenAlex uses the mailto parameter to contact you if your usage causes infrastructure issues. It's not displayed publicly.

---

## Implementation Order

Build Phase 1 first. Stop and test before Phase 2.

### Phase 1: Publication page badge
1. CSP check (see js-injector-setup.md)
2. Add Widget 1 snippet to the publication page View
3. Add JS Injector Rule 1
4. Create v1.0.0 GitHub release, update jsDelivr URL

### Phase 2: Publication list mini badges
1. Add Widget 2 snippet to the list View
2. Add JS Injector Rule 2
3. Verify in DevTools: 1–2 API calls per page, not one per badge

### Phase 3: Faculty profiles
1. Add `field_orcid` field to Faculty Profile content type
2. Populate ORCID for test faculty (try Perry Hystad: `0000-0002-9454-4986`)
3. Add Widget 3 snippet to faculty profile display
4. Add JS Injector Rule 3

---

## WCAG 2.2 AA

The widgets implement:
- **2.4.11 Focus Appearance**: 3px solid `#005fcc` outline on all interactive elements
- **2.5.8 Target Size**: All clickable elements ≥ 24×24 CSS pixels
- **1.4.3 Contrast**: All text colors verified ≥ 4.5:1 on white (`#0056b3` for links = 7.0:1)
- **1.4.11 Non-text Contrast**: All OA indicator dots ≥ 3:1 on white
- **2.3.3 Animation from Interactions**: Skeleton shimmer respects `prefers-reduced-motion`

---

## Testing

### Quick API check (run in browser console on any OSU page)
```javascript
fetch('https://api.openalex.org/works/doi:10.1093/aje/kwae120?mailto=alan.calvert@oregonstate.edu')
  .then(r => r.json())
  .then(data => console.log('citations:', data.cited_by_count, '| OA:', data.open_access.oa_status))
```

Expected output: `citations: 1 | OA: hybrid`

### Test faculty ORCID
Perry Hystad: `0000-0002-9454-4986` — confirmed active OpenAlex author record.

---

## Files

```
openalex-widgets/
├── README.md
├── openalex-widgets.js          # Unminified source (edit this)
├── openalex-widgets.min.js      # Production (minify with: npx terser openalex-widgets.js -o openalex-widgets.min.js)
├── drupal-snippets/
│   ├── 1-publication-page.html
│   ├── 2-publication-list.html
│   ├── 3-faculty-profile.html
│   └── js-injector-setup.md
├── openalex-overview-coh.md     # Background: OpenAlex overview for COH
└── claude-code-openalex-widget-plan-v2.md  # Full build plan
```

---

## API Reference

```
# Single work by DOI (Widget 1)
GET https://api.openalex.org/works/doi:{DOI}?mailto=...

# Batch works by DOI list (Widget 2)
GET https://api.openalex.org/works?filter=doi:{DOI1}|{DOI2}|...&select=...&per-page=25&mailto=...

# Author by ORCID (Widget 3)
GET https://api.openalex.org/authors?filter=orcid:{ORCID}&mailto=...

# Works by ORCID — recent (Widget 3)
GET https://api.openalex.org/works?filter=author.orcid:{ORCID}&sort=publication_date:desc&per-page=5&select=...&mailto=...

# Works by ORCID — top cited for h-index (Widget 3)
GET https://api.openalex.org/works?filter=author.orcid:{ORCID}&sort=cited_by_count:desc&per-page=100&select=cited_by_count&mailto=...
```

OSU ROR ID: `https://ror.org/00ysfqy60`

---

*OSU College of Health MarComm · [OpenAlex API docs](https://developers.openalex.org)*
