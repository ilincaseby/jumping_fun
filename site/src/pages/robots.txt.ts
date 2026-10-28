import type { APIRoute } from 'astro';
import { business } from '../config/business';
import { publicationIssues } from '../lib/publication';
import { publicationMediaRights } from '../content/publication-media';

export const GET: APIRoute = () => new Response(
  `User-agent: *\n${publicationIssues(business, publicationMediaRights).length ? 'Disallow: /' : 'Allow: /'}\n`,
  { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
);
