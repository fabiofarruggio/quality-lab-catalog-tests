import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { test as common, expect } from '@aqp/qa-framework-template/fixtures';

interface LocalLab {
  url: string; storeMode: 'isolated_test_double'; databaseIntegrationVerified: false;
  mode: 'offline_replay'; executionKind: 'deterministic_local'; testStorage: 'isolated_test_double';
}

export const test = common.extend<{ localLab: LocalLab }>({
  localLab: async ({}, use) => {
    const appRoot = resolve('../quality-lab-app');
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
