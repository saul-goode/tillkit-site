import { pocketbaseAdapter } from '@tillkit/adapter-pocketbase';
// Environment configuration
export const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';
export const POCKETBASE_ADMIN_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN;
export const APP_URL = process.env.APP_URL || 'http://localhost:3000';
// Initialize database
const dbConfig = { url: POCKETBASE_URL };
if (POCKETBASE_ADMIN_TOKEN) {
    dbConfig.adminToken = POCKETBASE_ADMIN_TOKEN;
}
export const database = pocketbaseAdapter(dbConfig);
// No Stripe in this build
export const stripe = null;
// Helper: Get or create session ID
export function getSessionId(c) {
    const cookie = c.req.header('cookie') || '';
    const match = cookie.match(/sessionId=([^;]+)/);
    return match ? match[1] : crypto.randomUUID();
}
// Helper: Set session cookie
export function setSessionCookie(c, sessionId) {
    c.header('Set-Cookie', `sessionId=${sessionId}; Path=/; Max-Age=2592000; HttpOnly`);
}
// Flash messages
export function setFlash(c, message) {
    c.header('X-Flash', encodeURIComponent(message));
}
export function takeFlash(c) {
    const flash = c.req.header('X-Flash');
    if (flash) {
        c.header('X-Flash', '');
        return decodeURIComponent(flash);
    }
    return undefined;
}
export function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// HTML Layout
export const layout = (title, content, flashMessage) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | TillKit</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="/styles.css">
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
</head>
<body class="bg-white text-slate-900">
  <nav class="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <a href="/" class="text-xl font-bold">TillKit</a>
        <div class="flex items-center gap-6">
          <a href="/products" class="text-slate-600 hover:text-slate-900">Products</a>
          <a href="/cart" class="text-slate-600 hover:text-slate-900">
            Cart (<span id="cart-count">0</span>)
          </a>
        </div>
      </div>
    </div>
  </nav>
  <main>
    ${flashMessage ? `<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4"><div class="${flashMessage.includes('Error') ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'} border rounded-lg px-4 py-3">${flashMessage}</div></div>` : ''}
    ${content}
  </main>
  <script>
    document.body.addEventListener('htmx:afterRequest', function(evt) {
      if (evt.detail.xhr.getResponseHeader('X-Cart-Updated')) {
        updateCartCount();
      }
    });
    function updateCartCount() {
      fetch('/cart/count')
        .then(r => r.text())
        .then(count => document.getElementById('cart-count').textContent = count);
    }
    updateCartCount();
  </script>
</body>
</html>`;
