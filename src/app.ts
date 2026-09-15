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
import type { SearchService } from '@tillkit/integration-search';
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
      <div class="hero" style="text-align: center; padding: 60px 20px;">
        <h1 style="font-size: 2.5rem; font-weight: 700; margin-bottom: 16px; letter-spacing: -0.02em;">
          TillKit
        </h1>
        <p style="font-size: 1.15rem; color: var(--text-muted); max-width: 560px; margin: 0 auto 32px;">
          An open-source e-commerce starter kit built with Hono, HTMX, and PocketBase. 
          Free to use. Easy to deploy.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <a href="/products" class="button-primary" style="font-size: 1.05rem; padding: 14px 28px;">
            🛒 See Live Demo
          </a>
          <a href="https://github.com/yourname/tillkit" class="button-primary" style="font-size: 1.05rem; padding: 14px 28px; background: #1a1a1a;">
            ⭐ View on GitHub
          </a>
        </div>
      </div>

      <div style="background: var(--bg-muted); padding: 60px 20px; margin: 0 -20px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);">
        <div style="max-width: 960px; margin: 0 auto; text-align: center;">
          <h2 style="font-size: 1.6rem; margin-bottom: 8px;">Need a custom store?</h2>
          <p style="color: var(--text-muted); margin-bottom: 32px; font-size: 0.95rem;">
            Production-ready e-commerce built on TillKit. You own the code, the data, and the infrastructure.
          </p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; text-align: left;">
            <!-- Basic Setup -->
            <div style="background: white; padding: 24px; border-radius: var(--radius); border: 1px solid var(--border);">
              <div style="font-size: 1.4rem; font-weight: 700;">$500</div>
              <div style="font-size: 0.9rem; font-weight: 600; margin-top: 4px;">Basic Setup</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin: 8px 0 12px;">Best for: "I need it working on my stack"</div>
              <ul style="font-size: 0.8rem; color: var(--text-muted); padding-left: 16px; margin: 0;">
                <li>Deploy to your Vercel + PocketBase</li>
                <li>Stripe connected & verified</li>
                <li>Collections schema created</li>
                <li>14 days email support</li>
              </ul>
              <a href="mailto:hello@tillkit.dev?subject=Basic%20Setup%20Inquiry" class="button-primary" style="display: block; text-align: center; margin-top: 16px; font-size: 0.85rem; padding: 10px 16px;">Get Started</a>
            </div>
            <!-- BYOPB Pro -->
            <div style="background: white; padding: 24px; border-radius: var(--radius); border: 2px solid var(--primary);">
              <div style="font-size: 1.4rem; font-weight: 700; color: var(--primary);">$1,000</div>
              <div style="font-size: 0.9rem; font-weight: 600; margin-top: 4px;">BYOPB Pro</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin: 8px 0 12px;">Best for: "I want a solid technical foundation"</div>
              <ul style="font-size: 0.8rem; color: var(--text-muted); padding-left: 16px; margin: 0;">
                <li>Everything in Basic Setup</li>
                <li>Security hardening + auth audit</li>
                <li>Custom theme (3 built-ins)</li>
                <li>CI/CD pipeline configured</li>
                <li>Architecture docs for your team</li>
                <li>30 days Slack/Discord support</li>
              </ul>
              <a href="mailto:hello@tillkit.dev?subject=BYOPB%20Pro%20Inquiry" class="button-primary" style="display: block; text-align: center; margin-top: 16px; font-size: 0.85rem; padding: 10px 16px;">Book a Call</a>
            </div>
            <!-- Custom Store -->
            <div style="background: white; padding: 24px; border-radius: var(--radius); border: 1px solid var(--border);">
              <div style="font-size: 1.4rem; font-weight: 700;">$2,000</div>
              <div style="font-size: 0.9rem; font-weight: 600; margin-top: 4px;">Custom Store</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin: 8px 0 12px;">Best for: "I need it to look like my brand"</div>
              <ul style="font-size: 0.8rem; color: var(--text-muted); padding-left: 16px; margin: 0;">
                <li>Everything in BYOPB Pro</li>
                <li>Custom theme & components</li>
                <li>Full integrations (search, subscriptions)</li>
                <li>60 days priority support</li>
              </ul>
              <a href="mailto:hello@tillkit.dev?subject=Custom%20Store%20Inquiry" class="button-primary" style="display: block; text-align: center; margin-top: 16px; font-size: 0.85rem; padding: 10px 16px; background: #1a1a1a;">Book Discovery Call</a>
            </div>
            <!-- Ongoing Care -->
            <div style="background: white; padding: 24px; border-radius: var(--radius); border: 1px solid var(--border);">
              <div style="font-size: 1.4rem; font-weight: 700;">$300<span style="font-size: 0.9rem; font-weight: 400;">/mo</span></div>
              <div style="font-size: 0.9rem; font-weight: 600; margin-top: 4px;">Ongoing Care</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin: 8px 0 12px;">Best for: "I want you managing everything"</div>
              <ul style="font-size: 0.8rem; color: var(--text-muted); padding-left: 16px; margin: 0;">
                <li>Managed hosting on Fly.io</li>
                <li>Monthly updates & security patches</li>
                <li>Priority support</li>
                <li>Cancel anytime</li>
              </ul>
              <a href="mailto:hello@tillkit.dev?subject=Ongoing%20Care%20Inquiry" class="button-primary" style="display: block; text-align: center; margin-top: 16px; font-size: 0.85rem; padding: 10px 16px;">Subscribe</a>
            </div>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 16px;">
            <a href="/setup-checklist" style="color: var(--primary); text-decoration: underline;">See what I need to get started →</a>
          </p>
        </div>
      </div>

      <!-- YOU OWN EVERYTHING -->
      <div style="padding: 60px 20px; text-align: center;">
        <div style="max-width: 700px; margin: 0 auto;">
          <h2 style="font-size: 1.5rem; margin-bottom: 16px;">You Own Everything</h2>
          <p style="color: var(--text-muted); margin-bottom: 24px; font-size: 0.95rem;">
            TillKit is open-source and built on open-source. No vendor lock-in. No proprietary black boxes.
            If we stop working together, you keep everything.
          </p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; text-align: left; font-size: 0.85rem; color: var(--text-muted);">
            <div style="padding: 16px; background: var(--bg-muted); border-radius: var(--radius);">
              <strong style="color: var(--text); display: block; margin-bottom: 4px;">📂 Your Code</strong>
              Private GitHub repo under your account. Full source access from day one.
            </div>
            <div style="padding: 16px; background: var(--bg-muted); border-radius: var(--radius);">
              <strong style="color: var(--text); display: block; margin-bottom: 4px;">🗄️ Your Data</strong>
              PocketBase instance on your infrastructure. I never touch your customer data.
            </div>
            <div style="padding: 16px; background: var(--bg-muted); border-radius: var(--radius);">
              <strong style="color: var(--text); display: block; margin-bottom: 4px;">💳 Your Payments</strong>
              Stripe connected to your account. Money flows directly to you.
            </div>
            <div style="padding: 16px; background: var(--bg-muted); border-radius: var(--radius);">
              <strong style="color: var(--text); display: block; margin-bottom: 4px;">🚀 Your Infra</strong>
              Deployed to your Vercel + Fly.io accounts. You control billing and access.
            </div>
          </div>
          <div style="margin-top: 24px; padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius); text-align: left; font-size: 0.85rem; color: #166534;">
            <strong>Leaving is easy.</strong> Transfer your GitHub repo to your team. Export your PocketBase data (one SQLite file). Point your domain wherever you want. No migration fees, no data ransom.
          </div>
        </div>
      </div>

      <div style="padding: 40px 20px; text-align: center;">
        <h2 style="font-size: 1.5rem; margin-bottom: 8px;">Featured Products</h2>
        <p style="color: var(--text-muted); margin-bottom: 24px; font-size: 0.9rem;">
          This demo store was built with TillKit
        </p>
        <div class="products">
          ${products.items.map((p: Product) => renderProductCard(p)).join('')}
        </div>
      </div>
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
      <h1>Products</h1>
      <form class="search" action="/products" method="get">
        <input type="search" name="q" value="${query || ''}" placeholder="Search products...">
        <button type="submit">Search</button>
        ${query ? `<a href="/products" class="btn btn-sm">Clear</a>` : ''}
      </form>
      <div class="products">
        ${products.length === 0
          ? '<p class="empty">No products found.</p>'
          : products.map((p: Product) => renderProductCard(p)).join('')}
      </div>
      ${query ? `<p style="color:#666;font-size:0.85rem;">${total} result${total !== 1 ? 's' : ''} for "${query}"</p>` : ''}
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
          <h1>Your Cart is Empty</h1>
          <p>Looks like you haven't added anything yet.</p>
          <a href="/products" class="button-primary">Continue Shopping</a>
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
      <h1>Shopping Cart</h1>
      <div class="cart-items">
        ${cart.items
          .map(
            (item: any) => `
          <div class="cart-item">
            <img src="${item.image?.url || '/placeholder.svg'}" alt="${item.name}">
            <div class="item-details">
              <h3>${item.name}</h3>
              <p>${formatPrice(item.price, 'USD')}</p>
            </div>
            <form class="item-quantity" hx-post="/cart/update" hx-target="body">
              <input type="hidden" name="itemId" value="${item.id}">
              <input type="number" name="quantity" value="${item.quantity}" min="0" max="99">
              <button type="submit">Update</button>
            </form>
            <div class="item-total">${formatPrice(item.lineTotal ?? item.price * item.quantity, 'USD')}</div>
            <form hx-post="/cart/remove" hx-target="body">
              <input type="hidden" name="itemId" value="${item.id}">
              <button type="submit" class="danger">×</button>
            </form>
          </div>
        `,
          )
          .join('')}
      </div>
      <div class="cart-totals">
        <div class="total-line">
          <span>Subtotal</span>
          <span>${formatPrice(subtotal, 'USD')}</span>
        </div>
      </div>
      <div class="cart-actions">
        <a href="/products">← Continue Shopping</a>
        ${stripe
          ? `<form action="/checkout" method="post">
               <button type="submit" class="button-primary">Proceed to Checkout →</button>
             </form>`
          : '<p class="notice">Checkout unavailable - Stripe not configured</p>'
        }
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

  // ===== SETUP CHECKLIST PAGE =====
  app.get('/setup-checklist', async (c) => {
    const html = layout(
      'BYOPB Setup Checklist',
      `
      <div style="max-width: 700px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 1.8rem; margin-bottom: 8px;">BYOPB Setup Checklist</h1>
        <p style="color: var(--text-muted); margin-bottom: 32px; font-size: 0.95rem;">
          Here's what I need from you before we start building. <strong>Already have some of this?</strong> No worries — we'll skip those steps.
        </p>

        <div style="margin-bottom: 32px; padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius);">
          <strong style="color: #1e40af;">💡 Pro tip:</strong> <span style="color: #1e40af;">
            Don't have hosting yet? I can provision everything on your behalf and transfer it later. 
            Or if you already have a PocketBase instance running somewhere, just send me the URL.
          </span>
        </div>

        <div style="margin-bottom: 32px;">
          <h2 style="font-size: 1.2rem; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">1. Infrastructure</h2>
          <ul style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.8; padding-left: 20px;">
            <li><strong>Vercel account</strong> (or your preferred Node.js host) — where the storefront lives</li>
            <li><strong>PocketBase instance</strong> — where products, orders, and customers live. Can be:
              <ul>
                <li>Self-hosted (Fly.io, Railway, Hetzner, your VPS)</li>
                <li>PocketHost.io</li>
                <li>"I don't have one yet" — I'll spin one up for you</li>
              </ul>
            </li>
            <li><strong>Domain name</strong> — or a free Vercel subdomain to start</li>
          </ul>
        </div>

        <div style="margin-bottom: 32px;">
          <h2 style="font-size: 1.2rem; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">2. Payments</h2>
          <ul style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.8; padding-left: 20px;">
            <li><strong>Stripe account</strong> — money flows directly to you, not me</li>
            <li><strong>Stripe secret key</strong> (sk_live_...) — for processing payments</li>
            <li><strong>Stripe publishable key</strong> (pk_live_...) — for the checkout form</li>
            <li><strong>Stripe webhook secret</strong> — for order confirmation automation</li>
            <li><strong>Or:</strong> "I don't have Stripe yet" — I'll walk you through setup in our first call</li>
          </ul>
        </div>

        <div style="margin-bottom: 32px;">
          <h2 style="font-size: 1.2rem; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">3. Content & Branding</h2>
          <ul style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.8; padding-left: 20px;">
            <li><strong>Store name & description</strong> — for the homepage and SEO</li>
            <li><strong>Logo</strong> (PNG/SVG) — optional, can use text logo initially</li>
            <li><strong>Brand colors</strong> — hex codes or "use the default TillKit theme"</li>
            <li><strong>Product photos & descriptions</strong> — or placeholder products to start</li>
            <li><strong>Shipping rates</strong> — flat rate, free shipping threshold, or "TBD"</li>
          </ul>
        </div>

        <div style="margin-bottom: 32px;">
          <h2 style="font-size: 1.2rem; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">4. Access & Communication</h2>
          <ul style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.8; padding-left: 20px;">
            <li><strong>GitHub account</strong> — I create a private repo under your org</li>
            <li><strong>Preferred communication channel</strong> — email, Slack, or Discord</li>
            <li><strong>Timeline</strong> — when do you need to be live? (rush jobs available for +$200)</li>
          </ul>
        </div>

        <div style="padding: 24px; background: var(--bg-muted); border-radius: var(--radius); text-align: center;">
          <p style="margin-bottom: 16px; font-size: 1rem;">
            <strong>Ready to get started?</strong>
          </p>
          <a href="mailto:hello@tillkit.dev?subject=BYOPB%20Setup%20Inquiry" class="button-primary" style="font-size: 1rem; padding: 14px 28px;">
            Send me what you have →
          </a>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 12px;">
            Don't have everything? That's normal. We'll figure it out together.
          </p>
        </div>
      </div>
      `,
    );
    return c.html(html);
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

  return app;
}

// Product card component
function renderProductCard(product: Product): string {
  return `
    <div class="product-card">
      <a href="/products/${product.slug}">
        ${product.images?.[0]
          ? `<img src="${product.images[0].url}" alt="${product.name}">`
          : '<div class="placeholder-image"></div>'
        }
        <h3>${product.name}</h3>
        <p class="price">${formatPrice(product.price, 'USD')}</p>
      </a>
      <form hx-post="/cart/add" hx-target="this" hx-swap="outerHTML">
        <input type="hidden" name="productId" value="${product.id}">
        <input type="hidden" name="quantity" value="1">
        <button type="submit">Add to Cart</button>
      </form>
    </div>
  `;
}
