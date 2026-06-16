import { loader } from 'fumadocs-core/source';
// fumadocs-mdx 15 generates the collection under `.source/server.ts` (the server runtime entry; the
// folder has no barrel index), so import the server entry explicitly.
import { docs } from '@/.source/server';

// The Fumadocs content source: maps the generated `.source` collection to URLs under `/docs`.
// `source.getPage` / `source.generateParams` / `source.pageTree` drive the docs route + layout.
export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});
