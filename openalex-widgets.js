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
      '  font-size: 12px;',
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
      '  font-size: 11px;',
      '}',
      '.oax-badge__header {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 4px;',
      '}',
      '.oax-badge__brand {',
      '  font-size: 10px;',
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
      '  font-size: 20px;',
      '  font-weight: 700;',
      '  color: #DC4405;', /* OSU Beaver Orange */
      '  line-height: 1;',
      '}',
      '.oax-badge__percentile-label {',
      '  font-size: 11px;',
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
      '  font-size: 16px;',
      '  font-weight: 700;',
      '  color: #1a1a1a;',
      '  line-height: 1;',
      '}',
      '.oax-metric__label {',
      '  font-size: 10px;',
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
      '  font-size: 11px;',
      '  color: #444;',
      '}',
      '.oax-badge__pdf-link {',
      '  font-size: 11px;',
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
      '  font-size: 11px;',
      '  min-height: 24px;', /* WCAG 2.5.8 */
      '  display: inline-flex;',
      '  align-items: center;',
      '}',
      '.oax-badge__funder {',
      '  font-size: 11px;',
      '  color: #555;',
      '  display: flex;',
      '  align-items: flex-start;',
      '  gap: 4px;',
      '}',
      '.oax-badge__link {',
      '  margin-top: 4px;',
      '  font-size: 11px;',
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
      '  font-size: 12px;',
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
      '  font-size: 13px;',
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
      '  font-size: 14px;',
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
      '  font-size: 22px;',
      '  font-weight: 700;',
      '  color: #DC4405;',
      '  line-height: 1;',
      '}',
      '.oax-stat__label {',
      '  font-size: 10px;',
      '  color: #666;',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.04em;',
      '}',
      '.oax-section-title {',
      '  font-size: 10px;',
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
      '  font-size: 12px;',
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
      '  font-size: 11px;',
      '  color: #666;',
      '}',
      '.oax-footnote {',
      '  font-size: 10px;',
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
      tabindex: '0',
      'data-oax-tooltip': oa.tooltip,
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
        tabindex: '0',
        'data-oax-tooltip': 'Field-Weighted Citation Impact: ' + fwci.toFixed(2) +
          '. This paper is cited at ' + fwci.toFixed(1) + 'x the world average. 1.0 = world average.',
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
