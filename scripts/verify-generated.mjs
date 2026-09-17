import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { generateSuite } from '@aqp/qa-framework-template/generator';

if (!process.env.npm_execpath) throw new Error('Run through npm run verify:generated');
const runId = new Date().toISOString().replaceAll(':', '-');
const directory = resolve('evidence', `generator-${runId}`);
const outputRoot = resolve('test-results', `generated-${runId}`);
mkdirSync(directory, { recursive: true });
mkdirSync(outputRoot, { recursive: true });
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => ['PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP'].includes(key.toUpperCase())));
env.NPM_CONFIG_CACHE = resolve('../.tools/npm-cache');
env.NPM_CONFIG_USERCONFIG = join(directory, 'npm-user-empty.conf');
env.NPM_CONFIG_GLOBALCONFIG = join(directory, 'npm-global-empty.conf');
writeFileSync(env.NPM_CONFIG_USERCONFIG, '');
writeFileSync(env.NPM_CONFIG_GLOBALCONFIG, '');
const child = spawn(process.execPath, ['scripts/test-server.mjs'], { cwd: resolve('../quality-lab-app'),
  env: { ...env, PORT: '0', LAB_SEED: 'reference' }, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
let stderr = '';
child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
const commands = [];
let status = 'failed';
let generated;
try {
  const lines = createInterface({ input: child.stdout });
  let timeout;
  const [line] = await Promise.race([once(lines, 'line'), new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`Harness readiness timeout: ${stderr}`)), 15000);
  })]);
  clearTimeout(timeout);
  lines.close();
  const lab = JSON.parse(line);
  if (new URL(lab.url).hostname !== '127.0.0.1' || lab.storeMode !== 'isolated_test_double' || lab.databaseIntegrationVerified !== false) {
    throw new Error('Unexpected local harness');
  }
  const manifest = JSON.parse(readFileSync('team-manifest.json', 'utf8'));
  manifest.allowedEnvironmentOrigins = [lab.url];
  generated = generateSuite({ manifest, outputRoot, libraryTarball: resolve('vendor/aqp-qa-framework-template-0.1.0.tgz') });
  writeFileSync(join(directory, 'generated-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  for (const [label, args] of [
    ['install', ['install', '--ignore-scripts', '--no-audit', '--no-fund']],
    ['clean-install', ['ci', '--ignore-scripts', '--no-audit', '--no-fund']],
    ['lint', ['run', 'lint']], ['typecheck', ['run', 'typecheck']], ['readiness', ['test']],
  ]) {
    const result = spawnSync(process.execPath, [process.env.npm_execpath, ...args], { cwd: generated.directory, env, encoding: 'utf8', shell: false });
    writeFileSync(join(directory, `${label}.stdout.txt`), result.stdout ?? '');
    writeFileSync(join(directory, `${label}.stderr.txt`), result.stderr ?? '');
    commands.push({ command: ['npm', ...args], cwd: generated.directory, exitCode: result.status });
    if (result.status !== 0) throw new Error(`${label} failed: ${result.status}`);
  }
  status = 'passed';
} catch (error) {
  writeFileSync(join(directory, 'failure.txt'), String(error));
} finally {
  if (child.exitCode === null) { const stopped = once(child, 'exit'); child.kill(); await stopped; }
  writeFileSync(join(directory, 'execution.json'), JSON.stringify({ runId, status, taskId: 'TASK-019', mode: 'offline_replay',
    executionKind: 'untouched_generated_consumer_against_real_http_memory_test_double', commands, generated,
    node: process.version, tarballSha256: createHash('sha256').update(readFileSync('vendor/aqp-qa-framework-template-0.1.0.tgz')).digest('hex'),
    limitations: ['Generated consumer is an uncommitted disposable working directory, not an eighth Git repository.',
      'One real readiness check verifies installation and common fixture wiring; business behavior is verified by the separate reference suite.',
      'No Docker, PostgreSQL, SaaS, LLM or remote CI acceptance.'] }, null, 2) + '\n');
}
console.log(JSON.stringify({ status, evidence: directory }));
process.exitCode = status === 'passed' ? 0 : 1;
