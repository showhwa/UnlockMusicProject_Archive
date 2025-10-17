import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  reactRefresh.configs.recommended,
  reactHooks.configs.flat.recommended,
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

  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.mjs', 'src/*.mjs', 'scripts/*.mjs'],
        },
      },
    },
  },
);
