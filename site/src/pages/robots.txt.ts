import type { APIRoute } from 'astro';
import { allowsIndexing } from '../lib/indexing';

export const GET: APIRoute = ({ site }) => new Response(
  allowsIndexing(site)
    ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`
    : 'User-agent: *\nDisallow: /\n',
  { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
);
