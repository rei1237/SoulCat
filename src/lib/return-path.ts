const screens = new Set(['/fortune/', '/room/', '/library/']);
const keys = new Set(['domain', 'fish', 'product', 'profile', 'request', 'orderId', 'paymentId']);
export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\%\x00-\x20]/.test(value.split('?')[0])) return '/fortune/';
  try {
    if (!screens.has(value.split('?')[0].split('#')[0])) return '/fortune/';
    const url = new URL(value, 'https://code-destiny.com');
    if (url.origin !== 'https://code-destiny.com' || !screens.has(url.pathname)) return '/fortune/';
    const query = new URLSearchParams();
    for (const [key, val] of url.searchParams) {
      if (keys.has(key) && /^[a-zA-Z0-9_-]{1,100}$/.test(val) && url.searchParams.getAll(key).length === 1) query.set(key, val);
    }
    return url.pathname + (query.size ? `?${query}` : '');
  } catch { return '/fortune/'; }
}
