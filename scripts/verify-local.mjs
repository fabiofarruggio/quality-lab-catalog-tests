import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { APP_INPUTS, SUITE_INPUTS, committedIdentity, inventory, sourceBlob, sha256, reportTests, validateBinding } from './evidence-binding.mjs';

if (!process.env.npm_execpath) throw new Error('Run through npm run verify:local');
const root = process.cwd();
const appRoot = resolve('../quality-lab-app');
const sources = { suite: committedIdentity(root, SUITE_INPUTS), app: committedIdentity(appRoot, APP_INPUTS) };
const runId = new Date().toISOString().replaceAll(':', '-');
const directory = resolve('evidence', runId);
const stagedApp = resolve('.verification-work', runId, 'app');
mkdirSync(directory, { recursive: true });
mkdirSync(stagedApp, { recursive: true });
const commands = [];
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => ['PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'AQP_BROWSER_CHANNEL'].includes(key.toUpperCase())));
Object.assign(env, { NPM_CONFIG_CACHE: resolve('../.tools/npm-cache'), NPM_CONFIG_USERCONFIG: join(directory, 'npm-user-empty.conf'),
  NPM_CONFIG_GLOBALCONFIG: join(directory, 'npm-global-empty.conf'), AQP_REPORT_PATH: join(directory, 'playwright-results.json'),
  AQP_EVIDENCE_RUN_ID: runId, AQP_VERIFIED_APP_ROOT: stagedApp });
writeFileSync(env.NPM_CONFIG_USERCONFIG, '', { flag: 'wx' });
writeFileSync(env.NPM_CONFIG_GLOBALCONFIG, '', { flag: 'wx' });
const execution = { evidenceSchemaVersion: 2, runId, status: 'failed', mode: 'offline_replay',
  executionKind: 'real_http_and_browser_against_isolated_memory_test_double', taskIds: ['TASK-019', 'TASK-020'],
  node: process.version, nodeBinarySha256: sha256(readFileSync(process.execPath)), platform: process.platform,
  browserChannel: env.AQP_BROWSER_CHANNEL ?? 'bundled-chromium', commands, sources,
  appDirectory: relative(root, stagedApp).replaceAll('\\', '/'),
  limitations: ['Each test uses a fresh real HTTP process with a memory Store test double, not PostgreSQL or Docker.',
    'App build is produced from exact committed blobs in a catalog-owned staging directory; mutable sibling dist is not used.',
    'Hashes prove byte consistency, not cryptographic attestation of a trusted execution environment.',
    'No SaaS, LLM, sandbox, image provenance or remote CI acceptance.'] };

function run(label, args, cwd = root, direct = false) {
  const startedAt = new Date().toISOString();
  const argv = direct ? args : [process.env.npm_execpath, ...args];
  const result = spawnSync(process.execPath, argv, { cwd, env, encoding: 'utf8', shell: false, maxBuffer: 32 * 1024 * 1024 });
  writeFileSync(join(directory, `${label}.stdout.txt`), result.stdout ?? '');
  writeFileSync(join(directory, `${label}.stderr.txt`), result.stderr ?? '');
  commands.push({ label, command: direct ? ['node', ...args] : ['npm', ...args], cwd, startedAt, exitCode: result.status, error: result.error?.message });
  if (result.status !== 0) throw new Error(`${label} failed: ${result.status}`);
  return result.stdout;
}
const dependencies = () => ({ suite: inventory(root, ['node_modules'], { dependencyLinks: true }), app: inventory(stagedApp, ['node_modules'], { dependencyLinks: true }) });
const runtime = () => inventory(stagedApp, ['dist', ...APP_INPUTS]);
try {
  run('clean-install', ['ci', '--ignore-scripts', '--no-audit', '--no-fund']);
  run('lint', ['run', 'lint']);
  run('typecheck', ['run', 'typecheck']);
  run('binding-tests', ['run', 'test:binding']);
  for (const [name, digest] of Object.entries(sources.app.files)) {
    const bytes = sourceBlob(appRoot, sources.app.commit, name);
    if (sha256(bytes) !== digest) throw new Error('App source changed while staging');
    const file = resolve(stagedApp, name);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, bytes, { flag: 'wx' });
  }
  run('app-clean-install', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], stagedApp);
  run('app-build', ['run', 'build'], stagedApp);
  execution.runtime = runtime();
  execution.dependencies = dependencies();
  const discoveryBytes = run('discovery', ['node_modules/@playwright/test/cli.js', 'test', '--list', '--reporter=json'], root, true);
  reportTests(JSON.parse(discoveryBytes));
  writeFileSync(join(directory, 'discovery.json'), discoveryBytes, { flag: 'wx' });
  execution.discovery = { file: 'discovery.json', sha256: sha256(discoveryBytes) };
  if (existsSync(env.AQP_REPORT_PATH)) throw new Error('Report path is not fresh');
  execution.testStartedAt = new Date().toISOString();
  run('playwright', ['test']);
  execution.report = { file: 'playwright-results.json', sha256: sha256(readFileSync(env.AQP_REPORT_PATH)) };
  execution.postRunSources = { suite: committedIdentity(root, SUITE_INPUTS), app: committedIdentity(appRoot, APP_INPUTS) };
  if (JSON.stringify(inventory(stagedApp, APP_INPUTS)) !== JSON.stringify(sources.app.files)) throw new Error('Staged committed app source changed');
  execution.postRunRuntime = runtime();
  execution.postRunDependencies = dependencies();
  execution.completedAt = new Date().toISOString();
  execution.status = 'passed';
  validateBinding({ execution, reportBytes: readFileSync(env.AQP_REPORT_PATH), discoveryBytes: readFileSync(join(directory, 'discovery.json')),
    currentSources: execution.postRunSources, currentRuntime: execution.postRunRuntime, currentDependencies: execution.postRunDependencies });
  for (const entry of readdirSync('test-results', { recursive: true })) {
    if (entry.endsWith('.png')) copyFileSync(join('test-results', entry), join(directory, 'catalog-checkout.png'));
  }
} catch (error) {
  execution.status = 'failed';
  execution.error = String(error);
  writeFileSync(join(directory, 'failure.txt'), String(error));
} finally {
  execution.completedAt ??= new Date().toISOString();
  writeFileSync(join(directory, 'execution.json'), JSON.stringify(execution, null, 2) + '\n');
}
console.log(JSON.stringify({ status: execution.status, evidence: directory }));
process.exitCode = execution.status === 'passed' ? 0 : 1;
