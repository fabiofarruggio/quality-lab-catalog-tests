# Catalog reference regression

TASK-020 / REQ-TEST-001: **21 real HTTP checks and four real-browser checks** for the explicitly simulated Catalog squad. This consumer was generated outside the template repository and installs the common fixture library from its versioned, hash-recorded local tarball.

## Reproduce

Use Node **24.21.0**, npm **11.19.0**, and the sibling `quality-lab-app` repository. First install/build that application's pinned dependencies using its README. Then, from this repository:

```powershell
npm ci --ignore-scripts
npm run typecheck
npm run test:api
```

For browser checks, either run `npm run browser:install` to install the matching Chromium in the repository-local `node_modules/.cache/ms-playwright` cache, or explicitly select an installed Chrome/Edge channel supported by Playwright. The observed Windows run used:

```powershell
$env:AQP_BROWSER_CHANNEL = 'chrome'
npm run verify:local
```

`verify:local` repeats clean installation, typecheck and all checks, then captures logs, JSON results, an actual browser screenshot, source hashes and limitations in a fresh `evidence/<UTC-run-id>/` directory. The application must be built and stable before starting. The fixture launches a separate local HTTP process and a fresh in-memory store **for every test**, uses only synthetic accounts and terminates each child in teardown. No shared mutable server or real customer data is used.

## What the checks prove

Authentication and authorization, seed values, positive integer prices, version increments, discount thresholds 9999/10000/10001, quantity boundaries/negatives, inactive items, stale quotes, client-total rejection, idempotent confirmation, and corresponding UI journeys. The shared `@aqp/qa-framework-template` library remains installed code, not a copied fixture fork.

`catalog/business-contract.json` states original laboratory criteria. `catalog/test-definitions.json` maps observed runner IDs to those criteria. It is explicitly not an ExecutionEvidence record or remote TMS catalog. After the source is committed, a schema-valid TestCatalog can be created without inventing a commit:

```powershell
node scripts/catalog.mjs definitions evidence/<run-id>/playwright-results.json
node scripts/catalog.mjs snapshot evidence/<run-id>/playwright-results.json
```

Snapshot generation refuses dirty or untracked test-source paths. Do not substitute a bootstrap SHA for a commit containing the tests.

## Honest limits

- Product profile is `offline_replay`; test execution itself is live local HTTP/browser behavior, not recorded responses. No model reasoning or API inference was invoked.
- Storage is explicitly `isolated_test_double`. **PostgreSQL, Docker/secret-free sandbox isolation and verified image identity are not established.** Passing these tests cannot close those M1 gate conditions.
- The Chromium 153.0.8010.12 download failed with network timeouts. Actual UI evidence used installed Chrome 153.0.8010.36 in a fresh Playwright-controlled profile; no personal browser session was reused. This is a recorded deviation from bundled-browser reproducibility, not a hidden retry success.
- The process launcher forwards an environment allowlist, not SaaS/model credentials. That is not filesystem or operating-system sandboxing. These are maintainer-authored reference tests, not product-agent generated code.
- QLAB and repository names are planned logical identities; there are no claimed Jira/GitHub/Vansah resources. SaaS and remote CI remain unexecuted and require authorization.
- `.github/workflows/verify.yml` is manual-only preparation. It requires an authorized app repository and exact app commit and currently runs only the HTTP/memory-store reference; it is not a release gate or PostgreSQL proof.
- Synthetic login credentials are intentionally public demonstration data, not production authentication.

## Rollback

This work unit comprises consumer configuration, versioned library archive, fixtures, tests, catalog definitions, manual-only CI preparation and evidence. It can be removed without modifying the immutable PRD, application repository or any remote resource. Preserve the coordinator-created `AGENTS.md` and repository bootstrap files.
