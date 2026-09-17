# Catalog reference evidence

Historical observed run: [2026-09-17T02-25-14.617Z/execution.json](2026-09-17T02-25-14.617Z/execution.json). **This pre-fix report lacks complete source/report binding and is not admissible for a TestCatalog snapshot.** Its observed results remain unchanged, not promoted to a later commit.

Clean dependency installation, lint, typecheck, **21 HTTP tests and four browser tests passed**, with zero skips, unexpected results or flakiness. Full results and real rendered screenshot are adjacent:

- [Playwright JSON](2026-09-17T02-25-14.617Z/playwright-results.json)
- [Actual checkout screenshot](2026-09-17T02-25-14.617Z/catalog-checkout.png)
- [Bundled-browser download failure and fallback](browser-install-failure.json)
- [Untouched generated consumer acceptance](generator-2026-09-17T02-26-15.961Z/execution.json): fresh generation outside the template, install, clean reinstall, lint, typecheck and real HTTP readiness all passed with the versioned tarball.

Product profile is `offline_replay`; execution is real local HTTP/browser code against a fresh **isolated in-memory Store test double** for every test. Chrome 153.0.8010.36 was observed through Playwright and is recorded in browser test annotations. The screenshot shows original synthetic data and the explicit test-double warning; it is not a mock image.

This evidence does not verify PostgreSQL, Compose, a sandbox, an image digest, live model reasoning, SaaS, remote CI or release acceptance. Source and runtime-file SHA-256 maps identify the tested working-tree bytes independently of bootstrap commits. A later PostgreSQL run must remain a separate evidence record.

The incorrectly stamped, never-committed snapshot is preserved unchanged under [invalidated](invalidated/rejection.json) and labeled NONADMISSIBLE. The binding fix requires a fresh clean-commit run; see [binding protocol](catalog-binding-fix/README.md).
