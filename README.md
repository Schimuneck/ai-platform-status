# AI platform status

Public page of image builds and test results. The sync job reads public Quay
repositories and public GitHub Actions only. OpenShell is the first product.

## Plan

1. **Catalog.** `products.json` lists each product, its public image
   repositories, and the public workflow names to show.
2. **Sync job.** `python3 sync.py` writes `data/status.json`. That file is
   generated and stays out of git.
3. **Page.** `index.html` renders the snapshot. Serve the repo root so the
   page can fetch `data/status.json`.
4. **Next.** Put the same files on the team cluster with no OAuth proxy, and
   run `sync.py` on a schedule. Add the next product by appending to
   `products.json`. Keep `quay.io/rhoai` and Konflux off this page until those
   results are public.

The OpenShell catalog uses workflows that have runs on
`opendatahub-io/openshell`. `Kubernetes E2E Test`, `Docker E2E Test`,
`Podman E2E Test`, `GPU E2E Test`, and `VM E2E Test` are reusable
`workflow_call` workflows, and `Branch E2E Checks` has not run there, so a
sync would only show "No runs" for them. Image builds on the page are the
public Quay tags (`odh-pr`, `odh-stable`, and the commit tags).

## Run locally

```bash
python3 -m unittest tests/test_sync.py
python3 sync.py
python3 -m http.server 8787
```

Open http://127.0.0.1:8787/

The sync job uses `gh auth token` when it is available, and otherwise calls
the public GitHub API without a token. Quay needs no token for the
repositories in the catalog.

## Add a product

Append an entry to `products.json` with a public `quay.io/...` repository and
a workflow `name` that exists on a public GitHub repo. Run `python3 sync.py`
again.
