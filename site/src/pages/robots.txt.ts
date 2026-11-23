import type { APIRoute } from 'astro';
import { business } from '../config/business';
import { publicationIssues } from '../lib/publication';
import { publicationMediaRights } from '../content/publication-media';

export const GET: APIRoute = ({ site }) => new Response(
  !site || publicationIssues(business, publicationMediaRights).length
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`,
  { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
);
