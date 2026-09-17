import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { containedFile, reportTests, sha256, validateBinding } from './evidence-binding.mjs';

// Synthetic protocol inputs exercise rejection rules; none are execution evidence.
function fixture() {
  const report = { config: { metadata: { verificationRunId: 'unit-run' } }, errors: [],
    stats: { startTime: '2026-09-17T00:00:01Z', expected: 1, unexpected: 0, skipped: 0, flaky: 0 },
    suites: [{ specs: [{ file: 'example.spec.ts', title: 'UNIT-001: example', tests: [{ projectName: 'api', status: 'expected', results: [{ status: 'passed' }] }] }] }] };
  const sources = { suite: { commit: 'a'.repeat(40), files: { 'tests/example.spec.ts': '1'.repeat(64), 'playwright.config.ts': '2'.repeat(64),
    'fixtures/lab.ts': '3'.repeat(64), 'package-lock.json': '4'.repeat(64), 'catalog/business-contract.json': '5'.repeat(64), 'team-manifest.json': '6'.repeat(64) } },
  app: { commit: 'b'.repeat(40), files: { 'src/server/http.ts': '7'.repeat(64) } } };
  const runtime = { 'dist/server.js': '8'.repeat(64) };
  const dependencies = { suite: { 'node_modules/test/index.js': '9'.repeat(64) }, app: { 'node_modules/app/index.js': '0'.repeat(64) } };
  const bytes = JSON.stringify(report);
  return { execution: { evidenceSchemaVersion: 2, runId: 'unit-run', status: 'passed', sources, postRunSources: structuredClone(sources),
    runtime, postRunRuntime: structuredClone(runtime), dependencies, postRunDependencies: structuredClone(dependencies),
    testStartedAt: '2026-09-17T00:00:00Z', completedAt: '2026-09-17T00:00:02Z',
    report: { sha256: sha256(bytes) }, discovery: { sha256: sha256(bytes) },
    commands: ['clean-install', 'app-clean-install', 'app-build', 'discovery', 'playwright'].map((label) => ({ label, exitCode: 0 })) },
  reportBytes: bytes, discoveryBytes: bytes, currentSources: structuredClone(sources), currentRuntime: structuredClone(runtime), currentDependencies: structuredClone(dependencies) };
}

test('accepts bound source bytes but preserves executed commit across a later metadata-only HEAD', () => {
  const input = fixture();
  input.currentSources.suite.commit = 'c'.repeat(40);
  const result = validateBinding(input);
  assert.equal(result.suiteCommit, 'a'.repeat(40));
  assert.equal(result.currentSuiteHead, 'c'.repeat(40));
});
test('rejects historical records missing binding version', () => { const input = fixture(); delete input.execution.evidenceSchemaVersion; assert.throws(() => validateBinding(input), /Unbound historical/); });
test('rejects a changed report even if the old report passed', () => { const input = fixture(); input.reportBytes += ' '; assert.throws(() => validateBinding(input), /digest mismatch/); });
test('rejects a changed discovery digest', () => { const input = fixture(); input.discoveryBytes += ' '; assert.throws(() => validateBinding(input), /digest mismatch/); });
for (const path of ['tests/example.spec.ts', 'playwright.config.ts', 'fixtures/lab.ts', 'package-lock.json', 'catalog/business-contract.json', 'team-manifest.json']) {
  test(`rejects stale source/config/input: ${path}`, () => {
    const input = fixture(); input.currentSources.suite.files[path] = 'f'.repeat(64);
    assert.throws(() => validateBinding(input), /Stale suite/);
  });
}
test('rejects added test source not present during execution', () => { const input = fixture(); input.currentSources.suite.files['tests/new.spec.ts'] = 'f'.repeat(64); assert.throws(() => validateBinding(input), /Stale suite/); });
test('rejects app source drift', () => { const input = fixture(); input.currentSources.app.files['src/server/http.ts'] = 'f'.repeat(64); assert.throws(() => validateBinding(input), /Stale app/); });
test('rejects mutated built runtime', () => { const input = fixture(); input.currentRuntime['dist/server.js'] = 'f'.repeat(64); assert.throws(() => validateBinding(input), /Runtime/); });
test('rejects mutated installed dependency', () => { const input = fixture(); input.currentDependencies.suite['node_modules/test/index.js'] = 'f'.repeat(64); assert.throws(() => validateBinding(input), /dependency/); });
test('rejects source changed while the test process was running', () => { const input = fixture(); input.execution.postRunSources.suite.files['tests/example.spec.ts'] = 'f'.repeat(64); assert.throws(() => validateBinding(input), /during execution/); });
test('rejects failed or missing build commands', () => { const input = fixture(); input.execution.commands.find((command) => command.label === 'app-build').exitCode = 1; assert.throws(() => validateBinding(input), /app-build/); });
test('rejects missing execution timestamps', () => { const input = fixture(); delete input.execution.testStartedAt; assert.throws(() => validateBinding(input), /timestamp/); });
test('rejects a report timestamp from before this execution', () => { const input = fixture(); input.execution.testStartedAt = '2026-09-17T00:02:00Z'; assert.throws(() => validateBinding(input), /timestamp/); });
test('rejects report from another run even with recomputed digest', () => {
  const input = fixture(); const report = JSON.parse(input.reportBytes); report.config.metadata.verificationRunId = 'other';
  input.reportBytes = JSON.stringify(report); input.execution.report.sha256 = sha256(input.reportBytes);
  assert.throws(() => validateBinding(input), /another verification/);
});
test('rejects empty discovery rather than accepting every on an empty array', () => { assert.throws(() => reportTests({ suites: [] }), /Empty test discovery/); });
test('rejects zero variants', () => { const report = JSON.parse(fixture().reportBytes); report.suites[0].specs[0].tests = []; assert.throws(() => reportTests(report), /Empty discovered/); });
test('rejects missing executed variants from a larger discovery', () => {
  const input = fixture(); const discovery = JSON.parse(input.discoveryBytes); discovery.suites[0].specs.push({ ...discovery.suites[0].specs[0], title: 'UNIT-002: omitted' });
  input.discoveryBytes = JSON.stringify(discovery); input.execution.discovery.sha256 = sha256(input.discoveryBytes);
  assert.throws(() => validateBinding(input), /complete discovery/);
});
test('rejects duplicate discovered variants', () => { const report = JSON.parse(fixture().reportBytes); report.suites[0].specs.push(report.suites[0].specs[0]); assert.throws(() => reportTests(report), /Duplicate/); });
test('rejects skipped, retried and failed results', () => {
  for (const results of [[{ status: 'skipped' }], [{ status: 'failed' }], [{ status: 'failed' }, { status: 'passed' }]]) {
    const report = JSON.parse(fixture().reportBytes); report.suites[0].specs[0].tests[0].results = results;
    assert.throws(() => reportTests(report, { requirePassed: true }), /one passing attempt/);
  }
});
for (const file of ['../secret', '/absolute', 'C:\\secret', '..\\secret', 'folder/../../secret']) {
  test(`rejects report path escape: ${file}`, () => {
    const report = JSON.parse(fixture().reportBytes); report.suites[0].specs[0].file = file;
    assert.throws(() => reportTests(report), /escapes/);
  });
}
test('filesystem containment rejects parent/root/absolute paths before reading', () => {
  const base = resolve('test-results/binding-unit'); mkdirSync(base, { recursive: true });
  const root = mkdtempSync(resolve(base, 'case-')); writeFileSync(resolve(root, 'valid.json'), '{}');
  try {
    assert.equal(containedFile(root, 'valid.json'), resolve(root, 'valid.json'));
    for (const name of ['../secret', '.', '/absolute', 'C:\\secret', '..\\secret']) assert.throws(() => containedFile(root, name));
  } finally { if (!root.startsWith(base)) throw new Error('Unsafe test cleanup'); rmSync(root, { recursive: true }); }
});
