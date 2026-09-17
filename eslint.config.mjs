import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', '.codegraph/**', 'vendor/**', 'evidence/**', 'test-results/**', 'playwright-report/**', '.verification-work/**'] },
  ...tseslint.configs.recommended,
);
