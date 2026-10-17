import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '.npm-cache/**',
      '.python-tools/**',
      'reference/**',
      'tmp/**',
      'test-results/**',
      '**/target/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', Buffer: 'readonly', process: 'readonly' } },
  },
);
