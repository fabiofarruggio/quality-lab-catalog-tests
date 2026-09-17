# Committed-source Catalog execution

Status: **passed and admitted as a local operational TestCatalog**, not release or infrastructure acceptance.

- Catalog source: `a2f7ea68b07c1edace68239e462651fc9975db90`.
- Application source: `7fd57a9230d079492760e58b400bad7320ff5d31`, exported from exact committed Git blobs into catalog-owned staging and built there. The sibling application and running Compose deployment were not changed or used by this suite.
- Runtime: Node `24.21.0`, npm `11.19.0`, Playwright `1.63.0`, Chrome channel. Browser version annotations are preserved in the report.
- Results: 25/25 tests, zero skipped/unexpected/flaky; 30/30 binding checks; both clean installs, lint, typecheck, app build and full discovery exit 0. Test duration: 26,494 ms.
- Binding covers 20 suite inputs, 25 app inputs, 42 staged runtime/source files, 3,400 installed suite dependency files and 4,367 installed app dependency files. Before/after hashes match; report and discovery carry the same unique run ID.
- Screenshot `catalog-checkout.png` was visually inspected: real rendered synthetic catalog, visible memory-test-double warning, 10,000-cent subtotal, 1,000-cent discount, 9,000-cent total and repeated-confirmation order reuse.

## Reproduction

From the Catalog repository, use the workspace-local pinned Node/npm runtime:

```powershell
$env:PATH=(Resolve-Path '..\.tools\node-v24.21.0-win-x64').Path+';'+$env:PATH
$env:AQP_BROWSER_CHANNEL='chrome'
& '..\.tools\node-v24.21.0-win-x64\node.exe' '..\.tools\node-v24.21.0-win-x64\node_modules\npm\bin\npm-cli.js' run verify:local
# Use the NEW evidence directory returned by that command for a new snapshot.
& '..\.tools\node-v24.21.0-win-x64\node.exe' scripts/catalog.mjs snapshot evidence/2026-09-17T12-51-57.287Z/playwright-results.json
```

The shown snapshot command rechecks this recorded run against retained `.verification-work/2026-09-17T12-51-57.287Z/app` and current byte-equivalent committed inputs. A fresh verification produces its own run directory and report. It must not overwrite this evidence. If staged runtime/dependencies are deleted or differ, snapshot admission fails and a fresh verification is required.

The snapshot names the actually executed Catalog SHA, even after a later documentation/evidence commit with identical source bytes. `../preflight-2026-09-17T12-51-55.501Z` preserves the initial raw-byte mismatch rejection and correction without source behavior changes. Historical unbound reports remain nonadmissible.

## Limits and rollback

Every test starts its own real HTTP process with a fresh isolated in-memory Store test double. This is not the separate PostgreSQL/Compose run and proves no sandbox, image digest, live inference, SaaS or remote CI. Checksums demonstrate consistency, not cryptographic attestation of a trusted host. Chrome is the existing local installation; a fresh browser context is created by Playwright.

Rollback only this newly generated catalog/binding and evidence publication; preserve historical evidence and source fix. No external resources or spend were created.
