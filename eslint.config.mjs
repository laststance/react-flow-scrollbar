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
      ...reactHooks.configs.recommended.rules,
      // exhaustive-deps cannot reason about external mutable stores (React Flow's nodeLookup), so it
      // false-flags our deliberate recompute triggers as "unnecessary". Keep rules-of-hooks (catches
      // real conditional-hook bugs); turn this one off — deps are hand-audited in this hook-heavy lib.
      'react-hooks/exhaustive-deps': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
)
