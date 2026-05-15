# JS Injector Setup — OpenAlex Widgets

Admin path: **Configuration > Development > JS Injector**  
(`/admin/config/development/js_injector`)

---

## Step 1 — Get the jsDelivr URL

After creating a GitHub release tagged `v1.0.0`:

```
https://cdn.jsdelivr.net/gh/alancalvert/openalex-widgets@1.0.0/openalex-widgets.min.js
```

During development only (do not use in production — no cache, always latest):
```
https://cdn.jsdelivr.net/gh/alancalvert/openalex-widgets@latest/openalex-widgets.js
```

---

## Rule 1 — Publication detail pages

| Field | Value |
|-------|-------|
| Rule name | `OpenAlex widgets — publication pages` |
| Script URL | `https://cdn.jsdelivr.net/gh/alancalvert/openalex-widgets@1.0.0/openalex-widgets.min.js` |
| Page visibility | Pages matching the pattern: `/research/publications/*` |
| Script type | External |
| Load position | Footer (after body) |
| Async/Defer | Defer |

---

## Rule 2 — Publication list pages

| Field | Value |
|-------|-------|
| Rule name | `OpenAlex widgets — publication lists` |
| Script URL | Same as Rule 1 |
| Page visibility | Pages matching the pattern: `/research/*/publications` |
| Script type | External |
| Load position | Footer |
| Async/Defer | Defer |

---

## Rule 3 — Faculty profiles (Phase 3)

| Field | Value |
|-------|-------|
| Rule name | `OpenAlex widgets — faculty profiles` |
| Script URL | Same as Rule 1 |
| Page visibility | Pages matching the pattern: `/directory/*` *(confirm actual path)* |
| Script type | External |
| Load position | Footer |
| Async/Defer | Defer |

---

## Notes

- All three rules can point to the **same script URL**. On each page, the widget
  only activates for elements that actually exist in the DOM.
- The `async defer` combination means the script won't block page rendering.
- jsDelivr caches by version tag. After updating the script, create a new GitHub
  release (`v1.0.1`, etc.) and update the URL in JS Injector.
- To test before a release: use the `@latest` URL temporarily, but always switch
  to a pinned version tag for production.

---

## Verifying it works

1. Open a publication page, open DevTools > Console.
2. You should see no `[OpenAlex Widget]` error messages.
3. Open DevTools > Network, filter by `api.openalex.org` — you should see
   a successful fetch with status 200.
4. The badge should appear alongside the Dimensions and Altmetric badges.

### CSP check (do this first)

Before adding the JS Injector rule, open the browser console on any
`health.oregonstate.edu` page and run:

```javascript
fetch('https://api.openalex.org/works/doi:10.1093/aje/kwae120?mailto=alan.calvert@oregonstate.edu')
  .then(r => r.json())
  .then(data => console.log('CSP OK — citations:', data.cited_by_count))
  .catch(e => console.error('CSP BLOCKED:', e));
```

If you see `CSP BLOCKED`, the site's Content Security Policy is blocking
external fetches. You'll need to either:
- Ask OSU Web to add `api.openalex.org` to the `connect-src` CSP directive, or
- Set up a Cloudflare Worker proxy at a subdomain that IS whitelisted.
