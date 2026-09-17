# Catalog reference evidence

## Admissible committed-source run

[2026-09-17T12-51-57.287Z](2026-09-17T12-51-57.287Z/README.md) passed **25/25 real tests (21 HTTP, four Chrome), 30/30 binding checks, lint, typecheck, clean installs and an isolated application build**. It binds the actually executed Catalog commit `a2f7ea68b07c1edace68239e462651fc9975db90` to application commit `7fd57a9230d079492760e58b400bad7320ff5d31`. The operational local snapshot is [test-catalog.json](../catalog/test-catalog.json), with its [execution binding](../catalog/test-catalog-binding.json).

The [preserved preflight failure](preflight-2026-09-17T12-51-55.501Z/execution.json) rejected Git-clean CRLF bytes that differed from the committed LF `.gitattributes`. Restoring that exact existing source blob allowed the same committed revision to run; no historical evidence or identity was normalized.

This is `offline_replay` with actual deterministic HTTP/browser execution and an isolated memory Store per test. It does **not** verify PostgreSQL, sandboxing, live model reasoning, SaaS, remote CI or release acceptance. App staging is retained locally under ignored `.verification-work`; it is needed to recheck snapshot admission, or the clean verification must be rerun to produce new evidence.

## Historical unbound observations

Historical observed run: [2026-09-17T02-25-14.617Z/execution.json](2026-09-17T02-25-14.617Z/execution.json). **This pre-fix report lacks complete source/report binding and is not admissible for a TestCatalog snapshot.** Its observed results remain unchanged, not promoted to a later commit.

Clean dependency installation, lint, typecheck, **21 HTTP tests and four browser tests passed**, with zero skips, unexpected results or flakiness. Full results and real rendered screenshot are adjacent:

- [Playwright JSON](2026-09-17T02-25-14.617Z/playwright-results.json)
- [Actual checkout screenshot](2026-09-17T02-25-14.617Z/catalog-checkout.png)
- [Bundled-browser download failure and fallback](browser-install-failure.json)
- [Untouched generated consumer acceptance](generator-2026-09-17T02-26-15.961Z/execution.json): fresh generation outside the template, install, clean reinstall, lint, typecheck and real HTTP readiness all passed with the versioned tarball.

Product profile is `offline_replay`; execution is real local HTTP/browser code against a fresh **isolated in-memory Store test double** for every test. Chrome 153.0.8010.36 was observed through Playwright and is recorded in browser test annotations. The screenshot shows original synthetic data and the explicit test-double warning; it is not a mock image.

This evidence does not verify PostgreSQL, Compose, a sandbox, an image digest, live model reasoning, SaaS, remote CI or release acceptance. Source and runtime-file SHA-256 maps identify the tested working-tree bytes independently of bootstrap commits. A later PostgreSQL run must remain a separate evidence record.

The incorrectly stamped, never-committed snapshot is preserved unchanged under [invalidated](invalidated/rejection.json) and labeled NONADMISSIBLE. The fresh committed-source run above satisfies the [binding protocol](catalog-binding-fix/README.md); it does not retrofit the historical report.
