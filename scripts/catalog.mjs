import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { assertManifest, assertTestCatalog } from '@aqp/qa-framework-template';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const root = process.cwd();
const mode = process.argv[2];
const reportPath = process.argv[3] ?? 'test-results/results.json';
const relativeReport = relative(root, resolve(reportPath));
if (isAbsolute(relativeReport) || relativeReport.startsWith(`..${sep}`)) throw new Error('Report must be within the suite repository');
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const contract = JSON.parse(readFileSync('catalog/business-contract.json', 'utf8'));
const manifest = JSON.parse(readFileSync('team-manifest.json', 'utf8'));
assertManifest(manifest);
const criteria = {
  '001': ['LAB-IDENTITY'], '002': ['LAB-AUTH'], '003': ['LAB-AUTH'], '004': ['LAB-PRODUCT'], '005': ['LAB-RBAC'],
  '006': ['LAB-PRICE'], '007': ['LAB-PRICE'], '008': ['LAB-DISCOUNT'], '009': ['LAB-QUANTITY'], '010': ['LAB-QUANTITY'],
  '011': ['LAB-ACTIVE'], '012': ['LAB-STALE'], '013': ['LAB-TOTAL'], '014': ['LAB-IDEMPOTENCY'],
};
const tests = [];
function visit(suite) {
  for (const spec of suite.specs ?? []) {
    const testId = spec.title.split(':')[0];
    const ui = testId.includes('-UI-');
    const number = /QLAB-CAT-(\d+)/.exec(testId)?.[1];
    const criterionIds = testId === 'QLAB-CATALOG-READINESS' ? ['LAB-READY'] : ui ? {
      'QLAB-CAT-UI-001': ['LAB-ACTIVE', 'LAB-RBAC'], 'QLAB-CAT-UI-002': ['LAB-DISCOUNT', 'LAB-IDEMPOTENCY'],
      'QLAB-CAT-UI-003': ['LAB-STALE'], 'QLAB-CAT-UI-004': ['LAB-PRICE', 'LAB-RBAC'],
    }[testId] : criteria[number];
    if (!criterionIds?.length || criterionIds.some((id) => !contract.criteria[id])) throw new Error(`Unmapped test ${testId}`);
    const file = spec.file.replaceAll('\\', '/');
    const source = readFileSync(resolve('tests', file));
    const passed = spec.tests.every((test) => test.results.length === 1 && test.results[0].status === 'passed' && test.status === 'expected');
    tests.push({ testId, criterionIds, scenarioIds: [`SCENARIO-${testId}`], ownerSquad: manifest.ownerSquad,
      level: ui ? 'e2e' : 'api', file: `tests/${file}`, runnerTitle: spec.title,
      variants: spec.tests.map((test) => test.projectName), components: ui ? ['catalog', 'orders', 'ui'] : ['catalog', 'orders', 'api'],
      criticality: ['LAB-RBAC', 'LAB-STALE', 'LAB-TOTAL', 'LAB-IDEMPOTENCY'].some((id) => criterionIds.includes(id)) ? 'critical' : 'high',
      mandatory: true, lifecycle: passed ? 'operational' : 'unverified', storyRevisionHash: hash(readFileSync('catalog/business-contract.json')),
      sourceSha256: hash(source) });
  }
  for (const child of suite.suites ?? []) visit(child);
}
for (const suite of report.suites) visit(suite);
if (new Set(tests.map((test) => test.testId)).size !== tests.length) throw new Error('Duplicate test identity');
if (mode === 'definitions') {
  writeFileSync('catalog/test-definitions.json', JSON.stringify({ schemaVersion: '1.0.0', documentType: 'test-definitions-not-execution-evidence',
    templateVersion: manifest.templateVersion, scopeId: contract.scopeId, reportPath: relativeReport.replaceAll('\\', '/'),
    reportSha256: hash(readFileSync(reportPath)), limitations: ['Observed against isolated memory store, not PostgreSQL.', 'Working-tree source hashes are not a Git commit.'], tests }, null, 2) + '\n');
} else if (mode === 'snapshot') {
  const paths = [...new Set(['fixtures', 'playwright.config.ts', 'package.json', 'package-lock.json', 'vendor', ...tests.map((test) => test.file)])];
  for (const path of paths) {
    const tracked = spawnSync('git', ['ls-files', '--error-unmatch', path], { encoding: 'utf8', shell: false });
    if (tracked.status !== 0) throw new Error(`Commit source before creating TestCatalog: ${path}`);
  }
  const clean = spawnSync('git', ['diff', '--quiet', 'HEAD', '--', ...paths], { shell: false });
  if (clean.status !== 0) throw new Error('Test source differs from HEAD; commit it before creating TestCatalog');
  const commit = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', shell: false }).stdout.trim();
  const catalog = { schemaVersion: '1.0.0', id: 'catalog-reference-local-v1', mode: manifest.mode, provenance: manifest.provenance,
    repository: manifest.testRepository, commit, templateVersion: manifest.templateVersion, scopeId: contract.scopeId,
    tests: tests.map((test) => { const result = { ...test }; delete result.sourceSha256; return result; }) };
  assertTestCatalog(catalog);
  writeFileSync('catalog/test-catalog.json', JSON.stringify(catalog, null, 2) + '\n');
  console.log(JSON.stringify({ commit, tests: tests.length, reportSha256: hash(readFileSync(reportPath)) }));
} else throw new Error('Usage: node scripts/catalog.mjs definitions|snapshot <repository-local-report.json>');
