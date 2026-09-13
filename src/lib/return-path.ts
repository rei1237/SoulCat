const screens = new Set(['/yeongnyangi/', '/yeongnyangi/fortune/', '/yeongnyangi/room/', '/yeongnyangi/library/', '/yeongnyangi/ggulggul-fortune/']);
const keys = new Set(['domain', 'fish', 'product', 'profile', 'request', 'orderId', 'paymentId']);
export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\%\x00-\x20]/.test(value.split('?')[0])) return '/yeongnyangi/fortune/';
  if (!screens.has(value.split(/[?#]/)[0]) && !['/fortune/', '/room/', '/library/', '/ggulggul-fortune/'].includes(value.split(/[?#]/)[0])) return '/yeongnyangi/fortune/';
  try {
    const url = new URL(value, 'https://code-destiny.com');
    if (['/fortune/', '/room/', '/library/', '/ggulggul-fortune/'].includes(url.pathname)) url.pathname = '/yeongnyangi' + url.pathname;
    if (url.origin !== 'https://code-destiny.com' || !screens.has(url.pathname)) return '/yeongnyangi/fortune/';
    const query = new URLSearchParams();
    for (const [key, val] of url.searchParams) {
      if (keys.has(key) && /^[a-zA-Z0-9_-]{1,100}$/.test(val) && url.searchParams.getAll(key).length === 1) query.set(key, val);
    }
    return url.pathname + (query.size ? `?${query}` : '') + (url.pathname === '/yeongnyangi/room/' && url.hash === '#daily' ? '#daily' : '');
  } catch { return '/yeongnyangi/fortune/'; }
}
