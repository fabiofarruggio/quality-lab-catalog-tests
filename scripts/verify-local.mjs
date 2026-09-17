import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

if (!process.env.npm_execpath) throw new Error('Run through npm run verify:local');
const runId = new Date().toISOString().replaceAll(':', '-');
const directory = resolve('evidence', runId);
mkdirSync(directory, { recursive: true });
const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const commands = [];
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => ['PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'AQP_BROWSER_CHANNEL'].includes(key.toUpperCase())));
env.NPM_CONFIG_CACHE = resolve('../.tools/npm-cache');
env.NPM_CONFIG_USERCONFIG = join(directory, 'npm-user-empty.conf');
env.NPM_CONFIG_GLOBALCONFIG = join(directory, 'npm-global-empty.conf');
writeFileSync(env.NPM_CONFIG_USERCONFIG, '', { flag: 'wx' });
writeFileSync(env.NPM_CONFIG_GLOBALCONFIG, '', { flag: 'wx' });
let status = 'failed';
try {
  for (const [label, args] of [
    ['clean-install', ['ci', '--ignore-scripts', '--no-audit', '--no-fund']],
    ['lint', ['run', 'lint']],
    ['typecheck', ['run', 'typecheck']], ['playwright', ['test']],
  ]) {
    const result = spawnSync(process.execPath, [process.env.npm_execpath, ...args], { encoding: 'utf8', shell: false, env });
    writeFileSync(join(directory, `${label}.stdout.txt`), result.stdout ?? '');
    writeFileSync(join(directory, `${label}.stderr.txt`), result.stderr ?? '');
    commands.push({ command: ['npm', ...args], cwd: process.cwd(), exitCode: result.status, error: result.error?.message });
    if (result.status !== 0) throw new Error(`${label} failed: ${result.status}`);
  }
  status = 'passed';
} catch (error) {
  writeFileSync(join(directory, 'failure.txt'), String(error));
} finally {
  const sourceHashes = {};
  function walk(path, prefix) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      const name = join(prefix, entry.name);
      if (entry.isDirectory()) walk(child, name); else if (entry.isFile()) sourceHashes[name.replaceAll('\\', '/')] = hash(child);
    }
  }
  for (const path of ['tests', 'fixtures']) walk(path, path);
  for (const path of ['package.json', 'package-lock.json', 'playwright.config.ts', 'team-manifest.json', 'vendor/aqp-qa-framework-template-0.1.0.tgz']) sourceHashes[path] = hash(path);
  walk('../quality-lab-app/src', '../quality-lab-app/src');
  walk('../quality-lab-app/dist', '../quality-lab-app/dist');
  walk('../quality-lab-app/tests/support', '../quality-lab-app/tests/support');
  sourceHashes['../quality-lab-app/scripts/test-server.mjs'] = hash('../quality-lab-app/scripts/test-server.mjs');
  if (existsSync('test-results/results.json')) copyFileSync('test-results/results.json', join(directory, 'playwright-results.json'));
  if (existsSync('test-results')) {
    for (const entry of readdirSync('test-results', { recursive: true })) {
      if (entry.endsWith('.png')) copyFileSync(join('test-results', entry), join(directory, 'catalog-checkout.png'));
    }
  }
  writeFileSync(join(directory, 'execution.json'), JSON.stringify({ runId, status, mode: 'offline_replay',
    executionKind: 'real_http_and_browser_against_isolated_memory_test_double', taskIds: ['TASK-019', 'TASK-020'],
    node: process.version, platform: process.platform, browserChannel: process.env.AQP_BROWSER_CHANNEL ?? 'bundled-chromium', commands, sourceHashes,
    suiteGitHead: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(),
    appGitHead: spawnSync('git', ['-C', '../quality-lab-app', 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(),
    workingTree: spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout,
    limitations: ['Each test launches a fresh real HTTP application process with isolated memory Store test double.',
      'No PostgreSQL, Docker isolation, image digest, live LLM, SaaS or remote CI behavior is verified.',
      'Working-tree hashes identify tested bytes; listed HEAD alone does not identify uncommitted source.',
      'Browser contexts use a fresh Playwright profile; no personal logged-in profile is reused.'] }, null, 2) + '\n');
}
console.log(JSON.stringify({ status, evidence: directory }));
process.exitCode = status === 'passed' ? 0 : 1;
