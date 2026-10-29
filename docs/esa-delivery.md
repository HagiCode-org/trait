# ESA delivery checklist

The repository builds the site and sets the `esa.jsonc` build and asset fields. Caching, compression and response headers are set in the ESA console. The repository cannot apply them, so each item below is an **ESA console setting**, not a repository setting.

Replace `trait.hagicode.com` with the deployed host. Each check is a `curl` against a deployed URL.

## Operator checklist

| # | Paths | Setting (ESA console) | Expected response | Check |
|---|---|---|---|---|
| 1 | `/_astro/*` | Immutable caching. These files carry content hashes in their names. | `cache-control: public, max-age=31536000, immutable` | `curl -sI https://trait.hagicode.com/_astro/<any>.js \| grep -i cache-control` |
| 2 | `/data/search/*` | Immutable caching. Shard URLs contain a content hash, so a changed shard gets a new URL. | `cache-control: public, max-age=31536000, immutable` | `curl -sI https://trait.hagicode.com/data/search/en.<hash>.json \| grep -i cache-control` |
| 3 | HTML routes: `/`, `/agents/`, `/agents/<id>/`, `/agents/<id>/<lang>/` | Short caching or revalidation. A new sync changes these pages without changing their URLs. | `cache-control` with `max-age` of 300 seconds or less, or `no-cache` | `curl -sI https://trait.hagicode.com/agents/ \| grep -i cache-control` |
| 4 | `/data/agents/*` | Short caching or revalidation. These files are not hashed, and a sync rewrites them in place. | `cache-control` with `max-age` of 300 seconds or less, or `no-cache` | `curl -sI https://trait.hagicode.com/data/agents/a11y-architect.json \| grep -i cache-control` |
| 5 | HTML, JavaScript, CSS and JSON | Compression. Enable gzip, or Brotli where the edge supports it. | `content-encoding: br` or `gzip` when the client sends `Accept-Encoding` | `curl -sI -H 'Accept-Encoding: br, gzip' https://trait.hagicode.com/agents/ \| grep -i content-encoding` and the same for `/_astro/<any>.js` and `/data/search/en.<hash>.json` |

Check each of the first four rows with a `curl -I` on a URL the deploy actually serves. A check that returns the wrong header is an open item for the operator, not a repository bug.

## Asset not-found behaviour

`esa.jsonc` keeps `"notFoundStrategy": "singlePageApplication"`. The ESA build-pages documentation describes its two supported values as follows.

- `singlePageApplication` returns `index.html` with `200 OK`, and applies only to navigation requests.
- `404Page` returns `404.html` for navigation requests, and the documentation does not say `404.html` is required.

Neither value changes the response for a non-navigation request, such as a `<script>` tag or a dynamic `import()` for a missing `/_astro/*` file. So no supported value stops HTML from answering those requests, and `esa.jsonc` is left as it is.

Limitation: after a deploy, a browser that still holds an old HTML page can request hashed assets that no longer exist. The fix is operator-side: keep HTML on short caching (rows 3 and 4 above), so that stale HTML ages out quickly.

Check: `curl -sI https://trait.hagicode.com/_astro/does-not-exist.js` and record the status. The repository cannot change that response.

## Scope

- Nothing in this file changes the repository. Each row is applied in the ESA console.
- `docs/catalog-payload-sizes.md` records the byte sizes that these settings apply to.
