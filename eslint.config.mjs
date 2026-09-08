import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // `website/` is an isolated pnpm workspace package (Next.js + Fumadocs docs site) with its own
  // ESLint config; keep it out of the library's lint scope so Next/React-19/MDX code never gets
  // linted by the library's flat config (and vice versa).
  { ignores: ['dist', 'node_modules', 'coverage', 'website', '.vercel'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // v7 `recommended` also turns on React Compiler rules; those flag the overlay's intentional
      // render-time ref writes (`controllerRef.current = controller`). Keep the original surface:
      // rules-of-hooks on, exhaustive-deps off (it cannot reason about React Flow's nodeLookup).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
)
