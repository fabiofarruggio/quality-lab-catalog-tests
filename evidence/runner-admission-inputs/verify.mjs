import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assertManifest, assertTestCatalog } from '@aqp/qa-framework-template';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../..');
const platform = resolve(root, '../qa-agent-platform');
const baseline = resolve(root, '../qa-agent-platform-prd-v1.0/schemas');
const suiteCommit = 'b4dc4ab9b21a1a15a52681e810a6779a31f17468';
const controllerCommit = 'f21d4874a0aa4f5653d7c33e285a268087c7484b';
const archiveCommit = '48c4a9b47b74cfeec42d3ef8fa4a9a5028978945';
const executionPath = 'docs/implementation/evidence/lab-runner/catalog-2026-09-17T13-45-38.876Z/execution.json';
const executionSha256 = '480fd6d3d8c6cd9d5efa66a4de644201c8caf0ebb14e6bbab8e3fb5355537e6c';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
function git(repository, args) {
  const result = spawnSync('git', ['-C', repository, ...args], { shell: false, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, `Git read failed: ${args[0]}`);
  return result.stdout;
}
const blob = (repository, revision, path) => git(repository, ['show', `${revision}:${path}`]);
const key = item => `${item.testId}:${item.variantId}`;
const sorted = rows => rows.toSorted((a, b) => key(a).localeCompare(key(b)));
function reportTests(report) {
  assert.equal(report.errors?.length ?? 0, 0);
  const rows = [];
  function visit(suite) {
    for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
      rows.push({ testId: spec.title.split(':')[0], file: `tests/${spec.file}`, runnerTitle: spec.title, variantId: test.projectName });
    }
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites ?? []) visit(suite);
  assert.equal(new Set(rows.map(key)).size, rows.length, 'duplicate runner identity');
  return sorted(rows);
}

/** Fixed local read-only inputs. This verifier never invokes a runner or a provider. */
export function readInputs() {
  return {
    catalog: json(join(root, 'catalog/runner-admission.json')),
    binding: json(join(directory, 'binding.json')),
    historicalCatalog: JSON.parse(blob(root, suiteCommit, 'catalog/test-catalog.json')),
    manifest: JSON.parse(blob(root, suiteCommit, 'team-manifest.json')),
    contract: JSON.parse(blob(root, suiteCommit, 'catalog/business-contract.json')),
    execution: json(join(platform, executionPath)),
    discovery: json(join(platform, dirname(executionPath), 'discovery.json')),
    attempts: Array.from({ length: 25 }, (_, index) => json(join(platform, dirname(executionPath), `attempt-${String(index + 1).padStart(2, '0')}.json`))),
  };
}

/** Exact semantic mapping; schema-valid mismatches still fail before any effect. */
export function verifyMapping(input) {
  const { catalog, binding, historicalCatalog, manifest, contract, execution, discovery, attempts } = input;
  assertTestCatalog(catalog);
  assertManifest(manifest);
  assert.equal(catalog.id, 'catalog-runner-admission-postgres-v1');
  assert.equal(catalog.mode, 'offline_replay');
  assert.equal(catalog.provenance.syntheticExample, false);
  assert.equal(catalog.repository, manifest.testRepository);
  assert.equal(catalog.repository, 'quality-lab-catalog-tests');
  assert.equal(catalog.commit, suiteCommit);
  assert.equal(catalog.templateVersion, '0.1.0');
  assert.equal(catalog.templateVersion, manifest.templateVersion);
  assert.equal(catalog.scopeId, contract.scopeId);
  for (const field of ['platformCommit', 'policyHash', 'agentRegistryHash']) assert.equal(catalog.provenance[field], manifest.provenance[field]);
  assert.ok(Date.parse(catalog.provenance.createdAt) >= Date.parse(execution.completedAt));
  assert.ok(Date.parse(catalog.provenance.createdAt) <= Date.now());
  assert.equal(catalog.tests.length, 25);
  assert.equal(new Set(catalog.tests.map(test => test.testId)).size, 25);
  // Historical metadata supplies logical intent only, never the PostgreSQL result.
  assert.deepEqual(catalog.tests, historicalCatalog.tests);
  const expected = sorted(catalog.tests.flatMap(test => {
    assert.equal(test.ownerSquad, 'catalog');
    assert.equal(test.lifecycle, 'operational');
    assert.equal(test.storyRevisionHash, execution.suite.sourceHashes['catalog/business-contract.json']);
    assert.ok(test.criterionIds.every(id => Object.hasOwn(contract.criteria, id)));
    assert.deepEqual(test.scenarioIds, [`SCENARIO-${test.testId}`]);
    assert.equal(test.variants.length, 1);
    assert.equal(test.variants[0], test.level === 'e2e' ? 'chromium' : 'api');
    return test.variants.map(variantId => ({ testId: test.testId, variantId, file: test.file, runnerTitle: test.runnerTitle }));
  }));
  assert.deepEqual(reportTests(discovery.report), expected);
  assert.equal(discovery.status, 'passed');
  assert.equal(discovery.cleanup, 'removed');
  assert.equal(execution.mode, 'offline_replay');
  assert.equal(execution.executionKind, 'docker_isolated_postgres');
  assert.equal(execution.status, 'passed');
  assert.equal(execution.releaseAcceptance, false);
  assert.equal(execution.publisherAttestation, false);
  assert.equal(execution.llmUsageUsd, 0);
  assert.equal(execution.suite.commit, suiteCommit);
  assert.equal(execution.controllerBefore.commit, controllerCommit);
  assert.deepEqual(execution.controllerBefore, execution.controllerAfter);
  assert.deepEqual(sorted(execution.plannedVariants), expected.map(({ testId, variantId }) => ({ testId, variantId })));
  assert.equal(attempts.length, 25);
  assert.equal(execution.results.length, 25);
  const groups = new Set([discovery.groupId]);
  const observed = [];
  for (const [index, attempt] of attempts.entries()) {
    const result = execution.results[index];
    assert.equal(attempt.status, 'passed');
    assert.equal(attempt.cleanup, 'removed');
    assert.equal(attempt.attempt, 1);
    assert.equal(result.attempt, 1);
    assert.equal(result.status, 'passed');
    assert.equal(attempt.groupId, result.groupId);
    assert.ok(!groups.has(attempt.groupId));
    groups.add(attempt.groupId);
    assert.deepEqual(attempt.runtime, result.runtime);
    assert.equal(attempt.runtime.version.storeMode, 'postgres');
    assert.equal(attempt.runtime.version.executionKind, 'deterministic_local');
    assert.equal(attempt.runtime.version.gitSha, attempt.runtime.applicationCommit);
    const rows = reportTests(attempt.report);
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0], { testId: result.testId, variantId: result.variantId, file: `tests/${attempt.selected.file}`, runnerTitle: attempt.selected.title });
    assert.equal(attempt.selected.testId, result.testId);
    assert.equal(attempt.selected.project, result.variantId);
    assert.equal(attempt.report.stats.expected, 1);
    for (const name of ['unexpected', 'skipped', 'flaky']) assert.equal(attempt.report.stats[name], 0);
    observed.push(...rows);
  }
  assert.deepEqual(sorted(observed), expected);
  assert.equal(groups.size, 26);
  assert.equal(binding.bindingVersion, 1);
  assert.equal(binding.mode, 'offline_replay');
  assert.equal(binding.executedSuite.commit, suiteCommit);
  assert.deepEqual(binding.executedSuite.sourceHashes, execution.suite.sourceHashes);
  assert.equal(binding.recordedExecution.controllerCommit, controllerCommit);
  assert.equal(binding.recordedExecution.archiveCommit, archiveCommit);
  assert.equal(binding.recordedExecution.path, executionPath);
  assert.equal(binding.recordedExecution.sha256, executionSha256);
  assert.deepEqual(binding.recordedExecution.controllerHashes, execution.controllerBefore.files);
  assert.equal(binding.metadata.path, 'catalog/runner-admission.json');
  assert.equal(binding.metadata.logicalMappingSource.path, 'catalog/test-catalog.json');
  assert.equal(binding.metadata.manifest.path, 'team-manifest.json');
  assert.deepEqual(Object.keys(binding.schemas).sort(), ['common.schema.json', 'team-manifest.schema.json', 'test-catalog.schema.json']);
  assert.equal(binding.configurationAuthority.commit, controllerCommit);
  assert.equal(binding.configurationAuthority.policyPath, 'config/budget-policy.yaml');
  assert.equal(binding.configurationAuthority.registryPath, 'config/agents.yaml');
  assert.equal(binding.configurationAuthority.policySha256, catalog.provenance.policyHash);
  assert.equal(binding.configurationAuthority.registrySha256, catalog.provenance.agentRegistryHash);
  assert.deepEqual(binding.claimBoundaries, { newExecution: false, liveInference: false, humanApproval: false, releaseAcceptance: false, publisherAttestation: false, ordersAdoption: false, laterMetadataHeadIsExecutedSource: false });
  return { tests: expected.length, cleanedGroups: groups.size };
}

export function verifyFiles(input = readInputs()) {
  const { binding, catalog } = input;
  const semantic = verifyMapping(input);
  const metadataBytes = readFileSync(join(root, binding.metadata.path));
  assert.deepEqual(JSON.parse(metadataBytes), catalog);
  assert.equal(hash(metadataBytes), binding.metadata.sha256, 'metadata digest mismatch');
  assert.equal(hash(readFileSync(join(platform, executionPath))), executionSha256);
  assert.deepEqual(input.execution, json(join(platform, executionPath)));
  for (const [path, digest] of Object.entries(binding.executedSuite.sourceHashes)) {
    assert.equal(hash(blob(root, suiteCommit, path)), digest, `suite Git blob: ${path}`);
    assert.equal(hash(readFileSync(join(root, path))), digest, `suite current bytes: ${path}`);
  }
  for (const record of [binding.metadata.logicalMappingSource, binding.metadata.manifest]) {
    assert.equal(record.commit, suiteCommit);
    assert.equal(hash(blob(root, suiteCommit, record.path)), record.sha256);
    assert.equal(hash(readFileSync(join(root, record.path))), record.sha256);
  }
  for (const [path, digest] of Object.entries(binding.recordedExecution.controllerHashes)) assert.equal(hash(blob(platform, controllerCommit, path)), digest);
  const crosscheck = json(join(platform, dirname(executionPath), 'evidence-crosscheck.json'));
  assert.deepEqual(binding.recordedExecution.artifactHashes, crosscheck.artifacts);
  for (const [path, digest] of Object.entries(binding.recordedExecution.artifactHashes)) {
    const fullPath = `${dirname(executionPath).replaceAll('\\', '/')}/${path}`;
    assert.equal(hash(blob(platform, archiveCommit, fullPath)), digest, `evidence archive: ${path}`);
    assert.equal(hash(readFileSync(join(platform, fullPath))), digest, `evidence current bytes: ${path}`);
  }
  git(platform, ['cat-file', '-e', `${catalog.provenance.platformCommit}^{commit}`]);
  assert.equal(hash(blob(platform, controllerCommit, 'config/budget-policy.yaml')), catalog.provenance.policyHash);
  assert.equal(hash(blob(platform, controllerCommit, 'config/agents.yaml')), catalog.provenance.agentRegistryHash);
  for (const [filename, digest] of Object.entries(binding.schemas)) {
    assert.equal(hash(readFileSync(join(baseline, filename))), digest);
    assert.equal(hash(readFileSync(join(root, 'node_modules/@aqp/qa-framework-template/schemas', filename))), digest);
  }
  // Non-executable bootstrap files already have Git checkout CRLF normalization.
  // No such exception applies to executed inputs or historical evidence.
  const checkoutNewlines = [];
  for (const path of git(root, ['ls-tree', '-r', '--name-only', suiteCommit]).toString('utf8').trim().split('\n')) {
    const current = readFileSync(join(root, path));
    const original = blob(root, suiteCommit, path);
    if (['AGENTS.md', '.gitignore'].includes(path) && hash(current) !== hash(original)) {
      assert.equal(current.toString('utf8').replaceAll('\r\n', '\n'), original.toString('utf8').replaceAll('\r\n', '\n'), `non-newline bootstrap change: ${path}`);
      checkoutNewlines.push({ path, currentSha256: hash(current), committedSha256: hash(original), difference: 'CRLF_only_non_execution_input' });
    } else assert.equal(hash(current), hash(original), `existing file changed: ${path}`);
  }
  const files = readdirSync(directory).filter(name => !['verification.json', 'verification.stdout.txt', 'verification.stderr.txt', 'tests.stdout.txt', 'tests.stderr.txt'].includes(name));
  return { status: 'passed', mode: 'offline_replay', executionKind: 'deterministic_local_metadata_readback', ...semantic,
    metadataSha256: binding.metadata.sha256, bindingSha256: hash(readFileSync(join(directory, 'binding.json'))),
    suiteCommit, currentMetadataHead: git(root, ['rev-parse', 'HEAD']).toString('utf8').trim(), controllerCommit, archiveCommit,
    suiteInputHashes: Object.keys(binding.executedSuite.sourceHashes).length, controllerInputHashes: Object.keys(binding.recordedExecution.controllerHashes).length,
    artifactHashes: Object.keys(binding.recordedExecution.artifactHashes).length, checkoutNewlines,
    verifierInputs: Object.fromEntries(files.map(name => [name, hash(readFileSync(join(directory, name)))])),
    newExecution: false, releaseAcceptance: false, ordersAdoption: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(verifyFiles(), null, 2));
