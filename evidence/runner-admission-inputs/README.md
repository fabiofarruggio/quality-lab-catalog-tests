# Catalog metadata for reusable runner admission

This **new metadata-only input** describes the existing 25 Catalog tests at their actually executed PostgreSQL source revision. It does not rerun tests, replace historical evidence, create agent output, or approve a release. It supports bounded TASK-013/TASK-020 preparation; TASK-046 Orders adoption is not implemented here.

## Authoritative inputs

| Identity | Exact value |
|---|---|
| New schema-valid metadata | `catalog/runner-admission.json` |
| Executed Catalog source | `b4dc4ab9b21a1a15a52681e810a6779a31f17468` |
| Executed platform controller | `f21d4874a0aa4f5653d7c33e285a268087c7484b` |
| Platform evidence archive | `48c4a9b47b74cfeec42d3ef8fa4a9a5028978945` |
| Template | `0.1.0`; vendor archive digest is in `binding.json` |
| Historical PostgreSQL execution | `../qa-agent-platform/docs/implementation/evidence/lab-runner/catalog-2026-09-17T13-45-38.876Z/execution.json` |
| Execution SHA-256 | `480fd6d3d8c6cd9d5efa66a4de644201c8caf0ebb14e6bbab8e3fb5355537e6c` |

`binding.json` deliberately sits **outside** the original TestCatalog schema. It binds the new metadata hash to 21 exact consumer source inputs, 34 controller Git blobs and 30 archived artifacts. The verifier also checks the current consumer input bytes, exact discovery and each of the 25 first-attempt results, real PostgreSQL observations, and removal of all 26 independent groups including discovery. A later metadata-only repository HEAD is **not** the executed source.

All original test IDs, projects (`api`/`chromium`), paths, runner titles, criteria, scenario IDs and business-contract hashes are retained exactly. The existing memory-store `catalog/test-catalog.json`, its binding, definitions, manifest, executable source and historical evidence are unchanged. That historical catalog supplies logical mappings only; it is not relabeled as PostgreSQL evidence.

## Provenance and limitations

- Mode remains `offline_replay`. The original contract has no separate deterministic-local mode; this sidecar labels this operation `deterministic_local_metadata_readback` and the original execution remains `docker_isolated_postgres`.
- `syntheticExample: false` means this is actual local metadata, not a schema example. The application data and two squads remain explicitly simulated. It does not mean model inference occurred.
- Common producer provenance is inherited from the existing declarative manifest (`7965339aa7ceb2393aa2862c4c4cb5a55ffb2eef`). The new `createdAt` records this derivative metadata's creation. It is **not** a claim that the bootstrap revision executed the tests or produced a new agent answer.
- Policy and agent-registry bytes are independently pinned to committed configuration at `f21d487`; the sidecar records that configuration authority separately. It does not claim those files existed at the inherited bootstrap producer revision.
- `storyRevisionHash` retains the actual local `catalog/business-contract.json` digest. No fabricated StoryContract, human approval, provider identity, semantic review, publisher attestation or release GO is introduced.
- Generic platform-loader admission and any fresh runtime execution remain separate verification steps. This unit does not prove Orders adoption or accept a milestone.

## Reproduce the local readback

From this repository, with its existing project-local dependencies installed and the sibling repositories present:

```powershell
$env:PATH = 'F:\Programacion\qa-agent-platform\.tools\node-v24.21.0-win-x64;' + $env:PATH
node evidence/runner-admission-inputs/verify.mjs
node --test evidence/runner-admission-inputs/verify.test.mjs
```

The scripts make only local filesystem/Git reads and strict schema/semantic/hash checks. They do not start Docker, import consumer test code, call providers, access credentials, mutate input files or publish anything. Original schema bytes are compared with the exact schemas used by the installed framework validator.

`verification.json` records the final commands, exact verifier/metadata hashes and result. The negative cases include schema-forbidden fields, duplicate/missing/foreign identities, wrong producer/configuration/source pins, unsupported criteria, altered runner mappings, failed cleanup, skipped/retried results, false publication claims and digest substitution. These are **metadata verifier tests**, not another execution of the 25-test application suite.

The initial readback failure is preserved in `initial-*.txt`: byte comparison found a pre-existing CRLF-only difference in bootstrap `AGENTS.md`. The verifier now records exact current/committed digests and permits only newline normalization for non-executable bootstrap `AGENTS.md`/`.gitignore`; no normalization exception applies to execution inputs, schemas, metadata or historical evidence. No original file was edited to fix that diagnostic.

## Rollback

Remove only `catalog/runner-admission.json` and this new `evidence/runner-admission-inputs/` directory, or revert their eventual metadata-only commit. Existing catalogs, sources, manifests and all admitted execution records remain intact. No external resource or runtime process was created by this unit.
