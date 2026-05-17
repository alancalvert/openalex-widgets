# OpenAlex Widgets — Madrone Theme Variants: Design Spec

**Date:** 2026-05-16  
**Author:** Alan Calvert, OSU College of Health, Web & Digital  
**Status:** Approved — ready for implementation

---

## Overview

Extend the existing `openalex-widgets.js` IIFE with three Madrone-themed widget variants for the OSU College of Health Drupal 10 site. These variants render OpenAlex API data using the Madrone design system (Bootstrap 5.2, Open Sans, OSU brand colors) and are designed to drop into Drupal node templates or views with a single class + data attribute.

The three widget types already exist in the codebase. This work adds Madrone-specific rendering branches for each, triggered by CSS modifier classes on the same host elements.

---

## Widget 1: Publication Badge (`openalex-pub-badge`)

Displays metadata for a single publication, embedded on a publication detail page.

### Trigger

```html
<div class="openalex-pub-badge openalex-pub-badge--madrone-card" data-doi="10.xxxx/xxxxx"></div>
```

### Variants

| Class suffix | Layout | Use case |
|---|---|---|
| `--madrone-card` (A) | Card with border, journal chip, OA badge, abstract | Full publication page sidebar |
| `--madrone-strip` (B) | Compact single-row strip with icon links | Dense lists or module blocks |
| `--madrone-bold` (C) | Large citation count emphasis, horizontal rule | Feature/highlight treatment |

### API

- Endpoint: `https://api.openalex.org/works?filter=doi:{doi}&select=title,publication_year,doi,open_access,cited_by_count,fwci,primary_location,abstract_inverted_index`
- Fields used: `title`, `publication_year`, `doi`, `open_access.oa_status`, `cited_by_count`, `fwci`, `primary_location.source.display_name`, `abstract_inverted_index`

### Rendering rules

- **OA badge**: all variants show OA status (see OA Badge System section)
- **Citation count**: all variants show cited-by count
- **FWCI**: all variants show FWCI when available; no suppression threshold for this widget (it's a publication detail, not a scan list)
- **Abstract**: Card variant only; reconstructed from `abstract_inverted_index`
- **Journal**: displayed as a chip/pill; link goes to OpenAlex source URL

---

## Widget 2: Faculty Author Panel (`openalex-author-panel`)

Displays an author profile block with career stats and a short publication list. Designed for faculty directory profile pages.

### Trigger

```html
<div class="openalex-author-panel openalex-author-panel--madrone-card"
     data-orcid="0000-0002-0299-2783"
     data-pub-mode="recent"></div>
```

### Variants

| Class suffix | Layout | Use case |
|---|---|---|
| `--madrone-card` (A) | Card with portrait placeholder, 4-stat grid, pub list | Full sidebar profile block |
| `--madrone-strip` (B) | Compact horizontal with inline stats | Listing page / directory row |
| `--madrone-bold` (C) | Bold stats emphasis, minimal chrome | Landing page feature treatment |

### `data-pub-mode` attribute

Controls the publication list displayed below the stats:

| Value | Behavior |
|---|---|
| `recent` (default) | 3 most recent works, sorted by `publication_date:desc` |
| `cited` | 3 most-cited works, sorted by `cited_by_count:desc`; each item shows citation count + journal below title |
| `none` | No publication list; stats block only |

### API

- Author: `https://api.openalex.org/authors?filter=orcid:{orcid}&select=id,display_name,summary_stats,cited_by_count,works_count,last_known_institutions`
- Works (recent): `https://api.openalex.org/works?filter=authorships.author.id:{id}&sort=publication_date:desc&per-page=3&select=title,doi,publication_year,primary_location`
- Works (cited): `https://api.openalex.org/works?filter=authorships.author.id:{id}&sort=cited_by_count:desc&per-page=3&select=title,doi,publication_year,cited_by_count,primary_location`

### Stat fields

| Display label | API field |
|---|---|
| Publications | `works_count` |
| Citations | `cited_by_count` |
| h-index | `summary_stats.h_index` |
| FWCI | `summary_stats.2yr_mean_citedness` |

All four stats always display in the faculty panel, including FWCI values below 1.0. The panel is an informational profile view, not a scan filter.

### Long-name behavior

Author names longer than ~12 characters (e.g., "Kari-Lyn K. Sakuma") may cause the Strip B variant's inline stat row to wrap. This is acceptable flex-wrap behavior. Card A and Bold C handle long names cleanly at all viewport widths.

---

## Widget 3: List Mini-Badge (`openalex-list-badge`)

A compact inline badge appended to a publication title in a list view. Shows OA status, citation count, and FWCI (conditionally).

### Trigger

```html
<span class="openalex-list-badge openalex-list-badge--madrone" data-doi="10.xxxx/xxxxx"></span>
```

Only one Madrone variant exists for this widget — the `--madrone` class.

### API

- Endpoint: `https://api.openalex.org/works?filter=doi:{doi}&select=open_access,cited_by_count,fwci`
- Fields used: `open_access.oa_status`, `cited_by_count`, `fwci`

### Badge order (left to right)

1. **OA status badge** (always shown)
2. **Citation count** (always shown; "0" shown as "0 citations")
3. **FWCI badge** (conditional — see below)

### FWCI suppression rule

In the mini-badge only, FWCI is shown only when the value is **greater than 1.0**. Values ≤ 1.0 (below world average) are suppressed — they add noise without signal in a scan context. Values above 1.0 are meaningful highlights. When unavailable (`null`), also suppress.

---

## OA Badge System

All three widgets use a consistent set of OA status badges.

### Badge classes and colors

| OA status | CSS class | Background | Text | Contrast ratio | Notes |
|---|---|---|---|---|---|
| Gold | `.text-bg-gold-oa` | `#ffb500` | `#000` | 11.9:1 ✓ | OSU "Luminance" |
| Green | `.text-bg-green-oa` | `#4a773c` | `#fff` | 5.3:1 ✓ | OSU "Reindeer" |
| Bronze | `.text-bg-bronze-oa` | `#d3832b` | `#000` | 7.0:1 ✓ | **Must use black text** |
| Hybrid | `.text-bg-hybrid-oa` | `#006a8e` | `#fff` | 6.0:1 ✓ | OSU "Moody Blue" |
| Closed | `.text-bg-closed` | `#e9e5e4` | `#2e2b2a` + border | Meets AA | Neutral; border for edge contrast |

### Bronze warning

OSU Solar Flare (`#d3832b`) with **white** text yields 2.98:1, which **fails WCAG AA** for small badge text. Black text is mandatory for this color. This is an OSU brand color designed before WCAG digital requirements became standard — the widget implementation must enforce the correct pairing.

### Badge text labels

| OA status value (API) | Badge label |
|---|---|
| `gold` | Gold OA |
| `green` | Green OA |
| `bronze` | Bronze OA |
| `hybrid` | Hybrid OA |
| `closed` | Closed |
| `diamond` | Diamond OA |

---

## Accessibility

### Font sizes

All font sizes use `rem` units to scale with the browser's root font-size preference (WCAG 1.4.4 Resize Text). Never use `px` for text.

Representative values:
- Body / default: `0.9375rem` (≈ 15px at 16px root)
- Badge labels, meta text: `0.75rem`
- Small meta/secondary: `0.6875rem`–`0.625rem`
- Large stat numbers: `1.75rem`–`1.375rem`

### Tooltips

Use CSS-only tooltips on badge abbreviations and icon-only buttons:

```html
<span class="text-bg-gold-oa oax-badge" data-tooltip="Gold Open Access" tabindex="0">Gold OA</span>
```

Tooltip implemented via `[data-tooltip]::after` + `::before` pseudo-elements. The `tabindex="0"` makes non-interactive elements keyboard-focusable so the tooltip is reachable.

### Link behavior

- Links use a neutral `color: inherit` or muted blue — not a loud primary blue — to avoid visual noise in dense publication lists.
- Do **not** add `↗` arrows or external-link ARIA attributes to any widget links. The Drupal **Link Purpose** module automatically adds these to external links sitewide. Duplicate markup would result in two arrows.

### Color contrast

All badge combinations meet WCAG 2.2 AA (4.5:1 for small text). See `docs/reference/osu-madrone-badge-contrast-reference.html` for the full audit.

---

## Technical Architecture

### Existing codebase

`openalex-widgets.js` is a vanilla JS IIFE (~31KB). It:
- Finds host elements by class + data-attribute selectors
- Fetches from the OpenAlex API
- Renders HTML by string interpolation into the host element's `innerHTML`
- Exposes `window.OAWidgets = { init: init }` for Drupal AJAX re-triggering after dynamic page loads

### Integration approach

Add Madrone variant rendering inside the existing IIFE, branching on the presence of the Madrone modifier class. No build tools, no framework. The existing rendering paths for non-Madrone variants are untouched.

Rough branch logic:

```js
if (el.classList.contains('openalex-pub-badge--madrone-card')) {
  renderMadroneCard(el, data);
} else if (el.classList.contains('openalex-pub-badge--madrone-strip')) {
  renderMadroneStrip(el, data);
} else if (el.classList.contains('openalex-pub-badge--madrone-bold')) {
  renderMadroneBold(el, data);
} else {
  renderDefault(el, data); // existing behavior, untouched
}
```

### CSS delivery

Madrone variant CSS can be:
- **Option A (preferred)**: A separate `openalex-widgets-madrone.css` file loaded by Drupal only when on Madrone-themed OSU pages. Keeps the base widget stylesheet clean.
- **Option B**: Scoped Madrone CSS appended to `openalex-widgets.css` under a `.madrone-theme` ancestor selector.

Recommendation: Option A — separate file, conditionally loaded via Drupal library definition. The OSU Madrone theme already provides Bootstrap 5.2 and Open Sans; the widget CSS only defines widget-specific layout and badge colors.

### Drupal integration notes

- Host elements placed in Drupal node templates or Views custom output
- `data-doi` and `data-orcid` populated from Drupal field values (e.g., `{{ node.field_doi.value }}`)
- `data-pub-mode` on faculty panel defaults to `recent` if omitted
- Widget JS loaded via Drupal library; `window.OAWidgets.init()` called in `Drupal.behaviors` for AJAX compatibility

---

## Reference Files

Both reference documents are committed to this repository at:

- `docs/reference/openalex-widget-reference.html` — all three widgets, all variants, all OA types, long-name stress test, sticky TOC
- `docs/reference/osu-madrone-badge-contrast-reference.html` — WCAG contrast audit for all Madrone badge colors

These are self-contained HTML files (no external dependencies) suitable for sharing with other OSU web teams.

---

## Out of Scope

- Dark mode variants
- RTL support
- Non-Madrone theme variants (existing widget rendering is untouched)
- Author portrait image fetching (placeholder treatment only)
- Caching / local storage of API responses
- Widget configuration UI in Drupal admin
