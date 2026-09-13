export const dynamic = 'force-static';
export function GET() {
  return new Response('User-agent: *\nDisallow: /\nSitemap: https://code-destiny.com/yeongnyangi/sitemap.xml\n', {headers:{'content-type':'text/plain; charset=utf-8'}});
}
