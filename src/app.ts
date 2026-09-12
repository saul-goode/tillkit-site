import { Hono } from 'hono';
import { createAdminRoutes, createSubscriptionRoutes } from '@tillkit/server';
import type { Cart, DatabaseAdapter, Product } from '@tillkit/core';
import { formatPrice } from '@tillkit/core';
import {
  getSessionId,
  setSessionCookie,
  layout,
  takeFlash,
} from './app-context.js';
import type { SubscriptionProvider } from '@tillkit/core';
import { checkoutRouter } from './routes/checkout.js';
import { webhooksRouter } from './routes/webhooks.js';

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createStarterApp(deps: {
  database: DatabaseAdapter;
  stripe: any; // StripeIntegration | null — using any to avoid import complexity in factory
  search?: SearchService;
  subscriptionProvider?: SubscriptionProvider;
}) {
  const { database, stripe, search, subscriptionProvider } = deps;
  const app = new Hono();

  // ===== HOME =====
  app.get('/', async (c) => {
    const products = await database.products.list({ limit: 6 });

    const html = layout(
      'Open-source e-commerce starter',
      `
      <!-- Hero Section -->
      <section class="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div class="absolute inset-0 opacity-20" style="background-image: url(&quot;data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E&quot;)"></div>
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div class="text-center">
            <h1 class="text-5xl sm:text-6xl font-extrabold text-white tracking-tight mb-6">
              Build your store
              <span class="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mt-2">
                in days, not weeks
              </span>
            </h1>
            <p class="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
              TillKit is an open-source e-commerce starter kit built with Hono, HTMX, and PocketBase. 
              Free to use. Production-ready. Deployed in minutes.
            </p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/products" class="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/25">
                🛒 Try Live Demo
              </a>
              <a href="https://github.com/saul-goode/tillkit" class="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-slate-900 bg-white rounded-xl hover:bg-slate-100 transition shadow-lg">
                ⭐ View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Grid -->
      <section class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl font-bold text-slate-900 mb-4">Everything you need to sell</h2>
            <p class="text-lg text-slate-600 max-w-2xl mx-auto">
              Built-in features that would take weeks to build yourself
            </p>
          </div>
          <div class="grid md:grid-cols-3 gap-8">
            <div class="p-6 bg-slate-50 rounded-2xl">
              <div class="text-4xl mb-4">🛒</div>
              <h3 class="text-xl font-semibold text-slate-900 mb-2">Shopping Cart</h3>
              <p class="text-slate-600">Persistent carts, guest checkout, and seamless checkout flow</p>
            </div>
            <div class="p-6 bg-slate-50 rounded-2xl">
              <div class="text-4xl mb-4">💳</div>
              <h3 class="text-xl font-semibold text-slate-900 mb-2">Stripe Integration</h3>
              <p class="text-slate-600">Payments, subscriptions, and webhooks ready to go</p>
            </div>
            <div class="p-6 bg-slate-50 rounded-2xl">
              <div class="text-4xl mb-4">📦</div>
              <h3 class="text-xl font-semibold text-slate-900 mb-2">Product Management</h3>
              <p class="text-slate-600">Full CRUD with categories, variants, and inventory</p>
            </div>
            <div class="p-6 bg-slate-50 rounded-2xl">
              <div class="text-4xl mb-4">🔐</div>
              <h3 class="text-xl font-semibold text-slate-900 mb-2">Authentication</h3>
              <p class="text-slate-600">User accounts, order history, and secure sessions</p>
            </div>
            <div class="p-6 bg-slate-50 rounded-2xl">
              <div class="text-4xl mb-4">⚡</div>
              <h3 class="text-xl font-semibold text-slate-900 mb-2">HTMX Powered</h3>
              <p class="text-slate-600">Dynamic interactions without JavaScript complexity</p>
            </div>
            <div class="p-6 bg-slate-50 rounded-2xl">
              <div class="text-4xl mb-4">🚀</div>
              <h3 class="text-xl font-semibold text-slate-900 mb-2">One-Click Deploy</h3>
              <p class="text-slate-600">Deploy to Vercel, Render, or any Node.js host</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Pricing Section -->
      <section class="py-20 bg-slate-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2 class="text-3xl font-bold text-slate-900 mb-4">Need a custom store?</h2>
            <p class="text-lg text-slate-600 max-w-2xl mx-auto">
              I build production-ready e-commerce sites on top of TillKit. 
              Custom themes, integrations, deployments — done for you.
            </p>
          </div>
          <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <!-- Basic -->
            <div class="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <div class="text-4xl font-bold text-slate-900 mb-2">$500</div>
              <div class="text-slate-600 font-medium mb-6">Basic Setup</div>
              <ul class="space-y-3 mb-8">
                <li class="flex items-center text-slate-600">
                  <span class="text-green-500 mr-2">✓</span> Deploy & configure
                </li>
                <li class="flex items-center text-slate-600">
                  <span class="text-green-500 mr-2">✓</span> Product setup
                </li>
                <li class="flex items-center text-slate-600">
                  <span class="text-green-500 mr-2">✓</span> Stripe connection
                </li>
              </ul>
              <a href="mailto:hello@tillkit.dev?subject=Basic+Setup" class="block text-center py-3 px-6 rounded-lg border-2 border-slate-200 text-slate-700 font-semibold hover:border-slate-300 transition">
                Get Started
              </a>
            </div>

            <!-- Custom -->
            <div class="bg-white rounded-2xl p-8 shadow-xl border-2 border-blue-500 relative">
              <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <div class="text-4xl font-bold text-slate-900 mb-2">$2,000</div>
              <div class="text-slate-600 font-medium mb-6">Custom Store</div>
              <ul class="space-y-3 mb-8">
                <li class="flex items-center text-slate-600">
                  <span class="text-green-500 mr-2">✓</span> Everything in Basic
                </li>
                <li class="flex items-center text-slate-600">
                  <span class="text-green-500 mr-2">✓</span> Custom theme design
                </li>
                <li class="flex items-center text-slate-600">
                  <span class="text-green-500 mr-2">✓</span> Custom integrations
                </li>
                <li class="flex items-center text-slate-600">
                  <span class="text-green-500 mr-2">✓</span> Full deployment
                </li>
              </ul>
              <a href="mailto:hello@tillkit.dev?subject=Custom+Store" class="block text-center py-3 px-6 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
                Get Started
              </a>
            </div>

            <!-- Ongoing -->
            <div class="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <div class="text-4xl font-bold text-slate-900 mb-2">$300<span class="text-lg text-slate-500 font-normal">/mo</span></div>
              <div class="text-slate-600 font-medium mb-6">Ongoing Care</div>
              <ul class="space-y-3 mb-8">
                <li class="flex items-center text-slate-600">
                  <span class="text-green-500 mr-2">✓</span> Hosting included
                </li>
                <li class="flex items-center text-slate-600">
                  <span class="text-green-500 mr-2">✓</span> Security updates
                </li>
                <li class="flex items-center text-slate-600">
                  <span class="text-green-500 mr-2">✓</span> Maintenance & support
                </li>
              </ul>
              <a href="mailto:hello@tillkit.dev?subject=Ongoing+Care" class="block text-center py-3 px-6 rounded-lg border-2 border-slate-200 text-slate-700 font-semibold hover:border-slate-300 transition">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Products Section -->
      <section class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-12">
            <h2 class="text-3xl font-bold text-slate-900 mb-2">Featured Products</h2>
            <p class="text-slate-600">This demo store was built with TillKit</p>
          </div>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            ${products.items.map((p: Product) => renderProductCard(p)).join('')}
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="py-20 bg-slate-900">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="text-3xl font-bold text-white mb-4">Ready to start building?</h2>
          <p class="text-slate-300 mb-8 text-lg">
            Get started with TillKit today — it's free, open source, and ready to deploy.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://github.com/saul-goode/tillkit" class="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-slate-900 bg-white rounded-xl hover:bg-slate-100 transition">
              ⭐ Star on GitHub
            </a>
            <a href="mailto:hello@tillkit.dev" class="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition">
              📧 Contact Me
            </a>
          </div>
        </div>
      </section>
    `,
    );
    return c.html(html);
  });

  // ===== PRODUCTS =====
  app.get('/products', async (c) => {
    const query = c.req.query('q');
    let products: any[];
    let total = 0;

    if (query && query.trim()) {
      if (search) {
        const result = await search.search(query, { page: 1, perPage: 50 });
        products = result.items;
        total = result.total;
      } else {
        products = await database.products.search(query);
        total = products.length;
      }
    } else {
      const result = await database.products.list({ limit: 50 });
      products = result.items;
      total = result.total;
    }

    const html = layout(
      'Products',
      `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 class="text-3xl font-bold text-slate-900">All Products</h1>
          <form class="flex gap-2" action="/products" method="get">
            <input 
              type="search" 
              name="q" 
              value="${query || ''}" 
              placeholder="Search products..." 
              class="flex-1 sm:flex-none w-full sm:w-64 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
            <button type="submit" class="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
              Search
            </button>
            ${query ? '<a href="/products" class="px-6 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition">Clear</a>' : ''}
          </form>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          ${products.length === 0
            ? '<p class="text-slate-600 text-center col-span-full py-12">No products found.</p>'
            : products.map((p: Product) => renderProductCard(p)).join('')}
        </div>
        ${query ? `<p class="text-slate-600 mt-8 text-center">${total} result${total !== 1 ? 's' : ''} for "${query}"</p>` : ''}
      </div>
    `,
    );
    return c.html(html);
  });

  app.get('/products/:slug', async (c) => {
    const slug = c.req.param('slug');
    const product = await database.products.getBySlug(slug);

    if (!product) {
      return c.html(
        layout(
          'Not Found',
          `
          <h1>Product Not Found</h1>
          <p>The product "${slug}" doesn't exist.</p>
          <a href="/products">← Back to Products</a>
        `,
        ),
        404,
      );
    }

    const html = layout(
      product.name,
      `
      <div class="product-detail">
        <div class="product-images">
          ${product.images?.length
            ? product.images.map((img: any) => `<img src="${img.url}" alt="${product.name}">`).join('')
            : '<div class="placeholder-image">No Image</div>'
          }
        </div>
        <div class="product-info">
          <h1>${product.name}</h1>
          <p class="price">${formatPrice(product.price, 'USD')}</p>
          ${product.description ? `<p class="description">${product.description}</p>` : ''}

          <form hx-post="/cart/add" hx-target="#cart-result" hx-swap="innerHTML">
            <input type="hidden" name="productId" value="${product.id}">
            <div class="quantity">
              <label>Quantity:</label>
              <input type="number" name="quantity" value="1" min="1" max="99">
            </div>
            <button type="submit" class="button-primary">Add to Cart</button>
          </form>
          <div id="cart-result"></div>
        </div>
      </div>
    `,
    );
    return c.html(html);
  });

  // ===== CART =====
  app.get('/cart/count', async (c) => {
    const sessionId = getSessionId(c);
    setSessionCookie(c, sessionId);

    try {
      const cart = await database.cart.get(sessionId);
      const count =
        cart?.items?.reduce(
          (sum: number, item: { quantity: number }) => sum + item.quantity,
          0,
        ) || 0;
      return c.text(count.toString());
    } catch {
      return c.text('0');
    }
  });

  app.get('/cart', async (c) => {
    const sessionId = getSessionId(c);
    setSessionCookie(c, sessionId);

    // Consume any message left by a checkout attempt that was turned back.
    const flash = takeFlash(c);

    let cart: Cart | null = null;
    try {
      cart = await database.cart.get(sessionId);
    } catch (err) {
      console.log('Cart fetch error:', err);
    }

    if (!cart || cart.items.length === 0) {
      return c.html(
        layout(
          'Cart',
          `
          <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <div class="text-6xl mb-6">🛒</div>
            <h1 class="text-3xl font-bold text-slate-900 mb-4">Your Cart is Empty</h1>
            <p class="text-slate-600 mb-8 text-lg">Looks like you haven't added anything yet.</p>
            <a href="/products" class="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-lg">
              Continue Shopping →
            </a>
          </div>
        `,
          flash,
        ),
      );
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + (item.lineTotal ?? item.price * item.quantity),
      0,
    );

    const html = layout(
      'Cart',
      `
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 class="text-3xl font-bold text-slate-900 mb-8">Shopping Cart</h1>
        <div class="space-y-4 mb-8">
          ${cart.items
            .map(
              (item: any) => `
            <div class="flex items-center gap-4 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div class="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center text-2xl font-bold text-slate-400 flex-shrink-0">
                ${item.image?.url ? `<img src="${item.image.url}" alt="${item.name}" class="w-full h-full object-cover rounded-lg">` : item.name.charAt(0)}
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-slate-900 text-lg">${item.name}</h3>
                <p class="text-slate-600">${formatPrice(item.price, 'USD')}</p>
              </div>
              <form class="flex items-center gap-2" hx-post="/cart/update" hx-target="body">
                <input type="hidden" name="itemId" value="${item.id}">
                <input 
                  type="number" 
                  name="quantity" 
                  value="${item.quantity}" 
                  min="0" 
                  max="99"
                  class="w-20 px-3 py-2 border border-slate-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                <button type="submit" class="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition">
                  Update
                </button>
              </form>
              <div class="text-right w-24">
                <div class="font-semibold text-slate-900">${formatPrice(item.lineTotal ?? item.price * item.quantity, 'USD')}</div>
              </div>
              <form hx-post="/cart/remove" hx-target="body">
                <input type="hidden" name="itemId" value="${item.id}">
                <button type="submit" class="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition" title="Remove">
                  ✕
                </button>
              </form>
            </div>
          `,
            )
            .join('')}
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
          <div class="flex items-center justify-between py-3 border-b border-slate-200">
            <span class="text-slate-600">Subtotal</span>
            <span class="font-semibold text-slate-900 text-lg">${formatPrice(subtotal, 'USD')}</span>
          </div>
          <div class="flex items-center justify-between py-3">
            <span class="text-slate-600">Shipping</span>
            <span class="text-slate-500">Calculated at checkout</span>
          </div>
          <div class="flex items-center justify-between py-4 border-t border-slate-200 mt-2">
            <span class="text-xl font-bold text-slate-900">Total</span>
            <span class="text-2xl font-bold text-blue-600">${formatPrice(subtotal, 'USD')}</span>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row gap-4">
          <a href="/products" class="inline-flex items-center justify-center px-6 py-3 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition">
            ← Continue Shopping
          </a>
          ${stripe
            ? `<form action="/checkout" method="post" class="flex-1">
                 <button type="submit" class="w-full px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-lg">
                   Proceed to Checkout →
                 </button>
               </form>`
            : '<p class="text-slate-500">Checkout unavailable - Stripe not configured</p>'
          }
        </div>
      </div>
    `,
      flash,
    );
    return c.html(html);
  });

  app.post('/cart/add', async (c) => {
    const body = await c.req.parseBody();
    const productId = body.productId;
    const quantity = parseInt(body.quantity as string) || 1;

    const sessionId = getSessionId(c);
    setSessionCookie(c, sessionId);

    if (!productId) {
      return c.text('<div class="error">Product ID required</div>');
    }

    try {
      let cart = await database.cart.get(sessionId);
      if (!cart) {
        cart = await database.cart.create(sessionId);
      }

      const product = await database.products.get(productId as string);
      if (!product) {
        return c.text('<div class="error">Product not found</div>');
      }

      await database.cart.addItem(sessionId, {
        productId: product.id,
        name: product.name,
        sku: product.slug,
        price: product.price,
        quantity: quantity,
        image: product.images?.[0],
      });

      c.header('X-Cart-Updated', '1');
      return c.text(
        '<div class="success">Added to cart! <a href="/cart">View Cart</a></div>',
      );
    } catch (err) {
      console.error('Cart add error:', err);
      return c.text('<div class="error">Error adding to cart</div>');
    }
  });

  app.post('/cart/update', async (c) => {
    const body = await c.req.parseBody();
    const sessionId = getSessionId(c);

    try {
      await database.cart.updateItem(
        sessionId,
        body.itemId as string,
        parseInt(body.quantity as string),
      );
      return c.redirect('/cart');
    } catch {
      return c.redirect('/cart');
    }
  });

  app.post('/cart/remove', async (c) => {
    const body = await c.req.parseBody();
    const sessionId = getSessionId(c);

    try {
      await database.cart.removeItem(sessionId, body.itemId as string);
      return c.redirect('/cart');
    } catch {
      return c.redirect('/cart');
    }
  });

  // ===== MOUNT SHARED ROUTERS =====
  app.route('/checkout', checkoutRouter);
  app.route('/webhooks', webhooksRouter);

  // Search API
  if (search) {
    app.get('/api/search', async (c) => {
      const q = c.req.query('q') || '';
      const page = parseInt(c.req.query('page') || '1', 10);
      const perPage = parseInt(c.req.query('perPage') || '20', 10);
      
      if (!q.trim()) {
        return c.json({ items: [], total: 0, page, perPage });
      }
      
      try {
        const result = await search.search(q, { page, perPage });
        return c.json(result);
      } catch (err: any) {
        console.error('Search API error:', err);
        return c.json({ error: 'Search failed' }, 500);
      }
    });
  }
  app.route('/admin', createAdminRoutes({ database, basePath: '/admin', searchService: search }));

  // Subscription API routes
  if (subscriptionProvider) {
    app.route('/api/subscriptions', createSubscriptionRoutes({
      database,
      subscriptionProvider,
    }));
  }

  // ===== SERVE ACTUAL CSS =====
  const cssPath = path.join(__dirname, 'styles.css');
  app.get('/styles.css', async (c) => {
    const css = await fs.readFile(cssPath, 'utf8');
    c.header('Content-Type', 'text/css');
    return c.body(css);
  });


  // Serve admin styles
  app.get("/admin/styles.css", async (c) => {
    const css = await fs.readFile("./src/admin-styles.css", "utf8");
    return c.text(css, { headers: { "Content-Type": "text/css" } });
  });
  return app;
}

// Product card component
function renderProductCard(product: Product): string {
  return `
    <div class="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200">
      <a href="/products/${product.slug}" class="block aspect-square bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-6xl font-bold text-slate-300 group-hover:from-slate-200 group-hover:to-slate-300 transition">
        ${product.images?.[0]
          ? `<img src="${product.images[0].url}" alt="${product.name}" class="w-full h-full object-cover">`
          : product.name.charAt(0)
        }
      </a>
      <div class="p-6">
        <h3 class="text-lg font-semibold text-slate-900 mb-2">${product.name}</h3>
        <p class="text-2xl font-bold text-blue-600 mb-4">${formatPrice(product.price, 'USD')}</p>
        <form hx-post="/cart/add" hx-target="this" hx-swap="outerHTML">
          <input type="hidden" name="productId" value="${product.id}">
          <input type="hidden" name="quantity" value="1">
          <button type="submit" class="w-full py-3 px-6 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition shadow-md hover:shadow-lg">
            Add to Cart →
          </button>
        </form>
      </div>
    </div>
  `;
}

});

});
