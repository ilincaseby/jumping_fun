import type { APIRoute } from 'astro';
import { galleryMedia, galleryPageSize } from '../content/media';

export const GET: APIRoute = ({ site }) => {
  if (!site) return new Response(null, { status: 404 });

  const galleryPaths = Array.from({ length: Math.ceil(galleryMedia.length / galleryPageSize) }, (_, index) =>
    index === 0 ? '/galerie/' : `/galerie/${index + 1}/`);
  const paths = ['/', '/tobogane/', ...galleryPaths, '/informatii/', '/oferta/', '/confidentialitate/', '/conditii-inchiriere/'];
  const entries = paths.map((path) => `  <url><loc>${new URL(path, site).href}</loc></url>`).join('\n');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
