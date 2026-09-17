import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, realpathSync, existsSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep, join } from 'node:path';
import { spawnSync } from 'node:child_process';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const SUITE_INPUTS = ['tests', 'fixtures', 'scripts', 'vendor', 'package.json', 'package-lock.json', 'playwright.config.ts', 'playwright.sandbox.config.ts',
  'tsconfig.json', 'eslint.config.mjs', 'team-manifest.json', 'catalog/business-contract.json', '.gitattributes', '.npmrc'];
export const APP_INPUTS = ['src', 'scripts', 'tests/support', 'migrations', 'package.json', 'package-lock.json',
  'tsconfig.json', 'tsconfig.server.json', 'vite.config.ts', 'index.html', '.gitattributes', '.npmrc'];

export function containedFile(root, name, { directory = false } = {}) {
  const normalized = name.replaceAll('\\', '/');
  if (!normalized || normalized.includes(':') || normalized.startsWith('/') || normalized.split('/').some((part) => part === '..' || part === '.')) {
    throw new Error(`Unsafe evidence path: ${name}`);
  }
  const base = realpathSync(root);
  const file = resolve(base, normalized);
  const rel = relative(base, file);
  if (!rel || isAbsolute(rel) || rel.startsWith(`..${sep}`)) throw new Error('Evidence path escapes root');
  let cursor = base;
  for (const part of normalized.split('/')) {
    cursor = join(cursor, part);
    if (lstatSync(cursor).isSymbolicLink()) throw new Error('Symlink evidence path is not allowed');
  }
  if (directory ? !lstatSync(file).isDirectory() : !lstatSync(file).isFile()) throw new Error('Expected an evidence file or directory');
  return file;
}

export function inventory(root, inputs, { dependencyLinks = false } = {}) {
  const output = {};
  const base = realpathSync(root);
  function visit(name) {
    const file = resolve(base, name);
    const info = lstatSync(file);
    if (info.isSymbolicLink()) {
      const target = realpathSync(file);
      const rel = relative(base, target);
      if (!dependencyLinks || isAbsolute(rel) || rel.startsWith(`..${sep}`) || !lstatSync(target).isFile()) throw new Error(`Unsafe source link: ${name}`);
      output[name] = sha256(readFileSync(target));
    } else if (info.isDirectory()) {
      for (const child of readdirSync(file).sort()) {
        if (dependencyLinks && child === '.cache') continue;
        visit(`${name}/${child}`);
      }
    } else if (info.isFile()) output[name] = sha256(readFileSync(file));
    else throw new Error(`Unsupported source entry: ${name}`);
  }
  for (const name of inputs) if (existsSync(resolve(base, name))) visit(name);
  if (!Object.keys(output).length) throw new Error('Source inventory is empty');
  return Object.fromEntries(Object.entries(output).sort(([left], [right]) => left.localeCompare(right)));
}

function git(root, args, encoding) {
  const result = spawnSync('git', ['-C', root, ...args], { encoding, shell: false, maxBuffer: 128 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Git identity check failed: ${args[0]}`);
  return result.stdout;
}
export function committedIdentity(root, inputs) {
  const commit = git(root, ['rev-parse', 'HEAD'], 'utf8').trim();
  const files = inventory(root, inputs);
  const tracked = git(root, ['ls-tree', '-r', '--name-only', '-z', commit, '--', ...inputs], 'utf8').split('\0').filter(Boolean).sort();
  if (JSON.stringify(tracked) !== JSON.stringify(Object.keys(files).sort())) throw new Error('Source files are untracked, missing or added; commit the source before verification');
  for (const [name, digest] of Object.entries(files)) {
    if (sha256(git(root, ['show', `${commit}:${name}`])) !== digest) throw new Error(`Dirty committed source: ${name}; commit before npm run verify:local`);
  }
  return { commit, files };
}
export function assertHistoricalCommit(root, identity) {
  if (!/^[a-f0-9]{40,64}$/.test(identity?.commit ?? '')) throw new Error('Missing recorded source commit');
  for (const [name, digest] of Object.entries(identity.files)) {
    containedFile(root, name);
    if (sha256(git(root, ['show', `${identity.commit}:${name}`])) !== digest) throw new Error(`Recorded commit bytes do not match ${name}`);
  }
}
export function sourceBlob(root, commit, name) { return git(root, ['show', `${commit}:${name}`]); }

export function reportTests(report, { requirePassed = false } = {}) {
  if (report.errors?.length) throw new Error('Report contains runner errors');
  const found = [];
  function visit(suite) {
    for (const spec of suite.specs ?? []) {
      const file = spec.file?.replaceAll('\\', '/');
      if (!file || file.includes(':') || file.startsWith('/') || file.split('/').some((part) => part === '..' || part === '.')) throw new Error('Report test path escapes test root');
      if (!spec.title || !spec.tests?.length) throw new Error('Empty discovered test or variant');
      for (const test of spec.tests) {
        if (!test.projectName) throw new Error('Missing test project identity');
        if (requirePassed && (test.status !== 'expected' || test.results?.length !== 1 || test.results[0].status !== 'passed')) {
          throw new Error('Every operational catalog variant requires one passing attempt');
        }
        found.push({ key: `${file}\0${spec.title}\0${test.projectName}`, file, title: spec.title, project: test.projectName });
      }
    }
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites ?? []) visit(suite);
  if (!found.length) throw new Error('Empty test discovery is not admissible');
  if (new Set(found.map((test) => test.key)).size !== found.length) throw new Error('Duplicate discovered variant');
  return found.sort((left, right) => left.key.localeCompare(right.key));
}

const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
export function validateBinding({ execution, reportBytes, discoveryBytes, currentSources, currentRuntime, currentDependencies }) {
  if (execution?.evidenceSchemaVersion !== 2 || execution.status !== 'passed') throw new Error('Unbound historical report; rerun npm run verify:local on committed source');
  if (sha256(reportBytes) !== execution.report?.sha256 || sha256(discoveryBytes) !== execution.discovery?.sha256) throw new Error('Report or discovery digest mismatch');
  const report = JSON.parse(reportBytes);
  const discovery = JSON.parse(discoveryBytes);
  if (!execution.runId || report.config?.metadata?.verificationRunId !== execution.runId || discovery.config?.metadata?.verificationRunId !== execution.runId) {
    throw new Error('Report belongs to another verification run');
  }
  for (const label of ['clean-install', 'app-clean-install', 'app-build', 'discovery', 'playwright']) {
    const commands = execution.commands?.filter((command) => command.label === label);
    if (commands?.length !== 1 || commands[0].exitCode !== 0) throw new Error(`Missing successful ${label} command`);
  }
  if (execution.commands.some((command) => command.exitCode !== 0)) throw new Error('Verification command failed');
  const expected = reportTests(discovery);
  const actual = reportTests(report, { requirePassed: true });
  if (!equal(expected, actual) || report.stats?.expected !== actual.length || report.stats?.unexpected !== 0 || report.stats?.skipped !== 0 || report.stats?.flaky !== 0) {
    throw new Error('Executed variants differ from complete discovery');
  }
  if (!equal(execution.sources, execution.postRunSources) || !equal(execution.runtime, execution.postRunRuntime) ||
      !equal(execution.dependencies, execution.postRunDependencies)) throw new Error('Inputs changed during execution');
  for (const name of ['suite', 'app']) {
    if (!execution.sources?.[name]?.commit || !Object.keys(execution.sources[name].files ?? {}).length ||
        !equal(currentSources[name].files, execution.sources[name].files)) throw new Error(`Stale ${name} source/configuration evidence`);
  }
  if (!equal(currentRuntime, execution.runtime) || !equal(currentDependencies, execution.dependencies)) throw new Error('Runtime or installed dependency bytes changed');
  const start = Date.parse(report.stats.startTime);
  const began = Date.parse(execution.testStartedAt);
  const completed = Date.parse(execution.completedAt);
  if (![start, began, completed].every(Number.isFinite) || completed < began || start < began - 1000 || start > completed) throw new Error('Report timestamp is outside the recorded execution');
  return { report, tests: actual, suiteCommit: execution.sources.suite.commit, appCommit: execution.sources.app.commit,
    binding: 'recorded-execution-commit-with-current-byte-equivalence', currentSuiteHead: currentSources.suite.commit };
}
