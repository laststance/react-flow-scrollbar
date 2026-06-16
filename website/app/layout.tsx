import './global.css';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'react-flow-scrollbar',
    template: '%s · react-flow-scrollbar',
  },
  description:
    'Viewport-synced scrollbars and zoom-aware bounded panning for React Flow / @xyflow/react v12.',
};

// Root layout: applies the required Fumadocs body styles and wraps the tree in RootProvider.
// `defaultTheme: 'dark'` + `enableSystem: false` make the dark-first design deterministic on first
// load; the theme toggle still switches to light.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider theme={{ defaultTheme: 'dark', enableSystem: false }}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
