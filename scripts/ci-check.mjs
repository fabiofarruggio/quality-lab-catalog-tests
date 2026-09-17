import { spawnSync } from 'node:child_process';
// No deployment or remote writes: the operator supplies a running allowed lab.
for (const args of [['./node_modules/typescript/bin/tsc', '--noEmit'], ['./node_modules/@playwright/test/cli.js', 'test']]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
