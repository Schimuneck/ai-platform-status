# AI Platform Status

Public status site for Red Hat OpenShift AI components. Shows container image
builds from [Quay](https://quay.io/organization/opendatahub), CI results from
GitHub Actions, install commands, and documentation links.

The site is a single-page app with a persistent sidebar listing every product.
Adding a new product means adding an entry to `products.json` and running sync.

## Quick start

```bash
python3 sync.py          # fetch latest tags and workflow runs
python3 -m http.server 8787   # open http://localhost:8787
```

## How it works

| File              | Purpose |
|---|---|
| `products.json`   | Product catalog — names, docs, install commands, image repos, workflows |
| `sync.py`         | Reads public Quay and GitHub APIs, writes `data/status.json` |
| `index.html`      | Shell: sidebar + content area |
| `app.js`          | Fetches catalog + status, renders the selected product |
| `styles.css`      | Layout and design tokens |

## Data sources

Only public APIs — no credentials stored, no OAuth proxy, no private registries.

- **Quay tags**: `https://quay.io/api/v1/repository/{ns}/{name}/tag/`
- **GitHub Actions**: workflow index + latest run per workflow
- **GitHub token**: `gh auth token` (optional, raises rate limit)

`quay.io/rhoai` and Konflux data stay off this site until those results are public.

## Adding a product

1. Add an object to `products.json` → `products[]`.
2. Run `python3 sync.py`.
3. Open the site — the new product appears in the sidebar.

Required fields: `key`, `name`. Everything else (images, workflows, docs,
downloads) is optional but makes the page useful.

## Tests

```bash
python3 -m unittest discover tests/ -v
```
