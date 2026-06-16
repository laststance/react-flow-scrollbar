import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

// Shared nav/branding for both the home and docs layouts. Returned from a function (Fumadocs
// convention) so each layout calls `baseOptions()` and spreads the result.
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'react-flow-scrollbar',
    },
    githubUrl: 'https://github.com/laststance/react-flow-scrollbar',
  };
}
