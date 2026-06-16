import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';

// Orama-backed search endpoint (Fumadocs built-in). Indexes the same `source` the docs render from.
export const { GET } = createFromSource(source);
