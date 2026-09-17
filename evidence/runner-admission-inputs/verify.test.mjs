import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readInputs, verifyMapping, verifyFiles } from './verify.mjs';

const input = readInputs();
test('positive: strict schemas and exact recorded25 identities map to26 cleaned PG groups', () => {
  assert.deepEqual(verifyMapping(input), { tests: 25, cleanedGroups: 26 });
});
test('positive: source blobs, current bytes, archived artifacts and metadata hashes bind', () => {
  assert.equal(verifyFiles(input).status, 'passed');
});
const mutations = {
  'schema-forbidden inference field': x => { x.catalog.executionKind = 'local_live'; },
  'live mode': x => { x.catalog.mode = 'local_live'; },
  'synthetic example mislabeled as run': x => { x.catalog.provenance.syntheticExample = true; },
  'producer revision substitution': x => { x.catalog.provenance.platformCommit = 'f'.repeat(40); },
  'policy substitution': x => { x.catalog.provenance.policyHash = 'f'.repeat(64); },
  'registry substitution': x => { x.catalog.provenance.agentRegistryHash = 'f'.repeat(64); },
  'future provenance': x => { x.catalog.provenance.createdAt = '9999-01-01T00:00:00Z'; },
  'old memory execution commit': x => { x.catalog.commit = x.historicalCatalog.commit; },
  'foreign repository': x => { x.catalog.repository = 'quality-lab-orders-tests'; },
  'wrong template': x => { x.catalog.templateVersion = '0.2.0'; },
  'foreign scope': x => { x.catalog.scopeId = 'foreign'; },
  'duplicate logical test': x => { x.catalog.tests[1] = structuredClone(x.catalog.tests[0]); },
  'missing test': x => { x.catalog.tests.pop(); },
  'foreign owner': x => { x.catalog.tests[0].ownerSquad = 'orders'; },
  'renamed runner title': x => { x.catalog.tests[0].runnerTitle += ' changed'; },
  'foreign variant': x => { x.catalog.tests[0].variants = ['chromium']; },
  'escaping file': x => { x.catalog.tests[0].file = '../outside.spec.ts'; },
  'unsupported criterion': x => { x.catalog.tests[0].criterionIds = ['LAB-UNKNOWN']; },
  'stale story material': x => { x.catalog.tests[0].storyRevisionHash = 'f'.repeat(64); },
  'invented scenario': x => { x.catalog.tests[0].scenarioIds = ['invented']; },
  'removed discovery': x => { x.discovery.report.suites.pop(); },
  'extra planned variant': x => { x.execution.plannedVariants.push({ testId: 'extra', variantId: 'api' }); },
  'second-attempt result': x => { x.attempts[0].attempt = 2; },
  'memory store relabeled': x => { x.attempts[0].runtime.version.storeMode = 'memory'; },
  'cleanup not proved': x => { x.attempts[0].cleanup = 'pending'; },
  'duplicate group': x => { x.attempts[0].groupId = x.discovery.groupId; },
  'skipped result': x => { x.attempts[0].report.stats.skipped = 1; },
  'missing source hash': x => { delete x.binding.executedSuite.sourceHashes['tests/catalog.api.spec.ts']; },
  'evidence digest substitution': x => { x.binding.recordedExecution.sha256 = 'f'.repeat(64); },
  'publication claim': x => { x.binding.claimBoundaries.publisherAttestation = true; },
  'metadata HEAD masquerades as executed': x => { x.binding.claimBoundaries.laterMetadataHeadIsExecutedSource = true; },
};
for (const [label, mutate] of Object.entries(mutations)) test(`reject ${label}`, () => {
  const changed = structuredClone(input);
  mutate(changed);
  assert.throws(() => verifyMapping(changed));
});
test('reject changed catalog bytes binding', () => {
  const changed = structuredClone(input);
  changed.binding.metadata.sha256 = 'f'.repeat(64);
  assert.throws(() => verifyFiles(changed), /metadata digest mismatch/);
});
