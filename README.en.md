# Catalog reference regression

**Language / Idioma:** [Español (principal)](README.md) · English

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

`verify:local` requires committed, byte-clean suite and application inputs before executing tests. It repeats clean installation, lint, typecheck and binding-unit checks, copies exact committed application blobs into `.verification-work/<run-id>/app`, installs/builds that isolated copy, discovers the complete suite and executes it. It never rebuilds or trusts mutable `dist` in the sibling application repository. Both repositories must remain source-stable during the run.

The execution record binds the report and discovery by SHA-256, run ID and time, plus before/after committed-source, installed-dependency and staged-runtime hashes. Logs, reports and a real screenshot are saved locally in a fresh `evidence/<UTC-run-id>/`; those receipts remain in the workspace's private backup and are not published. Staging is retained locally for admission checks and never committed. The fixture launches a separate HTTP process and fresh memory store **for every test**, uses synthetic accounts and terminates each child in teardown.

## What the checks prove

### Isolated PostgreSQL profile (integration pending)

`playwright.sandbox.config.ts` selects a separate `isolated_postgres` fixture at fixed loopback `127.0.0.1:3000`. Only the trusted platform lab runner may supply `AQP_EXPECTED_APP_COMMIT` and provision the ephemeral database/application/browser containers. This profile requires Chromium's sandbox, disables retries and preserves all 25 reference test IDs and business assertions. The two environment-identity assertions explicitly distinguish PostgreSQL from the default memory test double.

The profile does not provision Docker, expose a database credential or attest an image itself. Its source passed lint, typecheck and 30 evidence-binding tests before commit; the complete 25-variant isolated PostgreSQL run remains pending. Do not reuse the historical memory-store snapshot as evidence for this new profile or source revision. Rollback is limited to this configuration, its fixture branch, two identity assertions and the added configuration hash input.

Authentication and authorization, seed values, positive integer prices, version increments, discount thresholds 9999/10000/10001, quantity boundaries/negatives, inactive items, stale quotes, client-total rejection, idempotent confirmation, and corresponding UI journeys. The shared `@aqp/qa-framework-template` library remains installed code, not a copied fixture fork.

`catalog/business-contract.json` states original laboratory criteria. `catalog/test-definitions.json` maps observed runner IDs to those criteria. It is explicitly not an ExecutionEvidence record or remote TMS catalog. After the source is committed, a schema-valid TestCatalog can be created without inventing a commit:

```powershell
node scripts/catalog.mjs definitions evidence/<run-id>/playwright-results.json
node scripts/catalog.mjs snapshot evidence/<run-id>/playwright-results.json
```

Both commands require the adjacent version-2 execution record; historical unbound reports are rejected rather than retrofitted. Snapshot admission rechecks all relevant source/configuration/fixture/lock/manifest/business-contract bytes against their recorded Git blobs and the retained staged runtime/dependencies. Empty discovery, missing variants, retries, skips, stale/mutated reports, path escapes and input drift fail closed.

The TestCatalog always names the **recorded execution commit**, never a later HEAD. A documentation-only later commit may be byte-equivalent; that equivalence is explicitly recorded in `catalog/test-catalog-binding.json`. Hashes establish consistency, not a signed attestation of trusted execution. Commit this source fix before the first new 25-test verification run.

## Honest limits

- Product profile is `offline_replay`; test execution itself is live local HTTP/browser behavior, not recorded responses. No model reasoning or API inference was invoked.
- Storage is explicitly `isolated_test_double`. **PostgreSQL, Docker/secret-free sandbox isolation and verified image identity are not established.** Passing these tests cannot close those M1 gate conditions.
- The Chromium 153.0.8010.12 download failed with network timeouts. Actual UI evidence used installed Chrome 153.0.8010.36 in a fresh Playwright-controlled profile; no personal browser session was reused. This is a recorded deviation from bundled-browser reproducibility, not a hidden retry success.
- The process launcher forwards an environment allowlist, not SaaS/model credentials. That is not filesystem or operating-system sandboxing. These are maintainer-authored reference tests, not product-agent generated code.
- QLAB and repository names are planned logical identities; there are no claimed Jira/GitHub/Vansah resources. SaaS and remote CI remain unexecuted and require authorization.
- `.github/workflows/verify.yml` is manual-only preparation. It requires an authorized app repository and exact app commit and currently runs only the HTTP/memory-store reference; it is not a release gate or PostgreSQL proof.
- Synthetic login credentials are intentionally public demonstration data, not production authentication.

## Rollback

This work unit comprises consumer configuration, versioned library archive, fixtures, tests, catalog definitions, manual-only CI preparation and local verification. Generated receipts remain in the workspace's private backup. It can be removed without modifying the immutable PRD, application repository or any remote resource. Preserve the coordinator-created `AGENTS.md` and repository bootstrap files.

## License

Original code is licensed under the MIT License in LICENSE. Dependencies and authored third-party materials retain their respective licenses.

## Documentation policy

`README.md` is the primary Spanish entry point and `TEMPLATE_USAGE.md` is the Spanish-first template guide. Their complete English companions are [`README.en.md`](README.en.md) and [`TEMPLATE_USAGE.en.md`](TEMPLATE_USAGE.en.md). `AGENTS.md` and historical verification receipts keep their original language and bytes in the private backup to protect instructions and evidence provenance; third-party/vendor documents are not translated.
