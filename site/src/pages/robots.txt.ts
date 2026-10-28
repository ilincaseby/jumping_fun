import type { APIRoute } from 'astro';
import { business } from '../config/business';

export const GET: APIRoute = () => new Response(
  `User-agent: *\n${business.status === 'demo' ? 'Disallow: /' : 'Allow: /'}\n`,
  { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
);
