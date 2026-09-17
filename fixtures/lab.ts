import { spawn } from 'node:child_process';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { realpathSync } from 'node:fs';
import { once } from 'node:events';
import { test as common, expect } from '@aqp/qa-framework-template/fixtures';

interface LocalLab {
  url: string; storeMode: 'isolated_test_double' | 'postgres'; databaseIntegrationVerified?: false;
  mode: 'offline_replay'; executionKind: 'deterministic_local'; testStorage: 'isolated_test_double' | null;
  expectedAppCommit?: string;
}
export interface LabProfileOptions { labProfile: 'local_memory' | 'isolated_postgres'; expectedAppCommit: string }

export const test = common.extend<LabProfileOptions & { localLab: LocalLab }>({
  labProfile: ['local_memory', { option: true }],
  expectedAppCommit: ['', { option: true }],
  localLab: async ({ playwright, labProfile, expectedAppCommit }, use) => {
    if (labProfile === 'isolated_postgres') {
      if (!/^[a-f0-9]{40}$/.test(expectedAppCommit)) throw new Error('Isolated profile requires the trusted expected application commit');
      const url = 'http://127.0.0.1:3000';
      const context = await playwright.request.newContext({ baseURL: url, timeout: 10_000, maxRedirects: 0 });
      try {
        expect(await (await context.get('/ready')).json()).toEqual({ ready: true, storeMode: 'postgres', seed: 'reference' });
        expect(await (await context.get('/version')).json()).toMatchObject({ gitSha: expectedAppCommit, storeMode: 'postgres',
          seed: 'reference', mode: 'offline_replay', executionKind: 'deterministic_local', testStorage: null });
        // Fixture checks observed metadata only. The external trusted runner proves Docker/image/DB provenance.
        await use({ url, storeMode: 'postgres', mode: 'offline_replay', executionKind: 'deterministic_local', testStorage: null, expectedAppCommit });
      } finally { await context.dispose(); }
      return;
    }
    if (labProfile !== 'local_memory') throw new Error('Unknown laboratory execution profile');
    const appRoot = process.env.AQP_VERIFIED_APP_ROOT ? realpathSync(process.env.AQP_VERIFIED_APP_ROOT) : resolve('../quality-lab-app');
    if (process.env.AQP_VERIFIED_APP_ROOT) {
      const rel = relative(realpathSync('.verification-work'), appRoot);
      if (!rel || isAbsolute(rel) || rel.startsWith(`..${sep}`)) throw new Error('Verified app must be within catalog staging');
    }
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP'].includes(key.toUpperCase())));
    // Maintainer-authored local HTTP harness only. No model, SaaS or repository tokens.
    const child = spawn(process.execPath, ['scripts/test-server.mjs'], { cwd: appRoot, env: { ...env, PORT: '0', LAB_SEED: 'reference' },
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: false });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => { stderr = (stderr + chunk.toString()).slice(-8192); });
    try {
      const lab = await new Promise<LocalLab>((resolveReady, reject) => {
        let stdout = '';
        const timeout = setTimeout(() => reject(new Error(`Local lab readiness timed out: ${stderr}`)), 15_000);
        const finish = (error?: Error, value?: LocalLab): void => {
          clearTimeout(timeout);
          if (error) reject(error); else resolveReady(value!);
        };
        child.once('error', (error) => finish(error));
        child.once('exit', (code) => finish(new Error(`Local lab exited ${code}: ${stderr}`)));
        child.stdout.on('data', (chunk: Buffer) => {
          stdout += chunk.toString();
          if (stdout.length > 16_384) return finish(new Error('Unexpected lab startup output'));
          const newline = stdout.indexOf('\n');
          if (newline < 0) return;
          try {
            const value = JSON.parse(stdout.slice(0, newline)) as LocalLab;
            const url = new URL(value.url);
            if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:' || !url.port || url.origin !== value.url ||
              value.storeMode !== 'isolated_test_double' || value.databaseIntegrationVerified !== false || value.mode !== 'offline_replay' ||
              value.executionKind !== 'deterministic_local' || value.testStorage !== 'isolated_test_double') throw new Error('Unexpected local harness identity');
            finish(undefined, value);
          } catch (error) { finish(error as Error); }
        });
      });
      await use(lab);
    } finally {
      if (child.exitCode === null) {
        const stopped = once(child, 'exit');
        child.kill();
        const timeout = setTimeout(() => { child.kill('SIGKILL'); }, 5000);
        try { await stopped; } finally { clearTimeout(timeout); }
      }
    }
  },
  labOrigin: async ({ localLab }, use) => { await use(localLab.url); },
  allowedOrigins: async ({ localLab }, use) => { await use([localLab.url]); },
  baseURL: async ({ localLab }, use) => { await use(localLab.url); },
});
export { expect };
