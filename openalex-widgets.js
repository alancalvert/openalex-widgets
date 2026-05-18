/**
 * OpenAlex Widgets for OSU College of Health
 *
 * Follows the same initialization pattern as Dimensions, Altmetric, and PlumX
 * on health.oregonstate.edu publication pages:
 *   1. Inject CSS into <head> once
 *   2. On DOM ready, find trigger elements by class
 *   3. Read data-doi or data-orcid attribute
 *   4. Call OpenAlex API
 *   5. Render result into the element
 *
 * Widget 1: .openalex-pub-badge[data-doi]   — publication page detail badge
 * Widget 2: .openalex-list-badge[data-doi]  — inline mini badge for pub lists (batch API)
 * Widget 3: .openalex-author-panel[data-orcid] — faculty profile metrics panel
 *
 * Source: https://github.com/alancalvert/openalex-widgets
 * API docs: https://developers.openalex.org
 */
(function () {
  'use strict';

  // ─── Configuration ────────────────────────────────────────────────────────
  var CONFIG = {
    API_BASE: 'https://api.openalex.org',
    MAILTO: 'alan.calvert@oregonstate.edu',
    STYLE_INJECTED_ATTR: 'data-oax-styles-v1',
    INSTALLED_ATTR: 'data-oax-installed',
    LOG_PREFIX: '[OpenAlex Widget]',

    OA_STATUS: {
      gold:    { label: 'Gold Open Access',    bg: '#F4A900', dot: '#B8860B' },
      green:   { label: 'Green Open Access',   bg: '#2E7D32', dot: '#1B5E20' },
      diamond: { label: 'Diamond Open Access', bg: '#006064', dot: '#004D40' },
      hybrid:  { label: 'Hybrid Open Access',  bg: '#4A148C', dot: '#4A148C' },
      bronze:  { label: 'Bronze Open Access',  bg: '#6D4C41', dot: '#4E342E' },
      closed:  { label: 'Subscription Access', bg: '#757575', dot: '#424242' }
    }
  };
  // All dot colors meet ≥3:1 non-text contrast on white (WCAG 1.4.11)

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

  function shouldShowFwci(value) {
    return value !== null && value !== undefined && value > 1.0;
  }

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

  // ─── CSS Injection (runs once per page) ───────────────────────────────────
  function injectStyles() {
    if (document.head.hasAttribute(CONFIG.STYLE_INJECTED_ATTR)) return;
    document.head.setAttribute(CONFIG.STYLE_INJECTED_ATTR, '1');

    var style = document.createElement('style');
    style.textContent = [

      /* === Shared focus appearance — WCAG 2.4.11 === */
      '.oax-badge a:focus-visible,',
      '.oax-badge button:focus-visible,',
      '.oax-mini-count:focus-visible,',
      '.oax-author-panel a:focus-visible,',
      '.oax-author-panel button:focus-visible {',
      '  outline: 3px solid #005fcc;',
      '  outline-offset: 2px;',
      '  border-radius: 2px;',
      '}',

      /* === Widget 1: Publication Badge === */
      '.oax-badge {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 6px;',
      '  padding: 10px 12px;',
      '  border: 1px solid #d0d0d0;',
      '  border-radius: 4px;',
      '  background: #fff;',
      '  font-family: inherit;',
      '  font-size: 0.75rem;',
      '  line-height: 1.4;',
      '  color: #1a1a1a;',
      '  min-width: 160px;',
      '  max-width: 220px;',
      '  box-shadow: 0 1px 3px rgba(0,0,0,.08);',
      '}',
      '.oax-badge__retraction {',
      '  background: #B71C1C;',
      '  color: #fff;',
      '  padding: 4px 6px;',
      '  border-radius: 2px;',
      '  font-weight: 700;',
      '  font-size: 0.6875rem;',
      '}',
      '.oax-badge__header {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 4px;',
      '}',
      '.oax-badge__brand {',
      '  font-size: 0.625rem;',
      '  font-weight: 700;',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.08em;',
      '  color: #0056b3;', /* 7.0:1 on white — #2196F3 fails at 3.0:1 */
      '}',
      '.oax-badge__primary {',
      '  display: flex;',
      '  align-items: baseline;',
      '  gap: 4px;',
      '  margin: 2px 0;',
      '}',
      '.oax-badge__percentile-value {',
      '  font-size: 1.25rem;',
      '  font-weight: 700;',
      '  color: #DC4405;', /* OSU Beaver Orange */
      '  line-height: 1;',
      '}',
      '.oax-badge__percentile-label {',
      '  font-size: 0.6875rem;',
      '  color: #555;',
      '}',
      '.oax-badge__metrics {',
      '  display: flex;',
      '  gap: 12px;',
      '}',
      '.oax-metric {',
      '  display: flex;',
      '  flex-direction: column;',
      '  align-items: center;',
      '  cursor: default;',
      '}',
      '.oax-metric__value {',
      '  font-size: 1rem;',
      '  font-weight: 700;',
      '  color: #1a1a1a;',
      '  line-height: 1;',
      '}',
      '.oax-metric__label {',
      '  font-size: 0.625rem;',
      '  color: #666;',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.04em;',
      '}',
      '.oax-badge__oa {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 5px;',
      '  flex-wrap: wrap;',
      '}',
      /* OA dot — CSS-drawn circle, aria-label carries meaning */
      '.oax-oa-dot {',
      '  width: 10px;',
      '  height: 10px;',
      '  border-radius: 50%;',
      '  display: inline-block;',
      '  flex-shrink: 0;',
      '}',
      '.oax-oa-dot--gold    { background: #F4A900; }',
      '.oax-oa-dot--green   { background: #2E7D32; }',
      '.oax-oa-dot--diamond { background: #006064; }',
      '.oax-oa-dot--hybrid  { background: #4A148C; }',
      '.oax-oa-dot--bronze  { background: #6D4C41; }',
      '.oax-oa-dot--closed  { background: #757575; }',
      '.oax-badge__oa-label {',
      '  font-size: 0.6875rem;',
      '  color: #444;',
      '}',
      '.oax-badge__pdf-link {',
      '  font-size: 0.6875rem;',
      '  color: #0056b3;',
      '  text-decoration: underline;',
      '  margin-left: auto;',
      '  min-height: 24px;', /* WCAG 2.5.8 target size */
      '  display: inline-flex;',
      '  align-items: center;',
      '}',
      '.oax-badge__pdf-link:hover { color: #003d80; }',
      '.oax-badge__tags {',
      '  display: flex;',
      '  flex-wrap: wrap;',
      '  gap: 4px;',
      '}',
      '.oax-tag {',
      '  background: #f0f4ff;',
      '  color: #1a3a6b;',
      '  border-radius: 3px;',
      '  padding: 2px 7px;',
      '  font-size: 0.6875rem;',
      '  min-height: 24px;', /* WCAG 2.5.8 */
      '  display: inline-flex;',
      '  align-items: center;',
      '}',
      '.oax-badge__funder {',
      '  font-size: 0.6875rem;',
      '  color: #555;',
      '  display: flex;',
      '  align-items: flex-start;',
      '  gap: 4px;',
      '}',
      '.oax-badge__link {',
      '  margin-top: 4px;',
      '  font-size: 0.6875rem;',
      '  color: #0056b3;', /* 7.0:1 on white */
      '  text-decoration: underline;',
      '  min-height: 24px;', /* WCAG 2.5.8 */
      '  display: flex;',
      '  align-items: center;',
      '}',
      '.oax-badge__link:hover { color: #003d80; }',

      /* === Widget 2: List Mini Badge === */
      '.oax-mini-badge {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 2px;',
      '  margin-left: 6px;',
      '  vertical-align: middle;',
      '  white-space: nowrap;',
      '}',
      /* Mini dot: container provides 24px target area, pseudo-element draws the circle */
      '.oax-mini-dot {',
      '  width: 20px;',
      '  height: 20px;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  flex-shrink: 0;',
      '}',
      '.oax-mini-dot::before {',
      '  content: "";',
      '  width: 9px;',
      '  height: 9px;',
      '  border-radius: 50%;',
      '  background: currentColor;',
      '}',
      '.oax-mini-dot--gold    { color: #B8860B; }', /* darkened for 3:1 on white */
      '.oax-mini-dot--green   { color: #1B5E20; }',
      '.oax-mini-dot--diamond { color: #004D40; }',
      '.oax-mini-dot--hybrid  { color: #4A148C; }',
      '.oax-mini-dot--bronze  { color: #4E342E; }',
      '.oax-mini-dot--closed  { color: #424242; }',
      '.oax-mini-count {',
      '  font-size: 0.75rem;',
      '  font-weight: 600;',
      '  color: #0056b3;',
      '  text-decoration: none;',
      '  min-width: 24px;', /* WCAG 2.5.8 */
      '  min-height: 24px;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  border-bottom: 1px dotted #0056b3;',
      '}',
      '.oax-mini-count:hover { color: #003d80; }',

      /* === Widget 3: Author Panel === */
      '.oax-author-panel {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 10px;',
      '  padding: 14px 16px;',
      '  border: 1px solid #d0d0d0;',
      '  border-radius: 4px;',
      '  background: #fff;',
      '  font-family: inherit;',
      '  font-size: 0.8125rem;',
      '  line-height: 1.4;',
      '  color: #1a1a1a;',
      '  max-width: 420px;',
      '  box-shadow: 0 1px 3px rgba(0,0,0,.08);',
      '}',
      '.oax-author-panel__header {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '}',
      '.oax-author-panel__name {',
      '  font-weight: 600;',
      '  font-size: 0.875rem;',
      '  color: #1a1a1a;',
      '}',
      '.oax-author-panel__stats {',
      '  display: flex;',
      '  gap: 20px;',
      '}',
      '.oax-stat {',
      '  display: flex;',
      '  flex-direction: column;',
      '  align-items: center;',
      '  cursor: default;',
      '}',
      '.oax-stat__value {',
      '  font-size: 1.375rem;',
      '  font-weight: 700;',
      '  color: #DC4405;',
      '  line-height: 1;',
      '}',
      '.oax-stat__label {',
      '  font-size: 0.625rem;',
      '  color: #666;',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.04em;',
      '}',
      '.oax-section-title {',
      '  font-size: 0.625rem;',
      '  font-weight: 700;',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.06em;',
      '  color: #666;',
      '  margin-bottom: 5px;',
      '}',
      '.oax-pub-list {',
      '  list-style: none;',
      '  margin: 0;',
      '  padding: 0;',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 8px;',
      '}',
      '.oax-pub-item__title {',
      '  display: block;',
      '  font-size: 0.75rem;',
      '  color: #0056b3;',
      '  text-decoration: underline;',
      '  line-height: 1.35;',
      '}',
      '.oax-pub-item__title:hover { color: #003d80; }',
      '.oax-pub-item__meta {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 6px;',
      '  margin-top: 3px;',
      '  font-size: 0.6875rem;',
      '  color: #666;',
      '}',
      '.oax-footnote {',
      '  font-size: 0.625rem;',
      '  color: #888;',
      '  font-style: italic;',
      '}',

      /* === Loading skeleton === */
      '.oax-skeleton {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 6px;',
      '  padding: 10px 12px;',
      '  min-width: 160px;',
      '}',
      '.oax-skeleton__line {',
      '  height: 12px;',
      '  background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);',
      '  background-size: 200% 100%;',
      '  animation: oax-shimmer 1.5s infinite;',
      '  border-radius: 3px;',
      '}',
      '.oax-skeleton__line--short { width: 60%; }',
      '@keyframes oax-shimmer {',
      '  0%   { background-position: 200% 0; }',
      '  100% { background-position: -200% 0; }',
      '}',
      '@media (prefers-reduced-motion: reduce) {',
      '  .oax-skeleton__line { animation: none; background: #e0e0e0; }',
      '}'

    ].join('\n');

    /* Madrone theme — bundled so the single JS file is self-contained */
    style.textContent += '\n' + [

      /* Design tokens */
      '.openalex-pub-badge,',
      '.openalex-list-badge,',
      '.openalex-author-panel {',
      '  --osu-orange:    #d73f09;',
      '  --osu-orange-dk: #b53507;',
      '  --neutral-100:   #f7f5f5;',
      '  --neutral-200:   #e9e5e4;',
      '  --neutral-300:   #d4cfcd;',
      '  --neutral-700:   #423e3c;',
      '  --neutral-800:   #2e2b2a;',
      '  --stratosphere:  #006a8e;',
      '  --pine:          #4a773c;',
      '  --label:         #595959;',
      '  --shadow:        0 2px 3px hsl(0 0% 0% / 0.25);',
      '}',

      /* OA status badges */
      '.oax-oa-badge {',
      '  display: inline-block;',
      '  padding: 0.25em 0.5em;',
      '  font-size: 0.75rem;',
      '  font-weight: 700;',
      '  line-height: 1;',
      '  white-space: nowrap;',
      '  vertical-align: middle;',
      '  border-radius: 4px;',
      '  font-family: \'Open Sans\', sans-serif;',
      '}',
      '.oax-oa-badge--gold    { background: #ffb500; color: #000; }',
      '.oax-oa-badge--green   { background: #4a773c; color: #fff; }',
      '.oax-oa-badge--bronze  { background: #d3832b; color: #000; }',
      '.oax-oa-badge--hybrid  { background: #006a8e; color: #fff; }',
      '.oax-oa-badge--closed  { background: #e9e5e4; color: #2e2b2a; border: 1px solid #767676; }',
      '.oax-oa-badge--diamond { background: #4a773c; color: #fff; }',

      /* Citation count badge */
      '.oax-cite-badge {',
      '  display: inline-block;',
      '  padding: 0.25em 0.5em;',
      '  font-size: 0.75rem;',
      '  font-weight: 700;',
      '  line-height: 1;',
      '  white-space: nowrap;',
      '  background: #f7f5f5;',
      '  color: #000;',
      '  border-radius: 4px;',
      '  border: 1px solid #d4cfcd;',
      '  font-family: \'Open Sans\', sans-serif;',
      '  vertical-align: middle;',
      '}',

      /* FWCI badge */
      '.oax-fwci-badge {',
      '  display: inline-block;',
      '  padding: 0.25em 0.5em;',
      '  font-size: 0.75rem;',
      '  font-weight: 700;',
      '  line-height: 1;',
      '  white-space: nowrap;',
      '  background: #b53507;',
      '  color: #fff;',
      '  border-radius: 4px;',
      '  font-family: \'Open Sans\', sans-serif;',
      '  cursor: help;',
      '  vertical-align: middle;',
      '}',

      /* CSS-only tooltip */
      '[data-oax-tooltip] { position: relative; }',
      '[data-oax-tooltip]::after {',
      '  content: attr(data-oax-tooltip);',
      '  position: absolute;',
      '  bottom: calc(100% + 8px);',
      '  left: 50%;',
      '  transform: translateX(-50%);',
      '  background: #2e2b2a;',
      '  color: #fff;',
      '  font-size: 0.75rem;',
      '  line-height: 1.5;',
      '  padding: 8px 12px;',
      '  border-radius: 4px;',
      '  width: 260px;',
      '  white-space: normal;',
      '  z-index: 200;',
      '  opacity: 0;',
      '  pointer-events: none;',
      '  transition: none;',
      '  box-shadow: 0 3px 10px rgba(0,0,0,0.3);',
      '  font-weight: 400;',
      '  text-align: left;',
      '  font-family: \'Open Sans\', sans-serif;',
      '}',
      '[data-oax-tooltip]::before {',
      '  content: \'\';',
      '  position: absolute;',
      '  bottom: calc(100% + 2px);',
      '  left: 50%;',
      '  transform: translateX(-50%);',
      '  border: 5px solid transparent;',
      '  border-top-color: #2e2b2a;',
      '  opacity: 0;',
      '  pointer-events: none;',
      '  transition: none;',
      '}',
      '[data-oax-tooltip]:hover::after,',
      '[data-oax-tooltip]:focus::after  { opacity: 1; }',
      '[data-oax-tooltip]:hover::before,',
      '[data-oax-tooltip]:focus::before { opacity: 1; }',
      '[data-oax-tooltip]:focus-visible {',
      '  outline: 3px solid #005fcc;',
      '  outline-offset: 2px;',
      '  border-radius: 2px;',
      '}',
      '@media (prefers-reduced-motion: no-preference) {',
      '  [data-oax-tooltip]::after,',
      '  [data-oax-tooltip]::before { transition: opacity 0.15s; }',
      '}',

      /* Brand mark */
      '.oax-brand {',
      '  font-size: 0.6875rem;',
      '  font-weight: 700;',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.1em;',
      '  color: #2e2b2a;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 5px;',
      '}',
      '.oax-brand-dot {',
      '  width: 8px;',
      '  height: 8px;',
      '  border-radius: 50%;',
      '  background: #d73f09;',
      '  flex-shrink: 0;',
      '}',

      /* Madrone focus rings */
      '.openalex-pub-badge a:focus-visible,',
      '.openalex-pub-badge button:focus-visible,',
      '.openalex-list-badge a:focus-visible,',
      '.openalex-author-panel a:focus-visible,',
      '.openalex-author-panel button:focus-visible {',
      '  outline: 3px solid #005fcc;',
      '  outline-offset: 2px;',
      '  border-radius: 2px;',
      '}',

      /* List mini-badge Madrone */
      '.openalex-list-badge--madrone {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 4px;',
      '  margin-left: 6px;',
      '  vertical-align: middle;',
      '  flex-wrap: wrap;',
      '}',

      /* Pub badge Card A */
      '.oax-madrone-card {',
      '  background: #fff;',
      '  border: 1px solid #e9e5e4;',
      '  border-radius: 4px;',
      '  box-shadow: 0 2px 3px hsl(0 0% 0% / 0.25);',
      '  font-family: \'Open Sans\', sans-serif;',
      '  width: 100%;',
      '}',
      '.oax-mc__stripe { height: 4px; background: #d73f09; border-radius: 4px 4px 0 0; }',
      '.oax-mc__body { padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }',
      '.oax-mc__header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }',
      '.oax-mc__primary-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; flex-wrap: wrap; }',
      '.oax-mc__primary { font-size: 1.75rem; font-weight: 700; color: #2e2b2a; line-height: 1; }',
      '.oax-mc__primary-sub { font-size: 0.6875rem; color: #595959; margin-top: 2px; }',
      '.oax-mc__metrics { display: flex; gap: 16px; align-items: flex-start; }',
      '.oax-mc__metric { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 2px; }',
      '.oax-mc__metric-val { font-size: 1.125rem; font-weight: 700; color: #2e2b2a; line-height: 1; }',
      '.oax-mc__metric-lbl { font-size: 0.6875rem; color: #595959; text-transform: uppercase; letter-spacing: 0.04em; }',
      '.oax-mc__divider { border: none; border-top: 1px solid #e9e5e4; }',
      '.oax-mc__footer { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }',
      '.oax-mc__oa {',
      '  display: inline-flex; align-items: center; gap: 5px;',
      '  background: #fef2ed; border: 1px solid #f0b99e;',
      '  border-radius: 1.5rem; padding: 4px 10px 4px 7px;',
      '  font-size: 0.6875rem; font-weight: 600; color: #b53507;',
      '  align-self: flex-start; cursor: help;',
      '}',
      '.oax-mc__oa-dot { width: 8px; height: 8px; border-radius: 50%; background: #d73f09; flex-shrink: 0; }',
      '.oax-mc__tag {',
      '  background: #f7f5f5; color: #423e3c;',
      '  border-radius: 1.5rem; padding: 3px 10px;',
      '  font-size: 0.6875rem; border: 1px solid #d4cfcd;',
      '}',
      '.oax-mc__link {',
      '  font-size: 0.6875rem; color: #006a8e;',
      '  text-decoration: underline; text-underline-offset: 2px;',
      '  font-weight: 600; margin-left: auto; white-space: nowrap;',
      '  min-height: 24px; display: inline-flex; align-items: center;',
      '}',

      /* Pub badge Strip B */
      '.oax-madrone-strip {',
      '  border-left: 4px solid #d73f09; padding: 10px 14px;',
      '  background: #f7f5f5; display: flex; align-items: center;',
      '  gap: 14px; flex-wrap: wrap; font-family: \'Open Sans\', sans-serif; width: 100%;',
      '}',
      '.oax-ms__vdivider { width: 1px; height: 30px; background: #d4cfcd; flex-shrink: 0; }',
      '.oax-ms__stat { text-align: center; }',
      '.oax-ms__stat-val { font-size: 1rem; font-weight: 700; color: #2e2b2a; line-height: 1; }',
      '.oax-ms__stat-lbl { font-size: 0.6875rem; color: #595959; text-transform: uppercase; letter-spacing: 0.04em; }',
      '.oax-ms__oa-tag {',
      '  font-size: 0.6875rem; font-weight: 600; color: #4a773c;',
      '  background: #edf3e3; border-radius: 1.5rem; padding: 4px 11px;',
      '  border: 1px solid #c5d9b5; white-space: nowrap; cursor: help;',
      '}',
      '.oax-ms__link {',
      '  font-size: 0.6875rem; color: #006a8e; text-decoration: underline;',
      '  text-underline-offset: 2px; margin-left: auto; white-space: nowrap;',
      '  font-weight: 600; min-height: 24px; display: inline-flex; align-items: center;',
      '}',

      /* Pub badge Bold C */
      '.oax-madrone-bold {',
      '  font-family: \'Open Sans\', sans-serif; border: 1px solid #e9e5e4;',
      '  border-radius: 4px; box-shadow: 0 2px 3px hsl(0 0% 0% / 0.25); width: 100%;',
      '}',
      '.oax-mb__header {',
      '  background: #d73f09; padding: 10px 14px;',
      '  display: flex; align-items: center; justify-content: space-between;',
      '  flex-wrap: wrap; gap: 8px; border-radius: 4px 4px 0 0;',
      '}',
      '.oax-mb__brand { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #fff; }',
      '.oax-mb__header-right { text-align: right; }',
      '.oax-mb__percentile { font-size: 1.375rem; font-weight: 700; color: #fff; line-height: 1; }',
      '.oax-mb__percentile-sub { font-size: 0.6875rem; color: #fff; }',
      '.oax-mb__body {',
      '  padding: 10px 14px; background: #fff;',
      '  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;',
      '  border-radius: 0 0 4px 4px;',
      '}',
      '.oax-mb__metrics { display: flex; gap: 16px; align-items: center; }',
      '.oax-mb__metric { text-align: center; }',
      '.oax-mb__metric-val { font-size: 1rem; font-weight: 700; color: #2e2b2a; line-height: 1; }',
      '.oax-mb__metric-lbl { font-size: 0.6875rem; color: #595959; text-transform: uppercase; letter-spacing: 0.04em; }',
      '.oax-mb__vdivider { width: 1px; height: 28px; background: #e9e5e4; flex-shrink: 0; }',
      '.oax-mb__oa { display: flex; align-items: center; gap: 6px; }',
      '.oax-mb__oa-dot { width: 9px; height: 9px; border-radius: 50%; background: #4a773c; flex-shrink: 0; }',
      '.oax-mb__oa-label { font-size: 0.6875rem; color: #423e3c; }',
      '.oax-mb__link {',
      '  font-size: 0.6875rem; color: #006a8e; text-decoration: underline;',
      '  text-underline-offset: 2px; font-weight: 600; margin-left: auto;',
      '  white-space: nowrap; min-height: 24px; display: inline-flex; align-items: center;',
      '}',

      /* Author panel Card A */
      '.oax-ap-card {',
      '  background: #fff; border: 1px solid #e9e5e4;',
      '  border-radius: 4px; box-shadow: 0 2px 3px hsl(0 0% 0% / 0.25);',
      '  font-family: \'Open Sans\', sans-serif; width: 100%;',
      '}',
      '.oax-ap-card__stripe { height: 4px; background: #d73f09; border-radius: 4px 4px 0 0; }',
      '.oax-ap-card__body { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }',
      '.oax-ap-card__header { display: flex; align-items: center; justify-content: space-between; }',
      '.oax-ap-card__name { font-size: 1.125rem; font-weight: 700; color: #2e2b2a; line-height: 1.2; }',
      '.oax-ap-card__stats { display: flex; border: 1px solid #e9e5e4; border-radius: 4px; overflow: hidden; }',
      '.oax-ap-card__stat { flex: 1; text-align: center; padding: 7px 4px; border-right: 1px solid #e9e5e4; }',
      '.oax-ap-card__stat:last-child { border-right: none; }',
      '.oax-ap-card__stat-val { font-size: 1.0625rem; font-weight: 700; color: #2e2b2a; line-height: 1; }',
      '.oax-ap-card__stat-lbl { font-size: 0.625rem; color: #595959; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }',
      '.oax-ap-card__works-heading { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #595959; margin-bottom: 5px; }',
      '.oax-ap-card__works { display: flex; flex-direction: column; gap: 5px; }',
      '.oax-ap-card__work { font-size: 0.75rem; line-height: 1.4; padding: 5px 8px; background: #f7f5f5; border-radius: 3px; border-left: 3px solid #d4cfcd; }',
      '.oax-ap-card__work-meta { color: #595959; font-size: 0.6875rem; margin-top: 1px; }',
      '.oax-ap-card__work a { color: #423e3c; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; }',
      '.oax-ap-card__link { font-size: 0.6875rem; color: #006a8e; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; align-self: flex-start; min-height: 24px; display: inline-flex; align-items: center; }',

      /* Author panel Strip B */
      '.oax-ap-strip { border-left: 4px solid #d73f09; background: #f7f5f5; font-family: \'Open Sans\', sans-serif; width: 100%; }',
      '.oax-ap-strip__top { padding: 10px 14px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }',
      '.oax-ap-strip__vdivider { width: 1px; height: 34px; background: #d4cfcd; flex-shrink: 0; }',
      '.oax-ap-strip__name { font-size: 0.875rem; font-weight: 700; color: #2e2b2a; }',
      '.oax-ap-strip__stat { text-align: center; }',
      '.oax-ap-strip__stat-val { font-size: 0.9375rem; font-weight: 700; color: #2e2b2a; line-height: 1; }',
      '.oax-ap-strip__stat-lbl { font-size: 0.625rem; color: #595959; text-transform: uppercase; letter-spacing: 0.04em; }',
      '.oax-ap-strip__works { border-top: 1px solid #e9e5e4; padding: 7px 14px; display: flex; flex-direction: column; gap: 3px; }',
      '.oax-ap-strip__work { font-size: 0.75rem; line-height: 1.4; display: flex; gap: 8px; align-items: baseline; }',
      '.oax-ap-strip__work-year { font-size: 0.6875rem; color: #595959; flex-shrink: 0; min-width: 32px; }',
      '.oax-ap-strip__work-meta { font-size: 0.625rem; color: #595959; margin-top: 1px; }',
      '.oax-ap-strip__work a { color: #423e3c; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; }',
      '.oax-ap-strip__footer { border-top: 1px solid #e9e5e4; padding: 6px 14px; display: flex; gap: 12px; flex-wrap: wrap; }',
      '.oax-ap-strip__footer a { color: #006a8e; text-decoration: underline; text-underline-offset: 2px; font-size: 0.75rem; font-weight: 600; min-height: 24px; display: inline-flex; align-items: center; }',
      '.oax-ap-strip__link { color: #006a8e; text-decoration: underline; text-underline-offset: 2px; font-size: 0.75rem; font-weight: 600; min-height: 24px; display: inline-flex; align-items: center; }',

      /* Author panel Bold C */
      '.oax-ap-bold { font-family: \'Open Sans\', sans-serif; border: 1px solid #e9e5e4; border-radius: 4px; box-shadow: 0 2px 3px hsl(0 0% 0% / 0.25); width: 100%; }',
      '.oax-ap-bold__header { background: #d73f09; padding: 10px 14px; border-radius: 4px 4px 0 0; }',
      '.oax-ap-bold__brand { font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #fff; margin-bottom: 3px; }',
      '.oax-ap-bold__name { font-size: 1.25rem; font-weight: 700; color: #fff; line-height: 1.2; }',
      '.oax-ap-bold__body { padding: 12px 14px; background: #fff; border-radius: 0 0 4px 4px; display: flex; flex-direction: column; gap: 10px; }',
      '.oax-ap-bold__stats { display: flex; gap: 18px; flex-wrap: wrap; }',
      '.oax-ap-bold__stat { text-align: center; }',
      '.oax-ap-bold__stat-val { font-size: 1.125rem; font-weight: 700; color: #2e2b2a; line-height: 1; }',
      '.oax-ap-bold__stat-lbl { font-size: 0.625rem; color: #595959; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }',
      '.oax-ap-bold__divider { border: none; border-top: 1px solid #e9e5e4; }',
      '.oax-ap-bold__works-heading { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #595959; margin-bottom: 5px; }',
      '.oax-ap-bold__works { display: flex; flex-direction: column; }',
      '.oax-ap-bold__work { font-size: 0.75rem; line-height: 1.4; padding: 5px 0; border-bottom: 1px solid #e9e5e4; }',
      '.oax-ap-bold__work:last-child { border-bottom: none; }',
      '.oax-ap-bold__work-meta { color: #595959; font-size: 0.6875rem; margin-top: 1px; }',
      '.oax-ap-bold__work a { color: #423e3c; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; }',
      '.oax-ap-bold__link { font-size: 0.6875rem; color: #006a8e; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; align-self: flex-start; min-height: 24px; display: inline-flex; align-items: center; }',

      /* Responsive */
      '@media (max-width: 600px) {',
      '  .oax-madrone-strip { flex-direction: column; align-items: flex-start; gap: 8px; }',
      '  .oax-ms__vdivider { display: none; }',
      '  .oax-ms__link { margin-left: 0; }',
      '  .oax-mb__body { flex-direction: column; align-items: flex-start; }',
      '  .oax-mb__vdivider { display: none; }',
      '  .oax-mb__link { margin-left: 0; }',
      '  .oax-ap-strip__top { flex-direction: column; align-items: flex-start; gap: 8px; }',
      '  .oax-ap-strip__vdivider { display: none; }',
      '  [data-oax-tooltip]::after { left: 0; transform: none; width: 220px; }',
      '  [data-oax-tooltip]::before { left: 14px; transform: none; }',
      '}'

    ].join('\n');

    document.head.appendChild(style);
  }

  // ─── API Helpers ──────────────────────────────────────────────────────────
  function buildUrl(path, params) {
    var base = CONFIG.API_BASE + path;
    var p = params || {};
    p.mailto = CONFIG.MAILTO;
    var qs = Object.keys(p).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(p[k]);
    }).join('&');
    return base + (base.indexOf('?') === -1 ? '?' : '&') + qs;
  }

  // Batch URL skips encodeURIComponent on filter/select to preserve | and / in DOIs
  function buildBatchUrl(dois) {
    return CONFIG.API_BASE + '/works'
      + '?filter=doi:' + dois.join('|')
      + '&select=doi,cited_by_count,open_access,cited_by_percentile_year,fwci,id'
      + '&per-page=25'
      + '&mailto=' + encodeURIComponent(CONFIG.MAILTO);
  }

  function fetchJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) return Promise.reject(r.status);
      return r.json();
    });
  }

  function normalizeDoi(doi) {
    return doi.replace(/^https?:\/\/doi\.org\//i, '').trim().toLowerCase();
  }

  function hideElement(el) {
    el.style.display = 'none';
  }

  function log(msg) {
    // eslint-disable-next-line no-console
    console.log(CONFIG.LOG_PREFIX + ' ' + msg);
  }

  function formatNumber(n) {
    return n.toLocaleString();
  }

  // ─── Safe DOM builder — never use innerHTML with API data ─────────────────
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'textContent') {
        node.textContent = attrs[k];
      } else if (k === 'className') {
        node.className = attrs[k];
      } else {
        node.setAttribute(k, attrs[k]);
      }
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  // ─── Shared: Skeleton loader ──────────────────────────────────────────────
  function renderSkeleton(container) {
    container.setAttribute('aria-label', 'Loading OpenAlex metrics');
    container.setAttribute('aria-busy', 'true');
    var skel = el('div', { className: 'oax-skeleton', 'aria-hidden': 'true' }, [
      el('div', { className: 'oax-skeleton__line oax-skeleton__line--short' }),
      el('div', { className: 'oax-skeleton__line' }),
      el('div', { className: 'oax-skeleton__line oax-skeleton__line--short' })
    ]);
    container.appendChild(skel);
  }

  function clearContainer(container) {
    while (container.firstChild) container.removeChild(container.firstChild);
    container.removeAttribute('aria-busy');
  }

  // ─── Shared: Brand header ─────────────────────────────────────────────────
  function buildBrandHeader() {
    return el('div', { className: 'oax-badge__header' }, [
      el('span', {
        className: 'oax-badge__brand',
        'aria-hidden': 'true',
        textContent: 'OpenAlex'
      })
    ]);
  }

  // ─── Widget 1: Publication Page Badge ─────────────────────────────────────
  function initPubBadge(container) {
    if (container.hasAttribute(CONFIG.INSTALLED_ATTR)) return;
    container.setAttribute(CONFIG.INSTALLED_ATTR, '1');

    var doi = normalizeDoi(container.getAttribute('data-doi') || '');
    if (!doi) { hideElement(container); return; }

    renderSkeleton(container);

    fetchJSON(buildUrl('/works/doi:' + doi))
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
      .catch(function (status) {
        log('Publication badge failed for ' + doi + ' (status: ' + status + ')');
        hideElement(container);
      });
  }

  function renderPubBadge(container, data) {
    var oaStatus = (data.open_access && data.open_access.oa_status) || 'closed';
    var oaCfg = CONFIG.OA_STATUS[oaStatus] || CONFIG.OA_STATUS.closed;
    var citations = data.cited_by_count || 0;
    var fwci = data.fwci;
    var percentile = data.cited_by_percentile_year;
    var keywords = (data.keywords || []).slice(0, 3);
    var funders = data.funders || [];
    var oaUrl = data.open_access && data.open_access.oa_url;
    var openAlexUrl = data.id || 'https://openalex.org';
    var isRetracted = !!data.is_retracted;
    var pubYear = data.publication_year || '';

    var badge = el('div', {
      className: 'oax-badge',
      role: 'region',
      'aria-label': 'OpenAlex metrics for this publication'
    });

    // Retraction warning — must be first and prominent
    if (isRetracted) {
      badge.appendChild(el('div', {
        className: 'oax-badge__retraction',
        role: 'alert',
        textContent: '⚠ This article has been retracted'
      }));
    }

    badge.appendChild(buildBrandHeader());

    // Primary metric: percentile (only shown when ≥ 75th)
    if (percentile && percentile.min >= 75) {
      var topPct = 100 - percentile.min;
      badge.appendChild(el('div', { className: 'oax-badge__primary' }, [
        el('span', {
          className: 'oax-badge__percentile-value',
          'aria-label': 'Top ' + topPct + ' percent of publications from ' + pubYear,
          textContent: 'Top ' + topPct + '%'
        }),
        el('span', {
          className: 'oax-badge__percentile-label',
          'aria-hidden': 'true',
          textContent: 'in ' + pubYear
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
        title: 'Field-Weighted Citation Impact — compares this paper\'s citation rate to the global average for similar works. 1.0 = world average.',
        'aria-label': 'Field-Weighted Citation Impact: ' + fwci.toFixed(2) + '. 1.0 equals world average.'
      }, [
        el('span', { className: 'oax-metric__value', 'aria-hidden': 'true',
          textContent: fwci.toFixed(2) }),
        el('span', { className: 'oax-metric__label', 'aria-hidden': 'true',
          textContent: 'FWCI' })
      ]));
    }
    badge.appendChild(metricsRow);

    // Open access status
    var oaRow = el('div', { className: 'oax-badge__oa' });
    oaRow.appendChild(el('span', {
      className: 'oax-oa-dot oax-oa-dot--' + oaStatus,
      role: 'img',
      'aria-label': oaCfg.label
    }));
    oaRow.appendChild(el('span', {
      className: 'oax-badge__oa-label',
      'aria-hidden': 'true',
      textContent: oaCfg.label
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

    // Keywords / topics
    if (keywords.length > 0) {
      var tagsWrap = el('div', {
        className: 'oax-badge__tags',
        'aria-label': 'Research topics'
      });
      keywords.forEach(function (kw) {
        tagsWrap.appendChild(el('span', {
          className: 'oax-tag',
          textContent: kw.display_name
        }));
      });
      badge.appendChild(tagsWrap);
    }

    // Funder (first only)
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
        'aria-label': 'Top ' + topPct + ' percent in ' + pubYear,
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
    body.appendChild(el('div', {
      className: 'oax-mb__oa',
      role: 'img',
      tabindex: '0',
      'aria-label': oa.label,
      'data-oax-tooltip': oa.tooltip
    }, [
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

  // ─── Widget 2: Publication List Mini Badge (batch API) ────────────────────
  function initListBadges(elements) {
    var doiToElements = {};

    Array.prototype.forEach.call(elements, function (container) {
      if (container.hasAttribute(CONFIG.INSTALLED_ATTR)) return;
      container.setAttribute(CONFIG.INSTALLED_ATTR, '1');
      var doi = normalizeDoi(container.getAttribute('data-doi') || '');
      if (!doi) return;
      if (!doiToElements[doi]) doiToElements[doi] = [];
      doiToElements[doi].push(container);
    });

    var allDois = Object.keys(doiToElements);
    if (!allDois.length) return;

    // Chunk into batches of 25 to stay within API limits
    var chunkSize = 25;
    for (var i = 0; i < allDois.length; i += chunkSize) {
      fetchBatchDois(allDois.slice(i, i + chunkSize), doiToElements);
    }
  }

  function fetchBatchDois(dois, doiToElements) {
    fetchJSON(buildBatchUrl(dois))
      .then(function (data) {
        (data.results || []).forEach(function (work) {
          var doi = normalizeDoi(work.doi || '');
          (doiToElements[doi] || []).forEach(function (container) {
            renderListBadge(container, work);
          });
        });
      })
      .catch(function (err) {
        log('Batch fetch failed: ' + err);
        // Silent failure — elements remain empty
      });
  }

  function renderListBadge(container, work) {
    if (container.classList.contains('openalex-list-badge--madrone')) {
      renderMadroneListBadge(container, work);
      return;
    }
    var citations = work.cited_by_count || 0;
    var oaStatus = (work.open_access && work.open_access.oa_status) || 'closed';
    var oaCfg = CONFIG.OA_STATUS[oaStatus] || CONFIG.OA_STATUS.closed;
    var openAlexUrl = work.id || 'https://openalex.org';

    var percentile = work.cited_by_percentile_year;
    var pctSuffix = (percentile && percentile.min >= 75)
      ? ', Top ' + (100 - percentile.min) + '%'
      : '';

    container.setAttribute('aria-label',
      'OpenAlex: ' + citations + (citations === 1 ? ' citation' : ' citations') +
      ', ' + oaCfg.label + pctSuffix);

    var badge = el('span', { className: 'oax-mini-badge' });

    badge.appendChild(el('span', {
      className: 'oax-mini-dot oax-mini-dot--' + oaStatus,
      role: 'img',
      'aria-hidden': 'true',
      title: oaCfg.label
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

  function renderMadroneListBadge(container, work) {
    var oaStatus = (work.open_access && work.open_access.oa_status) || 'closed';
    var oa = oaMadrone(oaStatus);
    var citations = work.cited_by_count || 0;
    var fwci = work.fwci;

    container.setAttribute('aria-label',
      'OpenAlex: ' + oa.label + ', ' +
      formatNumber(citations) + (citations === 1 ? ' citation' : ' citations') +
      (shouldShowFwci(fwci) ? ', FWCI ' + fwci.toFixed(2) : ''));

    container.appendChild(el('span', {
      className: 'oax-oa-badge oax-oa-badge--' + oa.cssKey,
      'aria-hidden': 'true',
      textContent: oa.label
    }));

    container.appendChild(el('span', {
      className: 'oax-cite-badge',
      'aria-hidden': 'true',
      textContent: formatNumber(citations) + (citations === 1 ? ' citation' : ' citations')
    }));

    if (shouldShowFwci(fwci)) {
      container.appendChild(el('span', {
        className: 'oax-fwci-badge',
        'aria-hidden': 'true',
        textContent: 'FWCI ' + fwci.toFixed(2)
      }));
    }
  }

  // ─── Widget 3: Faculty Author Panel ──────────────────────────────────────
  function computeHIndex(sortedCounts) {
    var h = 0;
    for (var i = 0; i < sortedCounts.length; i++) {
      if (sortedCounts[i] >= i + 1) { h = i + 1; } else { break; }
    }
    return h;
  }

  function initAuthorPanel(container) {
    if (container.hasAttribute(CONFIG.INSTALLED_ATTR)) return;
    container.setAttribute(CONFIG.INSTALLED_ATTR, '1');

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
      fetchJSON(buildUrl('/authors', { filter: 'orcid:' + orcid })),
      fetchJSON(buildUrl('/works', {
        filter: 'author.orcid:' + orcid,
        sort: 'publication_date:desc',
        'per-page': '5',
        select: 'title,doi,publication_year,primary_location,open_access,cited_by_count,id'
      })),
      fetchJSON(buildUrl('/works', {
        filter: 'author.orcid:' + orcid,
        sort: 'cited_by_count:desc',
        'per-page': '100',
        select: 'cited_by_count'
      }))
    ]).then(function (results) {
      var authorData = results[0].results && results[0].results[0];
      var recentWorks = results[1].results || [];
      var hIndexWorks = results[2].results || [];

      if (!authorData) { hideElement(container); return; }

      clearContainer(container);
      var hIndex = computeHIndex(hIndexWorks.map(function (w) {
        return w.cited_by_count || 0;
      }));
      renderAuthorPanel(container, authorData, recentWorks, hIndex);
    }).catch(function (err) {
      log('Author panel failed for ORCID ' + orcid + ': ' + err);
      hideElement(container);
    });
  }

  function renderAuthorPanel(container, author, recentWorks, hIndex) {
    var authorUrl = author.id || 'https://openalex.org';
    var totalWorks = author.works_count || 0;
    var totalCitations = author.cited_by_count || 0;
    var topics = (author.topics || []).slice(0, 5);

    var panel = el('div', {
      className: 'oax-author-panel',
      role: 'region',
      'aria-label': 'OpenAlex research profile'
    });

    // Header: brand + author name
    panel.appendChild(el('div', { className: 'oax-author-panel__header' }, [
      el('span', {
        className: 'oax-badge__brand',
        'aria-hidden': 'true',
        textContent: 'OpenAlex'
      }),
      el('span', {
        className: 'oax-author-panel__name',
        textContent: author.display_name || ''
      })
    ]));

    // Stats row: Works, Citations, h-index
    var statsRow = el('div', { className: 'oax-author-panel__stats' });

    statsRow.appendChild(el('div', {
      className: 'oax-stat',
      'aria-label': formatNumber(totalWorks) + ' publications indexed in OpenAlex'
    }, [
      el('span', { className: 'oax-stat__value', 'aria-hidden': 'true',
        textContent: formatNumber(totalWorks) }),
      el('span', { className: 'oax-stat__label', 'aria-hidden': 'true',
        textContent: 'Works' })
    ]));

    statsRow.appendChild(el('div', {
      className: 'oax-stat',
      'aria-label': formatNumber(totalCitations) + ' total citations in OpenAlex'
    }, [
      el('span', { className: 'oax-stat__value', 'aria-hidden': 'true',
        textContent: formatNumber(totalCitations) }),
      el('span', { className: 'oax-stat__label', 'aria-hidden': 'true',
        textContent: 'Citations' })
    ]));

    statsRow.appendChild(el('div', {
      className: 'oax-stat',
      title: 'h-index as indexed in OpenAlex. May differ from Scopus or Web of Science due to coverage differences.',
      'aria-label': 'h-index ' + hIndex + ' as indexed in OpenAlex'
    }, [
      el('span', { className: 'oax-stat__value', 'aria-hidden': 'true',
        textContent: String(hIndex) }),
      el('span', { className: 'oax-stat__label', 'aria-hidden': 'true',
        textContent: 'h-index*' })
    ]));

    panel.appendChild(statsRow);

    // Recent publications
    if (recentWorks.length > 0) {
      var pubSection = el('div', {});
      pubSection.appendChild(el('div', {
        className: 'oax-section-title',
        'aria-hidden': 'true',
        textContent: 'Recent Publications'
      }));

      var pubList = el('ol', {
        className: 'oax-pub-list',
        'aria-label': 'Recent publications'
      });

      recentWorks.forEach(function (work) {
        var workUrl = work.doi
          ? 'https://doi.org/' + normalizeDoi(work.doi)
          : (work.id || 'https://openalex.org');

        var oaStatus = (work.open_access && work.open_access.oa_status) || 'closed';
        var oaCfg = CONFIG.OA_STATUS[oaStatus] || CONFIG.OA_STATUS.closed;
        var cites = work.cited_by_count || 0;
        var journal = work.primary_location &&
          work.primary_location.source &&
          work.primary_location.source.display_name;

        var metaParts = [];
        if (work.publication_year) metaParts.push(String(work.publication_year));
        if (journal) metaParts.push(journal);

        var listItem = el('li', {});

        listItem.appendChild(el('a', {
          href: workUrl,
          className: 'oax-pub-item__title',
          target: '_blank',
          rel: 'noopener noreferrer',
          'aria-label': (work.title || 'Untitled') + ' (opens in new tab)',
          textContent: work.title || 'Untitled'
        }));

        var meta = el('div', { className: 'oax-pub-item__meta' });

        if (metaParts.length) {
          meta.appendChild(el('span', { textContent: metaParts.join(' · ') }));
        }

        meta.appendChild(el('span', {
          className: 'oax-mini-dot oax-mini-dot--' + oaStatus,
          role: 'img',
          'aria-label': oaCfg.label,
          title: oaCfg.label
        }));

        meta.appendChild(el('span', {
          'aria-label': cites + (cites === 1 ? ' citation' : ' citations'),
          textContent: cites + (cites === 1 ? ' citation' : ' citations')
        }));

        listItem.appendChild(meta);
        pubList.appendChild(listItem);
      });

      pubSection.appendChild(pubList);
      panel.appendChild(pubSection);
    }

    // Top research topics
    if (topics.length > 0) {
      var topicSection = el('div', {});
      topicSection.appendChild(el('div', {
        className: 'oax-section-title',
        'aria-hidden': 'true',
        textContent: 'Research Topics'
      }));

      var tagsWrap = el('div', {
        className: 'oax-badge__tags',
        'aria-label': 'Research topics'
      });
      topics.forEach(function (t) {
        tagsWrap.appendChild(el('span', {
          className: 'oax-tag',
          textContent: t.display_name || ''
        }));
      });

      topicSection.appendChild(tagsWrap);
      panel.appendChild(topicSection);
    }

    // h-index disclosure
    panel.appendChild(el('p', {
      className: 'oax-footnote',
      textContent: '*h-index computed from OpenAlex data. May differ from Scopus or Web of Science.'
    }));

    // Footer link to full OpenAlex profile
    panel.appendChild(el('a', {
      href: authorUrl,
      className: 'oax-badge__link',
      target: '_blank',
      rel: 'noopener noreferrer',
      'aria-label': 'View full author profile on OpenAlex (opens in new tab)',
      textContent: 'View full profile on OpenAlex ↗'
    }));

    container.appendChild(panel);
  }

  function initMadroneAuthorPanel(container, orcid) {
    var pubMode = (container.getAttribute('data-pub-mode') || 'recent').toLowerCase();

    var fetches = [
      fetchJSON(buildUrl('/authors', {
        filter: 'orcid:' + orcid,
        select: 'id,display_name,works_count,cited_by_count,summary_stats'
      }))
    ];

    if (pubMode === 'recent') {
      fetches.push(fetchJSON(buildUrl('/works', {
        filter: 'author.orcid:' + orcid,
        sort: 'publication_date:desc',
        'per-page': '3',
        select: 'id,title,doi,publication_year,primary_location'
      })));
    } else if (pubMode === 'cited') {
      fetches.push(fetchJSON(buildUrl('/works', {
        filter: 'author.orcid:' + orcid,
        sort: 'cited_by_count:desc',
        'per-page': '3',
        select: 'id,title,doi,publication_year,cited_by_count,primary_location'
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
      { val: formatNumber(author.works_count || 0), lbl: 'Works', tip: null,
        aria: formatNumber(author.works_count || 0) + ' publications' },
      { val: formatNumber(author.cited_by_count || 0), lbl: 'Citations', tip: null,
        aria: formatNumber(author.cited_by_count || 0) + ' total citations' },
      { val: String(hIndex), lbl: 'h-index', aria: 'h-index ' + hIndex,
        tip: 'h-index from OpenAlex. May differ from Scopus or WoS.' },
      { val: fwci !== null ? fwci.toFixed(2) : '—', lbl: 'FWCI',
        aria: 'FWCI ' + (fwci !== null ? fwci.toFixed(2) : 'not available'),
        tip: 'FWCI: 2-year citation rate vs. world average. 1.0 = average.' }
    ].forEach(function (s) {
      top.appendChild(el('div', { className: 'oax-ap-strip__vdivider', 'aria-hidden': 'true' }));
      var attrs = { className: 'oax-ap-strip__stat', 'aria-label': s.aria };
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
      href: authorUrl, className: 'oax-ap-strip__link', target: '_blank', rel: 'noopener noreferrer',
      'aria-label': 'View full profile on OpenAlex', textContent: 'View on OpenAlex'
    }));
    strip.appendChild(footer);
    container.appendChild(strip);
  }

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
      { val: formatNumber(author.works_count || 0), lbl: 'Works', tip: null,
        aria: formatNumber(author.works_count || 0) + ' publications' },
      { val: formatNumber(author.cited_by_count || 0), lbl: 'Citations', tip: null,
        aria: formatNumber(author.cited_by_count || 0) + ' total citations' },
      { val: String(hIndex), lbl: 'h-index', aria: 'h-index ' + hIndex,
        tip: 'h-index from OpenAlex. May differ from Scopus or Web of Science.' },
      { val: fwci !== null ? fwci.toFixed(2) : '—', lbl: 'FWCI',
        aria: 'FWCI ' + (fwci !== null ? fwci.toFixed(2) : 'not available'),
        tip: 'FWCI: 2-year citation rate vs. world average. 1.0 = average.' }
    ].forEach(function (s) {
      var attrs = { className: 'oax-ap-bold__stat', 'aria-label': s.aria };
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

  // ─── Entry Point ──────────────────────────────────────────────────────────
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

  // Expose for re-triggering after Drupal AJAX loads new content
  window.OAWidgets = {
    init: init,
    _test: {
      shouldShowFwci: shouldShowFwci,
      reconstructAbstract: reconstructAbstract,
      oaMadrone: oaMadrone
    }
  };

})();
