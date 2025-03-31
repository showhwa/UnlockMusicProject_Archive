import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  reactRefresh.configs.recommended,
  reactHooks.configs['recommended-latest'],
  eslintConfigPrettier,

  {
    rules: {
      'react-refresh/only-export-components': 'warn',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  {
    ignores: ['**/dist/', '**/node_modules/', '**/coverage/'],
  },

  {
    files: ['scripts/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
