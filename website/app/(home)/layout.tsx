import { HomeLayout } from 'fumadocs-ui/layouts/home';
import type { ReactNode } from 'react';
import { baseOptions } from '@/lib/layout.shared';

// Layout for the marketing home at `/` (nav bar + theme toggle, no docs sidebar).
export default function Layout({ children }: { children: ReactNode }) {
  return <HomeLayout {...baseOptions()}>{children}</HomeLayout>;
}
