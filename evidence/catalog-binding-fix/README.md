# Bind catalog promotion to actual execution inputs

Root class: **unbound evidence promotion**. The old snapshot path took current HEAD/current input hashes and paired them with an older passing report. Clean current files alone did not prove that those files produced the report. The old report also omitted the business contract and report digest. Path resolution and empty-array acceptance shared the same missing admission boundary.

The fix adds one admission boundary shared by verification and catalog promotion. It requires a fresh version-2 record, linked discovery/report digests, exact run identity, complete discovery, a single passing attempt per variant, before/after immutable source/runtime/dependency identity, and matching committed bytes. App runtime is built from its committed files in catalog-owned isolated staging, never inferred from mutable sibling `dist`.

The 30 focused unit cases include stale tests, config, fixtures, lock, manifest and business contract; source drift during execution; changed app/runtime/dependencies; changed report/discovery/run identity; missing build; empty discovery/variants; missing/duplicate tests; retries/skips/failures; timestamps; and Windows/POSIX path escape. The original historical report is now rejected directly by the snapshot CLI.

Status: source fix and focused checks prepared. A new **25-test run on the coordinator-committed fix** is required before an admissible TestCatalog exists. No historical hashes or SHAs are backfilled. The output catalog will name the recorded execution commit; later identical source bytes are labeled equivalence, not a future execution claim.

Rollback boundary: the binding helper/tests, verification/catalog runner edits, fixture staging switch, reporter identity, ignored staging directory and these notes. The rejected historical snapshot remains preserved. No original application source, old report or remote resource was changed.
